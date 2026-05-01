# Handoff G3 pass-04

---

## O que foi validado nesta pass (analise estatica, HEAD ad71970)

- [x] Camera bounds setBounds(0, 0, max(worldW, GAME_WIDTH), GAME_HEIGHT) - GameScene.ts:175-176
- [x] Camera follow startFollow(player, false, 0.1, 0) sem offsetX/offsetY - GameScene.ts:216
- [x] Sem scroll vertical
- [x] 10 niveis carregados via niveis.json (key 'niveis' em BootScene.ts:9 e GameScene.ts:154)
- [x] Larguras conferidas: 1-3=14, 4-5=20, 6-8=25, 9-10=30
- [x] Spawn por fase: editor_x/editor_y lidos direto em GameScene.ts:204-205. Todos com editor_y=5
- [x] Auto-corte do spawn-tile quando TALL - GameScene.ts:280-282
- [x] Transicao fase->fase: advancing=true -> scene.start -> SHUTDOWN -> init reset
- [x] Auto-progressao via cutCount >= grama_alta_para_cortar -> onLevelClear -> input avanca
- [x] Fase 10 -> Title (com submit modal se ranking eligible)
- [x] Race condition: 5 pontos de entrada com guard advancing
- [x] SHUTDOWN cleanup completo
- [x] Sem regressao G4 (fuel/gameOver), G5 (D-pad), G6 (SFX), G7 (RunStats), G7.5 (URL nickname), G8 (SubmitModal + RankingScene)
- [x] Modal de submit (G8) bloqueia handlers via submitModalOpen

## Gaps herdados (pendentes desde pass-01/02/03)

- [ ] Build TypeScript (sem permissao)
- [ ] Contagem real de TALL por nivel
- [ ] Jitter visual fases 1-3 com roundPixels=false
- [ ] Camera niveis 9-10 (worldW=1920)
- [ ] Leak keyboard (3+ fases)
- [ ] Race SPACE+touch
- [ ] Mobile fisico (D-pad eyeStrain)
- [ ] fuel_inc_por_tile_8_8 (dead aceito)
- [ ] eyeStrain overlap em fases pequenas (alpha 0.55 mitiga)
- [ ] ESC durante transicao
- [ ] AudioContext.close (aceito ate G6.5)

## Novos itens identificados em pass-04

- [ ] P3-G3-01: Auto-corte do spawn-tile nao toca sfx.cut() - GameScene.ts:280-282
- [ ] P3-G3-02 (informativo): playable_tiles_total no JSON nao usado
- [ ] P3-G3-03 (informativo): tiles_legenda no JSON nao usado
- [ ] P3-G3-04: startFollow chamado mesmo em fases pequenas - GameScene.ts:216
- [ ] P4-G3-01: console.error em GameScene.ts:156 - aceito como trade-off

---

## Para o QA da proxima sprint (G9+)

### Contratos de G3 estabelecidos / preservados em HEAD ad71970

#### GameScene.init(data)
- data.levelIndex?: number - 0-indexed (0=fase 1, 9=fase 10). ?? 0 se omitido
- init() reseta TODO state: dir, pendingDir, cutCount, levelCleared, tileGrid, centerMessage, fuel, fuelDecAccumMs, fuelBarrel, fuelSpawnTimer, gameOver, advancing, submitModalOpen, vs, sfx.setMuted

#### GameScene.create()
- Lookup do level com early return em scene.start('TitleScene') se nao encontrado (linhas 155-159)
- Deep clone via JSON.parse(JSON.stringify(...)) - linha 161
- Camera bounds (0, 0, max(worldW, GAME_WIDTH), GAME_HEIGHT) - linha 175-176
- Camera follow startFollow(player, false, 0.1, 0) - linha 216
- Listeners pointerdown global, SPACE, ENTER, ESC - linhas 246, 262-264
- SHUTDOWN once handler limpa todos + fuelSpawnTimer + clearFuelBarrel - linhas 266-273

#### niveis.json
- Array de 10 elementos, key Phaser 'niveis'
- Larguras: 1-3=14, 4-5=20, 6-8=25, 9-10=30
- Spawns: ver tabela do HANDOFF
- Dead fields: fuel_inc_por_tile_8_8, playable_tiles_total, tiles_legenda

#### Auto-progressao
- cutTileAt -> cutCount >= target -> onLevelClear -> input -> advanceLevel
- advanceLevel checa levelIndex >= allLevels.length - 1 -> TitleScene ou GameScene levelIndex+1

#### Anti-double-trigger
- Flag advancing checada em todos os 5 pontos de entrada
- Flag setada para true ANTES de scene.start
- init reseta para false

### Sinais de regressao para monitorar em G9+

1. Substituicao de Phaser.GameObjects.Rectangle por sprite real (G9): verificar tileGrid setFillStyle/setData, player como target de startFollow, tileToPx/tileToPy ainda batem com origem 0.5, clearFuelBarrel ainda destroi sem leak.
2. Tilemap real (G9): level.tiles[ty][tx] continua sendo source-of-truth pra TALL/FLOWERS/STONE, setFillStyle vira setTileAt ou similar, bounds ainda calculados a partir de largura_efetiva_tiles * TILE_SIZE.
3. Animacoes de player (G9): nao bloquear deteccao de TALL/FLOWERS/STONE em onEnterTile, levelCleared early return em update ainda corta movimento.
4. Novos GameObjects nao-scene-owned: SHUTDOWN handler precisa de cleanup explicito.
5. Novos campos em SceneData: init deve resetar TODOS.
6. Mudancas em BootScene.preload: scene.start('TitleScene') so apos assets carregarem.
7. Nova scene de pause/menu sobreposta: pause event em GameScene, update para movimento+fuel sem quebrar cutCount/levelCleared.
8. Camera zoom (G9): bounds inalterados por zoom, mas startFollow + lerp + zoom precisa testar visualmente.
