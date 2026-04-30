# Handoff G3 pass-03

---

## O que foi validado nesta pass (analise estatica, HEAD aa2633a)

- [x] `startFollow(player, false, 0.1, 0)` sem offsetX — fix pass-01 confirmado em HEAD
- [x] Deep clone via `JSON.parse(JSON.stringify(...))` correto e na posicao certa — fix pass-01 confirmado
- [x] Flag `advancing` em todos os 5 pontos de entrada (`advanceLevel`, `restartLevel`, `onEscape`, `onPointerDown`, D-pad `pointerdown`) — fix pass-01 confirmado
- [x] SHUTDOWN cleanup: remove `pointerdown`, `keydown-SPACE`, `keydown-ENTER`, `keydown-ESC`, `fuelSpawnTimer`, `clearFuelBarrel` — fix pass-01 confirmado
- [x] `init()` reseta todos os campos de estado, incluindo `sfx.setMuted(...)` adicionado por G6 — sem campo novo sem reset
- [x] Camera shake (STONE, linha 498) orthogonal a `startFollow` e bounds — G6 SFX via Web Audio nao interage com Phaser camera
- [x] `sfx.penaltyStone()` e puramente Web Audio: sem efeito colateral em camera, tweens ou input de Phaser
- [x] TitleScene G6: 2 toggles lado a lado em `(440, 470)` e `(840, 470)` — sem sobreposicao em 1280x720
- [x] Botao JOGAR em `(640, 370)` (`GAME_HEIGHT/2 + 10`) — correto
- [x] Subtitle em `(640, 244)` (`GAME_HEIGHT/5 + 100`) — correto
- [x] Todos os 3 caminhos de transicao para GameScene passam `{ levelIndex: N }` correto
- [x] Selector fases 1-10: posicoes X de 280 a 1000 (dentro de 1280), Y=580 — sem overflow
- [x] Toggle de som: `sfx.setMuted` atualizado imediatamente na TitleScene; `init()` ressincroniza ao entrar no jogo — sem race condition
- [x] `sfx` e singleton global — compartilhado entre TitleScene e GameScene sem instanciacao multipla

## Gaps herdados (pendentes desde pass-01/02)

- [ ] **Build TypeScript nao executado** — sem permissao de shell. Verificar se `SfxPlayer`, `toggleSound`, integracao de G6 compilam sem erro.
- [ ] **Contagem de tall tiles para niveis 3-6, 8-10** — estimada/parcial. Niveis 1, 2 e 7 foram contados exatamente em pass-02.
- [ ] **Teste visual de jitter em fases 1-3** — `startFollow` ativo com bounds clampeando em `worldW < GAME_WIDTH`. Com `roundPixels: true`, micro-jitter de 1px possivel.
- [ ] **Teste de camera em niveis 9-10** — worldW=1920px. `startFollow` sem offset correto. Validacao visual pendente.
- [ ] **Teste de leak de keyboard events** — completar 3+ fases em sequencia e verificar se SPACE dispara apenas uma vez.
- [ ] **Teste de race condition** — SPACE + touch simultaneo ao completar fase.
- [ ] **Teste mobile fisico** — touch targets do D-pad e gap entre botoes.
- [ ] **`fuel_inc_por_tile_8_8`** — campo em `Level.ts` e `niveis.json` mas nao lido em `GameScene.ts`. Confirmar se e feature futura ou dead field definitivo.
- [ ] **Teste do modo olhos cansados** — dpadButtonSize=140, dpadArm=105: verificar overlap com outros elementos em 1280x720.
- [ ] **ESC durante transicao** — apertar ESC logo apos completar fase (advancing=true). Guard correto no codigo mas nao testado em runtime.

## Novos itens identificados em pass-03

- [ ] **`AudioContext` sem `ctx.close()`** (P3) — `SfxPlayer` mantem o context vivo para toda a sessao. Aceitavel para sessao curta. Monitorar se G7+ introduzir reload dinamico de modulo.
- [ ] **Tween de alpha no botao JOGAR nao para antes de `scene.start()`** (P4) — cosmetic. Phaser para o TweenManager no shutdown da scene automaticamente.
- [ ] **`console.log('TitleScene: inicializada')` em producao** (P4) — cosmetic. Sem impacto funcional.

---

## Para o QA da proxima sprint (G7+)

### Contratos estabelecidos / atualizados por G3-G6

#### GameScene.init(data) — contrato atualizado (G6)
- `data.levelIndex?: number` — 0-indexed. Omitir = fase 1.
- `init()` reseta: `dir`, `pendingDir`, `cutCount`, `levelCleared`, `tileGrid`, `centerMessage`, `fuel`, `fuelDecAccumMs`, `fuelBarrel`, `fuelSpawnTimer`, `gameOver`, `advancing`, `vs`
- **Novo em G6**: `sfx.setMuted(!settings.soundEnabled)` chamado em `init()` — sincroniza muted state com localStorage a cada inicio de fase

#### SfxPlayer — contratos G6
- Singleton exportado como `sfx` de `audio/SfxPlayer.ts`
- `setMuted(bool)` / `isMuted()` — sincronizados em `TitleScene.create()` e `GameScene.init()`
- Metodos de evento: `cut()`, `penaltyFlowers()`, `penaltyStone()`, `fuelPickup()`, `levelClear()`, `gameOver()`
- Implementacao 100% via Web Audio API — sem assets Phaser, sem listeners de input, sem efeito colateral em camera
- `AudioContext` criado lazy na primeira chamada de `play()` (respeita politica de autoplay)
- Sem `ctx.close()` explicito — aceitavel para sessao unica de browser

#### TitleScene — layout G6 (posicoes em px, viewport 1280x720)
- Titulo: `(640, 144)`
- Subtitle: `(640, 244)`
- Botao JOGAR: `(640, 370)` — tween alpha repeat:-1 (para automaticamente no shutdown)
- Toggle OLHOS CANSADOS: `(440, 470)`, fontSize 24px, padding x:20 y:12
- Toggle SOM: `(840, 470)`, fontSize 24px, padding x:20 y:12
- Label seletor: `(640, 520)`
- Botoes 1-10: Y=580, X de 280 a 1000 (passo 80px)
- Rodape: `(640, 680)`

#### Camera — estado atual (G3-G4, sem alteracao em G5-G6)
- Fases 1-3 (`worldW=896 < 1280`): startFollow ativo mas estatico por bounds clamping. Jitter P2 pendente.
- Fases 4-10 (`worldW >= 1280`): startFollow com lerp=0.1 funcional
- `cameras.main.shake(250, 0.008)` em STONE: orthogonal a follow e bounds

### Sinais de regressao para monitorar em G7+

1. **Novos SFX via Phaser sound**: Se G7 substituir `SfxPlayer` por `this.sound.play(key)` do Phaser, verificar que os assets estao preloadados em `BootScene` e que `GameScene.init()` ainda chama `setMuted` ou equivalente.
2. **Novos campos em `Settings`**: Se G7 adicionar campos em `Settings`, verificar que `getSettings()` tem defaults para eles e que `GameScene.init()` reage corretamente (ex: novo campo que afeta `vs`).
3. **Novos campos em `SceneData`**: Se G7 adicionar campos a `SceneData`, garantir que `init()` os reseta.
4. **Novos GameObjects nao-scene-owned**: Objetos criados via `new Phaser.GameObjects.X(scene, ...)` sem `scene.add.existing()` nao sao destruidos automaticamente.
5. **Novos listeners de teclado**: Adicionar ao SHUTDOWN handler explicitamente.
6. **`ctx.close()` em SfxPlayer**: Se G7 introduzir reload de modulo ou SPA sem reload de pagina, adicionar `ctx.close()` no cleanup de TitleScene ou GameScene.
7. **Posicao dos toggles em tela estreita**: Os toggles em x=440 e x=840 assumem viewport 1280px. Se G7 suportar resolucoes menores, verificar sobreposicao.
