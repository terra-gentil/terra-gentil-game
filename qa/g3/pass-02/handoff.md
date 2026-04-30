# Handoff G3 pass-02

---

## Para reverificacao desta sprint (G3 pass-03+)

### O que foi validado nesta pass (analise estatica, HEAD d484e11)

- [x] `startFollow(player, false, 0.1, 0)` sem offsetX — fix pass-01 confirmado em HEAD
- [x] SHUTDOWN cleanup via `events.once(SHUTDOWN, ...)` remove todos os listeners de teclado e pointerdown — fix pass-01 confirmado
- [x] Flag `advancing` em `advanceLevel()` e `restartLevel()`, reset em `init()` — fix pass-01 confirmado
- [x] Camera shake (G4, linha 490) e orthogonal a startFollow e bounds — sem interacao problematica
- [x] Fuel barrel (G4): depth=5 < player depth=10 — visual correto
- [x] D-pad (G5): scrollFactor(0) + depth(2000) — fixo e acima de tudo
- [x] D-pad (G5): conflito com global pointerdown resolvido por `currentlyOver.length > 0` check
- [x] D-pad: sem cleanup explicito necessario — scene GameObjects destruidos no shutdown automaticamente
- [x] fuelBarrel tween + sprite: sem vazamento no shutdown — Phaser destroi TweenManager e DisplayList
- [x] Race condition level clear + fuel pickup: impossivel no mesmo `onEnterTile()` (return antecipado)
- [x] grama_alta_para_cortar vs tall_real: verificados niveis 1 (96=96), 2 (116=116), 7 (190=190) com contagem completa
- [x] Spawn em tile CUT confirmado para todos os 10 niveis (tile[editor_y][editor_x] === 0 em todos)
- [x] fuel_inc_por_tile_8_8: campo do JSON/type declarado mas nunca lido em GameScene.ts — dead field

### Gaps (pendente para pass-03+)

- [ ] **Build TypeScript nao executado** — permissao de shell negada. Verificar se `visualScaleFor`, `VisualScale`, integracao de G5 compilam sem erro.
- [ ] **Contagem de tall tiles para niveis 3-6, 8-10** — estimada/parcial. Niveis 1, 2 e 7 foram contados exatamente. Os demais foram verificados estruturalmente (nao ha mais CUT tiles no spawn area alem dos ja identificados), mas nao contados tile a tile.
- [ ] **Teste visual de jitter em fases 1-3** — `startFollow` ativo com bounds clampeando em `worldW < GAME_WIDTH`. Com `roundPixels: true`, micro-jitter de 1px possivel. Pendente desde pass-01.
- [ ] **Teste de camera em niveis 9-10** — worldW=1920px, camera deve scrollar corretamente. `startFollow` sem offset agora correto. Validacao visual ainda pendente.
- [ ] **Teste de leak de keyboard events** — completar 3+ fases em sequencia e verificar se SPACE dispara `advanceLevel()` apenas uma vez. SHUTDOWN cleanup esta correto no codigo mas nao foi testado em runtime.
- [ ] **Teste de race condition** — SPACE + touch simultaneo ao completar fase. `advancing` flag protege, mas nao testado em runtime.
- [ ] **Teste mobile fisico** — touch targets do D-pad (120px padrao, 140px eye-strain mode) e gap entre botoes.
- [ ] **Verificar `fuel_inc_por_tile_8_8`** — campo existe no JSON e no type mas nao e usado. Confirmar se e intencional (feature futura) ou se devia modular o `onPickupFuel` / decay de combustivel.
- [ ] **Teste do modo olhos cansados** — dpadButtonSize=140, dpadArm=105: botoes em eye-strain mode ficam maiores e mais proximos das bordas. Verificar overlap com outros elementos em viewport 1280x720.
- [ ] **ESC durante transicao** — apertar ESC logo apos completar uma fase (advancing=true). `onEscape` tem guard `if (this.advancing) return` na linha 244. Correto mas nao testado.

---

## Para o QA da proxima sprint (G6+)

### Contratos estabelecidos / atualizados por G3-G5

#### GameScene.init(data) — contrato atualizado
- `data.levelIndex?: number` — 0-indexed. Omitir = fase 1.
- `init()` reseta: `dir`, `pendingDir`, `cutCount`, `levelCleared`, `tileGrid`, `centerMessage`, `fuel`, `fuelDecAccumMs`, `fuelBarrel`, `fuelSpawnTimer`, `gameOver`, `advancing`, `vs` (visual scale lida do localStorage)
- Visual scale e lida UMA VEZ em `init()` via `visualScaleFor(getSettings())`. Mudancas de settings durante a sessao de jogo so tem efeito no proximo `init()`.

#### FuelBarrel lifecycle
- Spawn: `scheduleFuelSpawn()` no `create()` → `spawnFuelBarrel()` apos delay
- Pickup: `onPickupFuel()` → stop tween, destroy sprite, `fuelBarrel = undefined`, reschedula
- Cancelamento: `clearFuelBarrel()` chamado em `onLevelClear()` e `triggerGameOver()`
- Shutdown sem clear: cleanup automatico via Phaser TweenManager e DisplayList — sem vazamento
- **Invariante**: `fuelBarrel.tileX/tileY` referencia tile TALL na `level.tiles` (spawn filtra por `!== TILE.TALL`). Apos pickup, o tile permanece TALL e pode ser cortado normalmente.

#### D-pad — contratos G5
- 4 retangulos interativos + 4 textos, todos com `scrollFactor(0)` e `depth(2000)`
- Centro fixo em viewport: `(180, GAME_HEIGHT - 180)` = `(180, 540)`
- Modo padrao: size=120, arm=90. Modo olhos cansados: size=140, arm=105
- Conflito com global pointerdown resolvido via `currentlyOver.length > 0` check
- Sem cleanup explicito necessario: scene-owned

#### Camera — estado atual (G3-G4)
- Fases 1-3 (`worldW=896 < 1280`): startFollow ativo mas camera estatica por bounds clamping. Jitter P2 ainda presente.
- Fases 4-10 (`worldW >= 1280`): startFollow com lerp=0.1 funcional
- `cameras.main.shake(250, 0.008)` em STONE: orthogonal a follow e bounds — sem efeito colateral

#### Fuel system — contratos G4
- `FUEL_MAX = 100`, decay = 1 por 500ms enquanto em movimento
- Penalidades: FLOWERS = -12, STONE = -25
- `fuel <= 0` → `triggerGameOver()`
- `triggerGameOver()` e `onLevelClear()` sao idempotentes (guards)
- `fuel_inc_por_tile_8_8` no JSON/LevelJson: **nao lido em GameScene.ts** — dead field

### Sinais de regressao para monitorar em G6+

1. **Novos campos em SceneData**: Se G6 adicionar campos a `SceneData`, garantir que `init()` os reseta.
2. **Novos GameObjects nao-scene-owned**: Se G6 criar objetos via `new Phaser.GameObjects.X(scene, ...)` sem adicionar ao scene, esses NAO serao destruidos automaticamente no shutdown — precisam de cleanup explicito.
3. **Novos listeners em `this.input.keyboard`**: O SHUTDOWN handler lista explicitamente os listeners a remover. Adicionar novos listeners de teclado requer adicionar ao SHUTDOWN handler.
4. **Mudanca no spawn_jogador**: Se G6 alterar a logica de spawn para usar `game_x` em vez de `editor_x`, verificar que todos os spawns caem em tiles nao-STONE (STONE em spawn causaria penalidade imediata apos `onEnterTile` no `create()`).
5. **Camera.startFollow com roundPixels**: O config tem `roundPixels: true`. Se G6 adicionar animacoes de camera (pan, zoom), verificar interacao com `roundPixels` para evitar jitter.
6. **fuelBarrel em nivel completado sem pickup**: Se level design futuramente garantir que todos os tiles TALL sao cortados antes do barrel aparecer, `spawnFuelBarrel` verifica `if (this.gameOver || this.levelCleared) return` — correto.
7. **`fuel_inc_por_tile_8_8`**: Campo no JSON e no type `LevelJson`. Se G6 implementar a feature correspondente (e.g., boost de combustivel ao pegar galao = `fuel_inc`), verificar que `onPickupFuel` e atualizado.
