# Handoff — Sprint G2 (Engine Core) — pass-01

| Campo    | Valor                 |
|----------|-----------------------|
| Commit   | c1a9b6a               |
| Reviewer | Sub-agente Sonnet G2 pass-01 |
| Data     | 2026-04-30            |

---

## Para Reverificacao desta Sprint (G2 pass-02 ou auditor futuro)

### Ja Validado
- Leitura completa de `GameScene.ts`, `BootScene.ts`, `Level.ts`, `GameConfig.ts` no estado exato do commit c1a9b6a via `git show`.
- Contagem de tiles TALL na `fase_01.json` (96) vs. `grama_alta_para_cortar` (96) — match correto.
- Algoritmo snap-to-grid lido em detalhe: deteccao de cruzamento por `Math.sign`, snap na linha 183–184, atualizacao de `playerTileX/Y` na linha 185–186.
- Logica de `requestDir` / `pendingDir` rastreada para reverse 180°, perpendicular, e borda.
- `canEnter` verificada em todos os 4 casos de bounds.
- `cutTileAt` e mutacao do cache confirmada (bug P1).
- HUD `pct` sem clamp confirmado (risk P2).
- Ausencia de `levelCleared` flag confirmada (P2).
- Touch handler com `pointer.worldX` confirmado.
- `tsconfig.json` lido: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.

### Gaps (nao cobertos nesta revisao)
- **`tsc --noEmit` nao executado** — permissao negada no sandbox. Executar manualmente: `cd jogo && npx tsc --noEmit`.
- **`npm run build`** nao executado — verificar que Vite constroi sem erros.
- **Teste em browser real** — touch multi-ponto, lag simulado (CPU throttle no DevTools), orientacao landscape vs portrait.
- **Reversao de cache** — testar manualmente: jogar, voltar ao menu, iniciar nova partida; verificar se tiles cortados persistem (o bug P1 deve ser reproducivel em G2 se nao houver deep clone).

---

## Para o QA da Proxima Sprint (G3 e alem)

### Contratos do Engine Core (G2) — Nao Violar

#### Formato `LevelJson` (definido em `jogo/src/types/Level.ts`)
```typescript
interface LevelJson {
  id: number;
  largura_efetiva_tiles: number;   // colunas da grade jogavel
  altura_tiles: number;            // linhas da grade jogavel
  playable_tiles_total: number;
  spawn_jogador: {
    editor_x: number;   // coluna do tile de spawn (0-indexado)
    editor_y: number;   // linha do tile de spawn (0-indexado)
    game_x: number;     // nao usado em G2 (reservado)
    game_y: number;
  };
  grama_alta_para_cortar: number;  // alvo de corte para completar a fase
  fuel_inc_por_tile_8_8: number;   // nao usado em G2 (reservado para G?)
  tiles_legenda: Record<string, string>;
  tiles: number[][];               // [row][col], row-major, indices 0..7
}
```

#### Tabela `TILE` (valores numericos dos tiles)
```typescript
TILE.CUT     = 0   // grama cortada (passavel, nao incrementa cutCount)
TILE.TALL    = 1   // grama alta   (passavel, incrementa cutCount ao entrar)
TILE.FLOWERS = 2   // flores       (passavel em G2, tipo nao especificado)
TILE.STONE   = 3   // pedra        (NAO bloqueia em G2 — BUG CONHECIDO P1)
// valores 4..7 reservados, mapeados em tiles_legenda mas sem comportamento
```

**INVARIANTE CRITICA:** `TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7`. Nenhum JSON deve conter valores fora desse intervalo.

#### Regras Snap-to-Grid
- Player se move em **1 eixo por vez** (sem diagonal).
- Velocidade: `speed = 240 px/s` (constante em G2).
- `TILE_SIZE = 64 px`.
- A cada frame: `playerPos += DIR_VEC[dir] * speed * dt`.
- **Snap** ocorre quando o player cruza o centro do tile destino (`Math.sign` flip) ou chega exatamente ao centro.
- Ao snappear: `playerTileX/Y` atualiza, `onEnterTile` e chamado (pode mutar `tiles[][]`).
- `pendingDir` e consumido UMA vez ao snappear; nao persiste entre tiles.
- `dir = 'NONE'` apenas: (a) input inicial, ou (b) borda encontrada.
- **Nao ha parada por STONE em G2** — adicionar em sprint futura com `canEnter`.

#### Mutacao de `level.tiles`
- Em G2: `cutTileAt` muta `this.level.tiles[ty][tx]` in-place.
- O objeto `level` e a referencia direta ao cache do Phaser — **NAO clonar em G2 e bug P1**.
- **G3 deve verificar**: se `create()` faz deep-clone antes de usar `tiles`, o bug esta corrigido. Confirmar com `git show caa959c:jogo/src/scenes/GameScene.ts | grep 'JSON.parse\|structuredClone\|cache.json'`.

#### HUD Layout
- Fundo: `Rectangle(GAME_WIDTH/2, 36, GAME_WIDTH, 72, 0x000000, 0.6)` em depth 999.
- Texto: `Text(GAME_WIDTH/2, 36)` em depth 1000, `fontFamily: 'Arial Black'`, `fontSize: 36px`.
- Formato: `FASE {id}  |  CORTADO {cutCount}/{target}  ({pct}%)`
- Ao completar: sobrescreve com `FASE {id} COMPLETA!` — sem transicao de cena em G2.
- `pct` nao e clampado em 100 em G2 — se nova sprint introduzir fases com mais TALL que o target, adicionar `Math.min`.

#### Camera
- Em G2: camera estatica, sem scroll. `originX/Y` centraliza o mundo no canvas.
- `GAME_WIDTH = 1280`, `GAME_HEIGHT = 720`, `TILE_SIZE = 64`.
- Grade 14x11 = `896x704 px`; centralizado em `(192, 8)`.
- **G3 introduziu scroll** — o handler `pointerdown` usa `pointer.worldX` e `this.player.x` (ambos em world space), portanto semanticamente correto com scroll. QA G3 deve confirmar isso em browser com scroll ativo.

### Invariantes que Novas Sprints NAO Devem Violar
1. `tiles[row][col]` — sempre row-major; nunca `tiles[col][row]`.
2. `spawn_jogador.editor_x/editor_y` — coordenadas de TILE (nao pixel). Usar `tileToPx/tileToPy` para converter.
3. `cutCount` so incrementa ao entrar em tile TALL — nunca decrementar, nunca incrementar em CUT/STONE/FLOWERS.
4. `grama_alta_para_cortar` deve ser igual ao numero real de tiles TALL no JSON para porcentagem correta. Se divergir, `pct` vai > 100 ou a fase nunca sera `COMPLETA`.
5. `TILE_SIZE` deve ser consistente entre `GameConfig.ts` e qualquer calculo de spawn/hitbox.
6. O cache Phaser `'fase_01'` (e futuros `'fase_NN'`) NAO deve ser mutado — sempre deep-clone antes de usar.
