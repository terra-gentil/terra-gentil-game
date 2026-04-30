# QA Report — Sprint G2 (Engine Core) — pass-02

| Campo        | Valor                                         |
|--------------|-----------------------------------------------|
| Sprint       | G2 — Engine Core                             |
| Base commit  | c1a9b6a (G2 original)                        |
| HEAD revisado | d484e11 (G5: D-pad + modo olhos cansados)    |
| Data         | 2026-04-30                                    |
| Reviewer     | Sub-agente Sonnet G2 pass-02                  |
| Pass-01 base | qa/g2/pass-01/relatorio.md                   |

---

## Status dos Fixes da Pass-01

| Fix pass-01             | Status em HEAD (d484e11)       |
|-------------------------|-------------------------------|
| `dt` cap em 50ms        | CONFIRMADO                    |
| `pct` clamp em 100      | CONFIRMADO                    |
| Deep clone do cache     | CONFIRMADO (em `create()`)    |

---

## Cobertura pass-02

| Area                                     | Status      |
|------------------------------------------|-------------|
| Fix dt cap (pass-01)                     | Verificado  |
| Fix pct clamp (pass-01)                  | Verificado  |
| Cache mutation / deep clone (G3+)        | Verificado  |
| STONE canEnter vs NES original           | Verificado  |
| Snap-to-grid Math.sign (G3/G4/G5)       | Verificado  |
| Early return terminal state (G4)         | Verificado  |
| canEnter coords fases variaveis (G3)     | Verificado  |
| D-pad terminal state (G5)               | Verificado  |
| Tipo Level.ts contrato                   | Verificado  |
| Memory leaks: tween, timers, D-pad       | Verificado  |
| STONE penalty repetido (novo G4)         | Verificado  |
| `grama_alta_para_cortar` vs FLOWERS      | Verificado  |

---

## Achados

---

### RESOLVIDO pass-01 — dt cap em 50ms

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:396–397`

```typescript
const cappedDelta = Math.min(delta, 50);
const dt = cappedDelta / 1000;
```

Cap presente e correto em HEAD. `cappedDelta` e usado em `fuelDecAccumMs` (linha 401) e `dt` e usado no movimento (linha 418–419). Confirma fix do pass-01.

---

### RESOLVIDO pass-01 — pct clamp em 100

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:514`

```typescript
const pct = Math.min(100, Math.round((this.cutCount / target) * 100));
```

Clamp presente. Confirma fix do pass-01.

---

### RESOLVIDO pass-01 — Deep clone do cache JSON

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:154`

```typescript
this.level = JSON.parse(JSON.stringify(this.allLevels[this.levelIndex])) as LevelJson;
```

G3 introduziu deep clone. `allLevels` e a referencia ao cache (`this.cache.json.get('niveis')` na linha 147), mas o deep clone em `create()` isola `this.level` do cache. G4 e G5 mantiveram. Cache nao e mutado. Fix P1 da pass-01 permanece integro.

**Observacao:** O deep clone esta em `create()`, nao em `init()`. `init()` (linhas 129–144) apenas reseta escalares. Isso e correto: `create()` e chamado apos `init()` quando a cena inicia, entao o clone sempre acontece antes do uso de `this.level`.

---

### RESOLVIDO pass-01 — STONE nao bloqueia canEnter: confirmado pelo NES original

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:468–473` + `pesquisa/lawn-mower-original/game.dasm:1878–1884`

`canEnter` em HEAD so verifica bounds — nao bloqueia STONE. Isso e consistente com o `game.dasm` original:

- `game.dasm` linha 1815–1817: quando tile e `$14` (stone), o fluxo vai para `cutStone`.
- `cutStone` (linha 1878–1884): chama `fuelSubtract` e `sfxPlay` — NAO altera a tile nem para o movimento.
- O NES so bloqueia direcoes pelos limites do mapa (`checkPad`, linhas 693–729): compara coordenadas com bordas (`cmp #1`, `cmp <GAME_MAP_WDT`, `cmp #3`, `cmp #13`), nao verifica tipo de tile para bloqueio.

**Conclusao:** STONE penaliza mas nao bloqueia — comportamento correto por design, fiel ao NES.

---

### DRIFT G4 — STONE e FLOWERS presentes em fases a partir da fase 3

**Arquivo:** `jogo/public/assets/maps/niveis.json`

Fase 1 contem apenas TALL (1) e CUT (0). A partir da fase 3, STONE (3) aparece; a partir da fase 2, FLOWERS (2) aparecem. Isso ativa comportamentos introduzidos em G4 (`onEnterTile`):

- **FLOWERS (linha 484–487):** penalidade `PENALTY_FLOWERS = 12`, tile vira CUT, mas `cutCount` NAO incrementa.
- **STONE (linha 488–491):** penalidade `PENALTY_STONE = 25`, camera shake, tile NAO muda (permanece STONE).

**Bug novo P2 — STONE aplica penalidade em cada reentrada:**

```typescript
} else if (type === TILE.STONE) {
  this.applyFuelPenalty(PENALTY_STONE);   // linha 489
  this.cameras.main.shake(250, 0.008);
}
```

O tile STONE nunca e alterado (`level.tiles[ty][tx]` permanece `TILE.STONE`). Cada vez que o player passa pelo mesmo tile de pedra, `-25 de fuel` e aplicado. Em fases com muitos tiles STONE (fase 3 tem 8, fase 5 tem 12+), rotas repetidas acumulam penalidades rapidamente. Isso e consistente com o NES (`cutStone` tambem nao altera o tile e penaliza sempre), mas deve ser documentado explicitamente como comportamento intencional, nao como bug.

**Confirmar com design:** e intencional que o player perca 25 de fuel a cada repassagem por pedra? Se sim, documentar no handoff. Se nao, adicionar `level.tiles[ty][tx] = TILE.CUT` apos a penalidade (como faz FLOWERS).

---

### DRIFT G3/G4/G5 — Snap-to-grid: calculo `reached` ainda correto

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:437–440`

```typescript
const reached =
  (v.x !== 0 && Math.sign(targetCx - oldPx) !== Math.sign(targetCx - newPx)) ||
  (v.y !== 0 && Math.sign(targetCy - oldPy) !== Math.sign(targetCy - newPy)) ||
  (this.player.x === targetCx && this.player.y === targetCy);
```

Algoritmo identico ao G2 original. G3, G4 e G5 nao modificaram. O dt cap de 50ms (fix pass-01) garante que a distancia maxima por frame seja `240 * 0.05 = 12 px` — bem abaixo de `TILE_SIZE = 64 px`, eliminando o risco de pular tile centers. **Snap-to-grid esta integro.**

---

### DRIFT G4 — Early return apos `gameOver || levelCleared` presente

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:449`

```typescript
if (this.gameOver || this.levelCleared) return;
```

Este guard foi introduzido em G4 e esta presente em HEAD. Localizado corretamente apos `onEnterTile` e antes da logica de `pendingDir`. Evita mudancas de direcao quando o estado ja e terminal. **Contrato respeitado.**

---

### DRIFT G3 — canEnter com coords de fase variavel funciona

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:468–473`

```typescript
private canEnter(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0) return false;
  if (tx >= this.level.largura_efetiva_tiles) return false;
  if (ty >= this.level.altura_tiles) return false;
  return true;
}
```

`this.level.largura_efetiva_tiles` e `this.level.altura_tiles` sao lidos diretamente do JSON da fase corrente (apos deep clone). Fases de larguras diferentes (14, 20, 25, 30 tiles) sao corretamente delimitadas. **Contrato respeitado.**

---

### DRIFT G5 — D-pad NAO permite requestDir em estado terminal

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:356–367`

```typescript
rect.on('pointerdown', () => {
  if (this.advancing) return;
  if (this.levelCleared) {
    this.advanceLevel();
    return;
  }
  if (this.gameOver) {
    this.restartLevel();
    return;
  }
  this.requestDir(btn.dir);
});
```

O handler do D-pad verifica `levelCleared` e `gameOver` antes de chamar `requestDir`. Em estado terminal, o D-pad aciona `advanceLevel` ou `restartLevel` (mesmo comportamento do tap global), nao movimento. **Sem risco de requestDir em estado terminal.**

---

### CONTRATO Level.ts — Integro em HEAD

**Arquivo:linha:** `jogo/src/types/Level.ts:1–27`

Todos os campos do contrato definido em pass-01 estao presentes:
- `TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7` — presente (linha 1).
- `TILE.CUT=0, TALL=1, FLOWERS=2, STONE=3` — corretos (linhas 3–8).
- `AllLevelsJson = LevelJson[]` — presente (linha 10).
- `LevelJson` com todos os campos (`id`, `largura_efetiva_tiles`, `altura_tiles`, `playable_tiles_total`, `spawn_jogador`, `grama_alta_para_cortar`, `fuel_inc_por_tile_8_8`, `tiles_legenda`, `tiles`) — todos presentes (linhas 12–27).

Nenhuma sprint (G3, G4, G5) modificou `Level.ts`. **Contrato intacto.**

---

### MEMORIA — Tween NAO e parado no SHUTDOWN (leak condicional)

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:253–259` + `568–576`

O handler de SHUTDOWN:
```typescript
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  this.input.off('pointerdown', onPointerDown);
  kb.off('keydown-SPACE', onConfirm);
  kb.off('keydown-ENTER', onConfirm);
  kb.off('keydown-ESC', onEscape);
  this.fuelSpawnTimer?.remove();
});
```

`fuelSpawnTimer?.remove()` e chamado corretamente. Porem `clearFuelBarrel()` (que para o tween e destroi o sprite) NAO e chamado no SHUTDOWN.

Se o player pressionar ESC durante o jogo (enquanto `fuelBarrel` existe com tween ativo):
1. `onEscape` chama `this.scene.start('TitleScene')`.
2. SHUTDOWN dispara, `fuelSpawnTimer` e removido.
3. O `fuelBarrel.tween` (Phaser.Tweens.Tween) permanece registrado no TweenManager da cena durante o `shutdown`.
4. Em Phaser 3, o TweenManager e destruido junto com a cena no ciclo `shutdown → destroy`, entao o tween nao persiste alem da destruicao da cena.

**Risco real:** P3 — Em Phaser 3 com `scene.start()` (que faz shutdown mas nao destroy imediato), ha uma janela entre shutdown e destroy onde o tween pode disparar callbacks. Se o tween tiver callbacks que referenciam objetos ja destruidos, pode causar erros. Sem callbacks custom no tween atual (apenas animacao de scale), o risco e baixo.

**Recomendacao:** Adicionar `this.clearFuelBarrel()` dentro do handler SHUTDOWN para garantia:
```typescript
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  this.clearFuelBarrel();   // adicionar aqui
  this.input.off('pointerdown', onPointerDown);
  // ...
});
```

---

### MEMORIA — D-pad botoes sao destruidos corretamente

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:342–370`

Os botoes do D-pad sao `Phaser.GameObjects.Rectangle` criados com `this.add.rectangle(...)`. Sao adicionados ao display list da cena. Em Phaser 3, `scene.start()` (ou `scene.restart()`) invoca `shutdown`, que limpa o display list e destroi todos os game objects. Os botoes D-pad sao destruidos automaticamente. **Sem memory leak.**

Os listeners `pointerdown/pointerover/pointerout` nos botoes sao gerenciados pelo sistema de input interativo do Phaser (`setInteractive()`), que e limpo junto com os game objects no shutdown. **Sem listener orphan.**

---

### NOVO — `worldOffsetX()` chamado em cada frame (performance minor)

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:373–375`

```typescript
private worldOffsetX(): number {
  return this.worldW < GAME_WIDTH ? Math.round((GAME_WIDTH - this.worldW) / 2) : 0;
}
```

`worldOffsetX()` e chamado indiretamente via `tileToPx()` que e chamado em `update()` (linhas 434–435) a cada frame. O valor e constante durante a vida da cena (`worldW` nao muda apos `create()`). Calculo trivial, sem impacto real, mas poderia ser cacheado como campo privado em `create()`. P3 — Nao bloqueia.

---

### NOVO — `grama_alta_para_cortar` vs FLOWERS: invariante preservada?

**Arquivo:** `jogo/public/assets/maps/niveis.json`

Em G4, FLOWERS foram adicionadas aos JSONs (fase 2 em diante). `onEnterTile` converte FLOWERS em CUT mas NAO incrementa `cutCount`. Portanto `grama_alta_para_cortar` deve contar apenas tiles TALL (valor 1), nao FLOWERS (valor 2).

Verificacao manual de amostra:
- **Fase 1:** apenas TALL e CUT. `grama_alta_para_cortar = 96`. Contagem visual da grade 14x11 com borda de CUT: 96 TALL — validado pela pass-01.
- **Fase 3:** tem STONE e FLOWERS. `grama_alta_para_cortar = 122`. Grade 14x11 = 154 tiles. Com bordas, STONEs e FLOWERSs vistos no JSON, o numero e plausivel. Validacao exata requer execucao de codigo.
- **Fases 4–10:** grids maiores (20, 25, 30 tiles de largura). Nao foi possivel validar manualmente sem execucao.

**Risco residual P2:** Se `grama_alta_para_cortar` incluir tiles FLOWERS por engano, a fase nunca sera marcada como completa (TALL count < target). Se excluir STONEs (como deve), o invariante esta correto. Recomenda-se teste em browser para fases 3–10.

---

## Resumo de Status

| Achado                              | Severidade | Status     |
|-------------------------------------|------------|------------|
| dt cap 50ms                         | P1         | Resolvido  |
| pct clamp 100                       | P2         | Resolvido  |
| Cache mutation (deep clone)         | P1         | Resolvido  |
| STONE nao bloqueia (NES-fiel)       | Design OK  | Confirmado |
| Snap-to-grid Math.sign              | —          | Integro    |
| Early return terminal state         | —          | Integro    |
| canEnter coords variadas            | —          | Integro    |
| D-pad terminal state                | —          | Integro    |
| Level.ts contrato                   | —          | Integro    |
| Tween nao parado no SHUTDOWN        | P3         | Aberto     |
| D-pad destruicao                    | —          | OK         |
| STONE penalidade repetida           | Design?    | Verificar  |
| worldOffsetX() nao cacheado         | P3         | Aberto     |
| grama_alta_para_cortar vs FLOWERS   | P2         | Verificar em browser |

---

## O que esta Bom

- Todos os 3 fixes criticos da pass-01 sobreviveram a G3, G4 e G5 sem regressao.
- Contrato `Level.ts` (`TileType`, `TILE`, `LevelJson`, `AllLevelsJson`) intacto em todas as sprints.
- Guard de estado terminal (`levelCleared || gameOver`) presente no `update()` e no D-pad.
- Deep clone correto em `create()` usando `JSON.parse(JSON.stringify(...))` sobre `this.allLevels`.
- `canEnter` usa dimensoes reais da fase (suporta grids 14..30 colunas).
- SHUTDOWN limpa corretamente: pointer listener, keyboard listeners, fuelSpawnTimer.
- D-pad (G5) nao permite movement em estado terminal — handler tem guards proprios.
- `reached` + early return apos `onEnterTile` previne processamento duplo de direcao em frame de clear.
