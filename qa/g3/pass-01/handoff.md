# Handoff G3 pass-01

---

## Para reverificacao desta sprint (G3 pass-02+)

### O que ja foi validado (analise estatica)

- [x] Todos os 10 niveis em `niveis.json` tem dimensoes corretas: 14x11, 14x11, 14x11, 20x11, 20x11, 25x11, 25x11, 25x11, 30x11, 30x11
- [x] Todos os spawns com `editor_y=5` dentro de `altura_tiles=11` — OK
- [x] `editor_x` dentro de `largura_efetiva_tiles` verificado por inspecao dos campos (grep)
- [x] `grama_alta_para_cortar` e positivo e menor que `playable_tiles_total` em todos os niveis
- [x] Deep clone via `JSON.parse(JSON.stringify(...))` esta correto e na posicao certa (antes de acessar tiles)
- [x] HUD com `setScrollFactor(0)` e depth 999/1000 — correto
- [x] `centerMessage` com `setScrollFactor(0)` e depth 2000 — correto
- [x] `init()` reseta todos os campos de estado antes de `create()`
- [x] GameObjects antigos (tileGrid, player, centerMessage) destruidos automaticamente na transicao de scene (comportamento padrao da Phaser 3)
- [x] `advanceLevel()` usa `this.allLevels.length` como guard de ultima fase — robusto
- [x] `canEnter()` sem regressao em relacao ao G2

### Gaps (pendente para pass-02+)

- [ ] **Build TypeScript nao executado** — permissao de shell negada. Verificar se `AllLevelsJson`, `LevelJson` compilam sem erro. Especialmente: `this.cache.json.get('niveis') as AllLevelsJson` — o cast e unsafe mas nao e erro de compilacao.
- [ ] **Contagem real de tiles TALL por nivel** — nao foi feito parse profundo do JSON para confirmar que `grama_alta_para_cortar <= real_tall_count` em cada nivel. Nivel 7 tem gap maior (69%) — verificar se isso e design intencional ou erro de geracao.
- [ ] **Validacao do `editor_x` vs `game_x`** — todos os niveis tem `game_x = editor_x + 1`. Confirmar qual e o correto para o runtime (testar se o spawn aparece no tile esperado no jogo real).
- [ ] **Teste de jitter em fases pequenas** (niveis 1-3, worldW=896 < GAME_WIDTH=1280) — a camera tenta fazer follow mas bounds clampam. Verificar visualmente se ha micro-jitter.
- [ ] **Teste de leak de keyboard events** — completar 3 fases em sequencia e observar se SPACE dispara `advanceLevel()` mais de uma vez (via log ou breakpoint).
- [ ] **Teste de race condition** — apertar SPACE e tocar a tela simultaneamente ao completar uma fase.
- [ ] **Teste de camera em niveis 9-10** (30 tiles, 1920px) — confirmar se o player aparece centralizado horizontalmente (bug P1 identificado com offsetX errado).
- [ ] **Teste em mobile real** — touch targets e gap entre botoes de nivel.
- [ ] **Teste de ESC durante transicao** — apertar ESC logo apos completar uma fase.

---

## Para o QA da proxima sprint (G4+)

### Contratos estabelecidos pela G3

#### Formato `niveis.json`
- Array JSON de 10 objetos `LevelJson`
- Cada nivel: `{ id: number (1-10), largura_efetiva_tiles, altura_tiles, playable_tiles_total, spawn_jogador: { editor_x, editor_y, game_x, game_y }, grama_alta_para_cortar, fuel_inc_por_tile_8_8, tiles_legenda, tiles: number[][] }`
- Tile values: 0=CUT, 1=TALL, 2=FLOWERS, 3=STONE (4-7 reservados mas sem comportamento)
- Chave de cache Phaser: `'niveis'` (carregado em `BootScene.preload()`)
- **Invariante**: o array deve ter pelo menos 1 elemento; `this.allLevels.length - 1` e o indice da ultima fase

#### `GameScene.init(data: SceneData)` — assinatura e contrato
- `data.levelIndex?: number` — 0-indexed (0 = primeiro nivel, 9 = ultimo)
- `init()` garante reset completo de: `dir`, `pendingDir`, `cutCount`, `levelCleared`, `tileGrid`, `centerMessage`
- **Contrato**: toda Scene que iniciar GameScene deve passar `{ levelIndex: N }` onde N e 0-based. Omitir `levelIndex` resulta em 0 (fase 1) — comportamento intencional via `?? 0`.

#### `levelCleared` lifecycle
1. `false` no `init()`
2. `true` apenas em `onLevelClear()` quando `cutCount >= grama_alta_para_cortar`
3. Quando `true`: `update()` retorna imediatamente; input de movimento ignorado; `advanceLevel()` pode ser chamado via SPACE/ENTER/touch
4. `advanceLevel()` chama `scene.start()` — nao ha mais code path apos isso na scene atual

#### Camera follow — estado atual (com bug conhecido P1)
- Fases 1-3 (worldW=896 < 1280): camera bounds=(0,0,1280,720), startFollow ativo com lerp 0.1 mas effectively estatico por clamping
- Fases 4-10 (worldW >= 1280): camera scroll horizontal ativo, lerp 0.1
- **BUG CONHECIDO (P1)**: offsetX calculado dinamicamente em create() causa player nao-centralizado em fases largas. Se G4 corrigir, remover este aviso.

#### HUD
- Altura: 80px (constante `HUD_HEIGHT = 80` em GameScene)
- Depth: bg=999, text=1000
- ScrollFactor: 0 (fixo na viewport)
- Area jogavel: y=[80..720]

### Sinais de regressao para monitorar em G4+

1. **`niveis.json` estrutura alterada**: Se G4 adicionar campos ou mudar o formato, verificar que `LevelJson` em `Level.ts` e atualizado e que o deep clone ainda funciona.
2. **Novos eventos de teclado em `create()`**: Se G4 adicionar mais `keyboard.on(...)`, o problema de event leak (P1 atual) se agrava.
3. **Uso de `worldOffsetX()`**: Se G4 alterar a logica de posicionamento, verificar que `tileToPx/tileToPy` ainda retornam posicoes corretas em todos os tamanhos de nivel.
4. **`scene.start('GameScene', data)`**: Se G4 adicionar novos campos em `SceneData`, garantir que `init()` os reseta corretamente para evitar estado residual entre runs.
5. **Sprite/texture assets**: Se G4 substituir rectangles por sprites, verificar que a area clicavel (HitArea) do player e dos tiles e atualizada, e que o camera follow ainda usa o sprite como target.
6. **`allLevels` fora do cache**: Se BootScene for alterada ou se o preload de `niveis.json` falhar silenciosamente, `GameScene.create()` tem o fallback `this.scene.start('TitleScene')` — confirmar que este caminho de erro ainda existe.
7. **`cutCount` overflow**: Se G4 adicionar power-ups que cortam tiles em area, garantir que `cutCount` nao ultrapassa `grama_alta_para_cortar` antes que `onLevelClear()` seja invocado (atualmente: `cutCount++` antes do check — OK para incremento simples, mas nao para incrementos maiores que 1).
