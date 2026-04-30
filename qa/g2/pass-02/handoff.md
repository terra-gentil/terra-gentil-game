# Handoff — Sprint G2 (Engine Core) — pass-02

| Campo    | Valor                          |
|----------|--------------------------------|
| Commit   | d484e11                        |
| Reviewer | Sub-agente Sonnet G2 pass-02   |
| Data     | 2026-04-30                     |

---

## Status dos Contratos G2 em HEAD (d484e11)

Todos os contratos do engine core definidos em pass-01 estao respeitados em HEAD.

### Fixes pass-01 verificados

| Fix                        | Arquivo:linha em HEAD                                    | Status     |
|----------------------------|----------------------------------------------------------|------------|
| `dt` cap 50ms              | `GameScene.ts:396` — `Math.min(delta, 50)`              | OK         |
| `pct` clamp 100            | `GameScene.ts:514` — `Math.min(100, Math.round(...))`   | OK         |
| Deep clone cache           | `GameScene.ts:154` — `JSON.parse(JSON.stringify(...))`  | OK         |

### Invariantes G2 em HEAD

| Invariante                               | Arquivo:linha           | Status  |
|------------------------------------------|-------------------------|---------|
| `tiles[row][col]` row-major              | `GameScene.ts:181,503`  | OK      |
| `spawn_jogador.editor_x/y` em tiles      | `GameScene.ts:195–196`  | OK      |
| `cutCount` so incrementa em TALL         | `GameScene.ts:502–508`  | OK      |
| `TILE_SIZE = 64` consistente             | `GameConfig.ts:9`       | OK      |
| Cache nao mutado (`allLevels` intocado)  | `GameScene.ts:147,154`  | OK      |
| `LevelJson` / `TILE` / `TileType`        | `Level.ts:1–27`         | OK      |

---

## Itens Abertos para Sprint Futura ou QA Manual

### P2 — STONE penalidade repetida por repassagem (comportamento a confirmar)

**Arquivo:linha:** `GameScene.ts:488–491`

STONE tiles nao sao alterados apos entrada (`level.tiles[ty][tx]` permanece `TILE.STONE`). Cada repassagem pelo mesmo tile de pedra aplica `-25 fuel`. O NES original tem o mesmo comportamento (`cutStone` nao altera tile). Confirmar com design se intencional. Se nao, adicionar `level.tiles[ty][tx] = TILE.CUT` apos penalidade (como FLOWERS).

### P2 — Validar `grama_alta_para_cortar` vs contagem real de TALL em fases 3–10

**Arquivo:** `jogo/public/assets/maps/niveis.json`

Fases 3–10 contem FLOWERS e/ou STONE. `grama_alta_para_cortar` deve contar apenas tiles TALL (valor 1). Verificacao exata requer execucao de codigo ou teste em browser. Risco: se target estiver errado, fase nunca completa ou completa antes do esperado.

### P3 — Tween do fuelBarrel nao e parado no SHUTDOWN

**Arquivo:linha:** `GameScene.ts:253–259`

Se o player pressionar ESC durante jogo com `fuelBarrel` ativo, o tween nao e explicitamente parado no SHUTDOWN. Phaser 3 destroi tweens junto com a cena, entao nao ha leak persistente, mas ha uma janela entre shutdown e destroy. Adicionar `this.clearFuelBarrel()` no handler SHUTDOWN por robustez.

### P3 — `worldOffsetX()` nao cacheado

**Arquivo:linha:** `GameScene.ts:373–375`

Calculado a cada `tileToPx()` durante `update()`. Valor e constante para a vida da cena. Sem impacto real na performance atual, mas pode ser cacheado como campo `private worldOffX = 0` inicializado em `create()`.

---

## Para QA das Sprints G6+ (Contratos Nao Violar)

### Contratos confirmados integros em d484e11

1. **`Level.ts` contrato** (`TileType`, `TILE`, `LevelJson`, `AllLevelsJson`) — nenhuma sprint modificou este arquivo. Qualquer sprint que precisar adicionar novos tipos de tile deve: (a) estender `TileType`, (b) adicionar entrada em `TILE`, (c) adicionar cor em `TILE_COLOR`, (d) adicionar logica em `onEnterTile`.

2. **Deep clone obrigatorio** — `create()` usa `JSON.parse(JSON.stringify(this.allLevels[idx]))`. Se refatorar carregamento de niveis, garantir que `this.level` NUNCA seja referencia direta ao cache Phaser.

3. **`dt` cap** — `Math.min(delta, 50)` no topo de `update()`. Se `update()` for refatorado em submethods, o cap deve ser aplicado antes de qualquer movimento ou acumulacao de fuel.

4. **canEnter nao bloqueia STONE** — comportamento intencional por fidelidade NES. Nao adicionar `TILE.STONE` ao `canEnter` sem decisao explicita de design.

5. **`cutCount` so sobe em TALL** — FLOWERS e STONE nao incrementam `cutCount`. O loop de complete check (`cutCount >= grama_alta_para_cortar`) depende disso.

6. **Guard de estado terminal em handlers** — `gameOver` e `levelCleared` devem ser verificados em qualquer novo handler de input (teclado, touch, D-pad, etc.) antes de chamar `requestDir`.

7. **SHUTDOWN cleanup** — qualquer novo timer, tween ou listener adicionado deve ser removido/parado no handler `this.events.once(SHUTDOWN, ...)`.

### Pontos de atencao para G6+

- **Fases maiores (25–30 tiles de largura):** camera scroll ativo via `startFollow`. `tileToPx` usa `worldOffsetX()` = 0 para worldW >= GAME_WIDTH. Coordenadas world vs screen sao distintas — qualquer novo input de posicao deve usar `pointer.worldX`, nao `pointer.x`.
- **`fuel_inc_por_tile_8_8`** ainda nao e usado no codigo (campo reservado em `LevelJson`). Se G6+ implementar reposicao de fuel por tiles, usar esse campo.
- **`getSettings()` e chamado em `init()`** (linha 143) — se Settings ganhar novos campos, garantir backward compat com `localStorage` pre-existente (o merge `{ ...DEFAULT_SETTINGS, ...parsed }` ja cobre isso).
