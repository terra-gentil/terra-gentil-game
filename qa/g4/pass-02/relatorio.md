# Relatorio QA — G4 pass-02

**HEAD analisado:** `aa2633a`
**Data:** 2026-04-30
**Escopo:** verificacao do fix P1 do pass-01 + integracao SFX (G6) no fluxo de fuel

---

## 1. Verificacao do fix P1 (G4-01) — SHUTDOWN + clearFuelBarrel

**Status: CONFIRMADO — fix correto e completo.**

O diff do commit `a67a26b` mostra que o handler `SHUTDOWN` em `GameScene.ts:256-263` passou a incluir:

```ts
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  this.input.off('pointerdown', onPointerDown);
  kb.off('keydown-SPACE', onConfirm);
  kb.off('keydown-ENTER', onConfirm);
  kb.off('keydown-ESC', onEscape);
  this.fuelSpawnTimer?.remove();
  this.clearFuelBarrel();   // <-- adicionado em a67a26b
});
```

`clearFuelBarrel()` (linha 599-604) para o tween (`fuelBarrel.tween.stop()`) e destroi o sprite (`fuelBarrel.sprite.destroy()`) antes de setar `fuelBarrel = undefined`. O `fuelSpawnTimer?.remove()` tambem permanece correto. O fix cobre o cenario de ESC com galao ativo sem deixar tween orfao.

---

## 2. Integracao SFX (G6) — Analise de risco e ordering

### 2.1 Arquitetura do SfxPlayer (sem risco de bloqueio)

`SfxPlayer` (`src/audio/SfxPlayer.ts`) usa Web Audio API pura:
- `AudioContext` criado lazy na primeira chamada (respeita politica de autoplay).
- `playTone()` cria `OscillatorNode` + `GainNode` por nota, conecta ao `ctx.destination`, agenda start/stop em `ctx.currentTime + delay`. **Nao usa callbacks, nao bloqueia a thread JS, nao afeta o game loop do Phaser.**
- Se `muted=true`, retorna imediatamente sem criar nodes.
- Se `AudioContext` nao disponivel (SSR, browser antigo), retorna `undefined` silenciosamente — sem excecao propagada.
- `setMuted()` chamado em `init()` via `sfx.setMuted(!settings.soundEnabled)` — configuracao atualizada a cada restart, sem vazamento entre sessoes.

**Conclusao: nenhum SFX call pode bloquear ou atrasar a logica de jogo.**

### 2.2 Ordering das chamadas SFX por evento

| Evento | Ordem no codigo | Avaliacao |
|--------|-----------------|-----------|
| Cortar grama (TALL) | `cutTileAt()` → `sfx.cut()` | OK — som apos logica |
| Pisar flor (FLOWERS) | `applyFuelPenalty()` → tile update → `sfx.penaltyFlowers()` | OK — som apos toda logica |
| Pisar pedra (STONE) — fuel > 25 | `applyFuelPenalty()` → `shake()` → `sfx.penaltyStone()` | OK |
| Pisar pedra (STONE) — fuel = 0 | ver secao 2.3 abaixo | **ISSUE P2** |
| Pegar galao | `fuel=FUEL_MAX` → `barrel.destroy()` → `scheduleFuelSpawn()` → `sfx.fuelPickup()` | OK — som apos todo cleanup |
| Level clear | `clearFuelBarrel()` → `sfx.levelClear()` → build mensagem | OK |
| Game over (decay) | `triggerGameOver()` → `clearFuelBarrel()` → `sfx.gameOver()` → build mensagem | OK |

### 2.3 Issue P2 — Dissonancia audio: pedra + fuel exatamente zero

**Cenario:** `fuel == 0` e jogador pisa pedra (`TILE.STONE`).

**Trace de execucao:**

```
onEnterTile (STONE branch)
  └─ applyFuelPenalty(25)
       ├─ fuel = max(0, 0-25) = 0
       ├─ updateFuelBar()
       └─ fuel <= 0  →  triggerGameOver()
            ├─ gameOver = true
            ├─ clearFuelBarrel()
            └─ sfx.gameOver()        ← agenda 3 notas: 220Hz, 165Hz, 110Hz
  ← retorna para onEnterTile
  ├─ cameras.main.shake(250, 0.008)  ← shake inicia APOS gameOver sound
  └─ sfx.penaltyStone()              ← agenda thump 90Hz + 60Hz sawtooth
```

**Problema:** quando `applyFuelPenalty` chama `triggerGameOver()`, este dispara `sfx.gameOver()` (3 notas descendentes) de dentro do stack. O codigo em `onEnterTile` continua apos o retorno, acionando `cameras.main.shake()` e `sfx.penaltyStone()`. Resultado:

- O shake ocorre quando o gameOver ja foi declarado (visualmente aceitavel, mas semanticamente errado).
- `penaltyStone()` soa em cima do inicio da sequencia `gameOver()`: thump grave (90 Hz, 0.20 vol) + sawtooth (60 Hz, 0.10, delay 60ms) soam junto com a nota 220Hz do game over. Dois envelopes simultanios distintos — dissonancia audivel.

**Causa raiz:** `applyFuelPenalty` nao retorna um booleano indicando que game over foi trigado; `onEnterTile` nao checa `this.gameOver` apos a chamada.

**Severidade: P2** — nao afeta logica do jogo (gameOver ja tem guard idempotente), mas produz feedback audio inconsistente que quebra a experiencia do jogador alvo (40-70 anos, audifonos).

**Correcao sugerida (minimal):** verificar `this.gameOver` apos `applyFuelPenalty` em `onEnterTile` antes de acionar shake e SFX de pedra/flor:

```ts
} else if (type === TILE.STONE) {
  this.applyFuelPenalty(PENALTY_STONE);
  if (!this.gameOver) {               // <-- guard
    this.cameras.main.shake(250, 0.008);
    sfx.penaltyStone();
  }
}
```

O mesmo vale para `TILE.FLOWERS` (embora `penaltyFlowers` a 440Hz+220Hz seja menos grave que o thump de pedra, o principio e o mesmo):

```ts
} else if (type === TILE.FLOWERS) {
  this.applyFuelPenalty(PENALTY_FLOWERS);
  if (!this.gameOver) {               // <-- guard
    this.level.tiles[ty][tx] = TILE.CUT;
    this.tileGrid[ty][tx].setFillStyle(COLORS.GRASS_CUT);
    sfx.penaltyFlowers();
  }
}
```

> Nota: a mudanca de tile para CUT apos game over nao tem consequencia pratica (o jogo reinicia), mas a limpeza e semanticamente mais correta.

---

## 3. Spawn/timer/cleanup do galao — todas as transicoes

| Transicao | fuelSpawnTimer.remove() | clearFuelBarrel() | Status |
|-----------|------------------------|-------------------|--------|
| Level clear (`onLevelClear`) | linha 610 | linha 611 | OK |
| Game over (decay em `update`) | via `triggerGameOver` linha 638 | linha 639 | OK |
| Game over (penalty em `applyFuelPenalty`) | via `triggerGameOver` linha 638 | linha 639 | OK |
| ESC (SHUTDOWN handler) | linha 261 | linha 262 | OK (fix a67a26b) |
| Restart (`restartLevel`) | `scene.restart` → `SHUTDOWN` → handler | idem | OK |
| Pickup (`onPickupFuel`) | n/a (galao ja foi removido) | inline (linha 592-594) | OK |
| Sem candidatos em `spawnFuelBarrel` | reagenda com `scheduleFuelSpawn` | n/a | OK |
| Spawn pos-clear/over | guard `if (gameOver || levelCleared) return` | n/a | OK |

Todas as transicoes verificadas. Nenhum caminho deixa tween orfao ou timer pendente.

---

## 4. Resumo de achados

| ID | Severidade | Descricao | Status |
|----|-----------|-----------|--------|
| G4-01 | ~~P1~~ | SHUTDOWN nao chamava `clearFuelBarrel()` | **RESOLVIDO** em `a67a26b` |
| G4-02 | P2 | Dissonancia audio: `sfx.penaltyStone()` + `sfx.gameOver()` quando fuel=0 ao pisar pedra | **ABERTO** |

---

## 5. Itens da pass-01 sem alteracao

Os seguintes gaps da pass-01 permanecem pendentes e nao foram alterados pelo G6:

- Build TypeScript nao executado (permissao de shell)
- Feedback critico de fuel (blink quando fuel < 25%)
- Teste de camera em niveis 9-10
- Teste de keyboard leak em runtime
- Teste de jitter em fases 1-3
- Validacao editor_x vs game_x no runtime
- Teste em mobile real
- Balance fases 6-10 com muitas pedras
