# Relatorio QA G3 pass-03

**Data:** 2026-04-30
**HEAD analisado:** aa2633a
**Metodo:** analise estatica — leitura de todos os arquivos `.ts` relevantes

---

## 1. Contratos G3-G5 validos em HEAD?

### 1.1 `startFollow(player, false, 0.1, 0)` — SEM offsetX

**Status: VALIDO**

`GameScene.ts` linha 210:
```
this.cameras.main.startFollow(this.player, false, 0.1, 0);
```
Assinatura Phaser: `startFollow(target, roundPixels, lerpX, lerpY)`. Sem argumentos 5/6 (offsetX/offsetY) — camera centra no player sem deslocamento. Fix de pass-01 confirmado em HEAD.

---

### 1.2 Flag `advancing` — guard em advanceLevel, restartLevel, ESC, pointerdown, D-pad

**Status: VALIDO**

Todas as 5 entradas de avanço testam `if (this.advancing) return` antes de agir:

| Ponto de entrada | Linha | Guard presente |
|---|---|---|
| `advanceLevel()` | 664 | sim |
| `restartLevel()` | 673 | sim |
| `onEscape` (keydown-ESC) | 247 | sim (seta `advancing = true` diretamente, retorno implicito) |
| `onPointerDown` global | 221 | sim |
| D-pad `pointerdown` | 362 | sim |

`init()` reseta `this.advancing = false` (linha 143). Sem regressao.

---

### 1.3 Deep clone via `JSON.parse(JSON.stringify(...))`

**Status: VALIDO**

`GameScene.ts` linha 157:
```
this.level = JSON.parse(JSON.stringify(this.allLevels[this.levelIndex])) as LevelJson;
```
Clone feito logo apos validar que `this.allLevels[this.levelIndex]` existe (linhas 151-155), antes de qualquer acesso a `level.tiles`. Posicao e forma estao corretas.

---

### 1.4 SHUTDOWN cleanup — listeners de teclado e pointerdown

**Status: VALIDO**

Linhas 256-263: `this.events.once(Phaser.Scenes.Events.SHUTDOWN, ...)` remove:
- `input.off('pointerdown', onPointerDown)`
- `kb.off('keydown-SPACE', onConfirm)`
- `kb.off('keydown-ENTER', onConfirm)`
- `kb.off('keydown-ESC', onEscape)`
- `fuelSpawnTimer?.remove()`
- `clearFuelBarrel()`

G6 nao adicionou novos listeners de teclado. Nenhum listener orfao identificado.

---

### 1.5 `init()` — reset completo de estado

**Status: VALIDO**

`init()` (linhas 130-147) reseta: `levelIndex`, `dir`, `pendingDir`, `cutCount`, `levelCleared`, `tileGrid`, `centerMessage`, `fuel`, `fuelDecAccumMs`, `fuelBarrel`, `fuelSpawnTimer`, `gameOver`, `advancing`, `vs` (via `visualScaleFor`).

G6 adicionou `sfx.setMuted(!settings.soundEnabled)` na linha 146 — correto, sincroniza o muted state com o setting persistido a cada inicio de fase. Sem campo novo sem reset.

---

## 2. Camera shake (STONE) x camera follow — interacao em HEAD com G6 SFX

**Status: SEM REGRESSAO**

`onEnterTile()` ao detectar STONE (linhas 496-499):
```
this.applyFuelPenalty(PENALTY_STONE);
this.cameras.main.shake(250, 0.008);
sfx.penaltyStone();
```

`sfx.penaltyStone()` e implementado em `SfxPlayer.ts` inteiramente via Web Audio API (`AudioContext`). Nao interage com Phaser em nenhum ponto — sem chamada a `this.cameras`, sem `this.scene`, sem tweens Phaser, sem listeners de input. O shake (`cameras.main.shake`) permanece identico ao estado de G4-G5.

A ordem de execucao em STONE:
1. Penalidade de combustivel aplicada (pode disparar `triggerGameOver` se fuel <= 0)
2. Shake da camera (250ms, intensidade 0.008) — orthogonal a `startFollow` e bounds (Phaser aplica o shake como offset temporario sobre o scroll calculado pelo follow; nao altera o target nem o lerp)
3. SFX via Web Audio (assincrono, fora do loop Phaser)

Nenhuma interacao problematica com `startFollow` ou bounds.

---

## 3. TitleScene G6 — layout, transicao e selector de fases

### 3.1 Posicoes do layout novo

| Elemento | Posicao | Observacao |
|---|---|---|
| Titulo "GENTILEZA" | `(640, 144)` | `GAME_HEIGHT/5 = 720/5 = 144` |
| Subtitle "Resgate dos Jardins" | `(640, 244)` | `144 + 100` |
| Botao "JOGAR DESDE A FASE 1" | `(640, 370)` | `GAME_HEIGHT/2 + 10 = 370` |
| Toggle OLHOS CANSADOS | `(440, 470)` | `640 - 200, GAME_HEIGHT/2 + 110` |
| Toggle SOM | `(840, 470)` | `640 + 200, GAME_HEIGHT/2 + 110` |
| Label "OU PULE PRA UMA FASE:" | `(640, 520)` | `GAME_HEIGHT - 200` |
| Botoes 1-10 | `(40..760, 580)` | `GAME_HEIGHT - 140` |
| Rodape | `(640, 680)` | `GAME_HEIGHT - 40` |

Os dois toggles estao lado a lado (offsets -200 e +200 do centro), separados por 400px — sem sobreposicao em 1280x720.

### 3.2 Transicao para GameScene — impacto do novo layout

**Status: SEM IMPACTO**

Todos os tres caminhos de transicao para GameScene passam `{ levelIndex: N }`:
- Botao JOGAR: `levelIndex: 0` (linha 57)
- Selector 1-10: `levelIndex: i` onde `i` = 0..9 (linha 116)
- ESC em GameScene: retorna para TitleScene sem data (correto)

O novo layout nao altera a logica de `scene.start()`. O contrato de `SceneData.levelIndex` nao foi quebrado.

### 3.3 Selector de fases 1-10

**Status: CORRETO**

Linhas 102-118:
```
const startX = GAME_WIDTH / 2 - 5 * 80;   // 640 - 400 = 240
for (let i = 0; i < 10; i++) {
  btn posX = startX + i * 80 + 40          // 280, 360, 440, 520, 600, 680, 760, 840 (corte: nao)
  btn.on('pointerdown', () => { this.scene.start('GameScene', { levelIndex: i }); });
}
```

Calculo: `startX = 240`. Posicoes X dos 10 botoes: 280, 360, 440, 520, 600, 680, 760, 840, 920, 1000. Ultimo botao em x=1000 + padding=16 -> borda direita em ~1016+8 = 1024 < 1280. Sem overflow horizontal.

Posicao Y dos botoes: `GAME_HEIGHT - 140 = 580`. A label acima esta em Y=520. Gap de 60px — suficiente para legibilidade.

`levelIndex: i` (0-based) e o mesmo contrato de `GameScene.init()`. Nao ha regressao.

### 3.4 Toggle de som — interacao com SfxPlayer (G6 novo)

O toggle de som chama `sfx.setMuted(!updated.soundEnabled)` imediatamente e, ao ligar, dispara `sfx.fuelPickup()` como feedback (linha 91-92). Correto — `sfx` e singleton global (`SfxPlayer.ts` linha 120: `export const sfx = new SfxPlayer()`). `GameScene.init()` tambem chama `sfx.setMuted(...)` ao iniciar — se o usuario mudar o toggle na TitleScene e imediatamente entrar no jogo, o estado muted e sincronizado novamente em `init()`. Sem race condition.

---

## 4. Gaps herdados — status em HEAD

| Gap | Status em pass-03 |
|---|---|
| Build TypeScript | Ainda nao executado (sem permissao de shell) |
| Contagem tall tiles niveis 3-6, 8-10 | Pendente — nao alterado por G6 |
| Teste visual de jitter fases 1-3 | Pendente — sem alteracao em startFollow/bounds |
| Teste camera niveis 9-10 | Pendente |
| Teste leak de keyboard events | Pendente |
| Teste race condition SPACE + touch | Pendente |
| Teste mobile fisico | Pendente |
| `fuel_inc_por_tile_8_8` intencional? | Pendente — campo ainda presente em Level.ts e niveis.json, nao lido |
| Teste modo olhos cansados overlap | Pendente |
| ESC durante transicao | Pendente |

---

## 5. Novos itens identificados em pass-03

### 5.1 `SfxPlayer` — sem cleanup de `AudioContext`

**Severidade: P3 (baixa)**

`SfxPlayer` cria um `AudioContext` lazy e o mantem vivo para toda a sessao. Nao ha `ctx.close()` em nenhum path de shutdown. Para um jogo de curta sessao isso e aceitavel (o browser fecha o context quando a pagina e descarregada), mas se no futuro a aplicacao virar SPA com reload de modulo, o context pode vazar. Monitorar se G7+ introduzir reload dinamico.

### 5.2 Botao "JOGAR DESDE A FASE 1" — tween de alpha continua apos pointerdown

**Severidade: P4 (cosmetic)**

O tween de alpha no botao JOGAR (linhas 48-54) tem `repeat: -1` e nao e parado antes de `scene.start()`. O Phaser para o TweenManager da scene no shutdown — sem vazamento real, mas o frame de transicao pode mostrar o botao em alpha parcial. Cosmetic apenas.

### 5.3 `console.log` em TitleScene (linha 126)

**Severidade: P4 (cosmetic)**

`console.log('TitleScene: inicializada')` deixado em producao. Sem impacto funcional.

---

## 6. Resumo de status dos contratos principais

| Contrato | Status |
|---|---|
| `startFollow(player, false, 0.1, 0)` sem offsetX | VALIDO |
| Deep clone `JSON.parse(JSON.stringify(...))` | VALIDO |
| Flag `advancing` em todos os pontos de entrada | VALIDO |
| SHUTDOWN cleanup completo | VALIDO |
| `init()` reset completo (incluindo G6: sfx.setMuted) | VALIDO |
| Camera shake orthogonal a follow+bounds (G6 SFX nao interfere) | VALIDO |
| TitleScene transitions passam `levelIndex` correto | VALIDO |
| Selector fases 1-10 dentro do viewport | VALIDO |
| Toggles lado a lado sem sobreposicao | VALIDO |
