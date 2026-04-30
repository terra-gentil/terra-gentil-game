# Handoff G4 pass-01

---

## Para reverificacao desta sprint (G4 pass-02+)

### O que ja foi validado (analise estatica)

- [x] `fuel` inicializado em `FUEL_MAX=100` no `init()` e resetado a cada restart
- [x] `fuelDecAccumMs` resetado em `init()` — sem vazamento entre runs
- [x] Decay so ocorre quando `dir !== 'NONE'` — modelo NES correto
- [x] `cappedDelta = Math.min(delta, 50)` aplicado ao acumulador de fuel — lag spike protegido
- [x] `applyFuelPenalty` usa `Math.max(0, fuel - amount)` — sem underflow/NaN
- [x] `triggerGameOver()` tem guard idempotente `if (this.gameOver) return` — sem duplo trigger
- [x] `advancing` flag protege double-fire de SPACE+touch e SPACE+ENTER simultaneos
- [x] `onLevelClear()` e `triggerGameOver()` chamam `clearFuelBarrel()` + `fuelSpawnTimer?.remove()` — OK
- [x] `onEnterTile`: galao tem prioridade sobre tile type — sem conflito galao+pedra
- [x] FLORES vira CUT (one-shot) — sem penalty repetido
- [x] STONE permanece — modelo NES
- [x] `spawnFuelBarrel` checa `gameOver || levelCleared` antes de spawnar — sem spawn pos-game
- [x] `spawnFuelBarrel` exclui tile atual do player dos candidatos
- [x] Reagendamento quando `candidates.length === 0` e seguro (checa `levelCleared` ao disparar)
- [x] HUD: `fuelBarFill`, `fuelLabel`, `fuelBarBg` todos com `setScrollFactor(0)` e depth 1000-1002
- [x] `restartLevel()` passa `{ levelIndex: this.levelIndex }` — indice preservado corretamente
- [x] TALL count de todos os 10 niveis confere com `grama_alta_para_cortar` (analise estatica do JSON)
- [x] Camera bug P1 de G3 corrigido em `5bcf397` (offsetX removido do startFollow)
- [x] Cleanup de keyboard events via SHUTDOWN em `5bcf397` — sem leak acumulado entre scenes

### Gaps (pendente para pass-02+)

- [ ] **Bug P1 aberto (G4-01)**: SHUTDOWN nao chama `clearFuelBarrel()`. Ao apertar ESC com galao ativo, tween pode executar em objeto destruido. Adicionar `this.clearFuelBarrel()` no handler SHUTDOWN em `GameScene.ts:258`.
- [ ] **Build TypeScript nao executado** — permissao de shell negada. Executar `npm run build` em `jogo/` para confirmar zero erros.
- [ ] **Feedback critico de fuel (P2)**: sem animacao de piscar quando `fuel < 25%`. Considerar tween em `fuelBarFill` para publico 40-70.
- [ ] **Teste de camera em niveis 9-10**: `startFollow` sem offsetX foi corrigido mas nao testado visualmente.
- [ ] **Teste de keyboard leak**: cleanup via SHUTDOWN implementado mas nao testado em runtime (completar 3+ fases em sequencia).
- [ ] **Teste de jitter** em fases 1-3 (worldW=896 < 1280).
- [ ] **Validacao editor_x vs game_x**: spawn em `editor_x` (linha 195) — confirmar se tile correto no runtime.
- [ ] **Teste em mobile real**: D-pad, touch targets, feedback visual.
- [ ] **Balance fases 6-10 com muitas pedras**: se player acerta 4 STONEs consecutivos (-25 cada), game over imediato. Verificar se galao pode ser coletado antes.

---

## Para o QA da proxima sprint (G5+)

### Contratos estabelecidos pela G4

#### Sistema de fuel
- `FUEL_MAX = 100` (constante em `GameScene.ts:25`). Nao alterar sem ajustar toda a logica de balance.
- `fuel` e sempre um numero no intervalo `[0, FUEL_MAX]`:
  - Inicializado em `FUEL_MAX` no `init()` (linha 137)
  - Decrementado por `Math.max(0, fuel - 1)` no decay (linha 404)
  - Decrementado por `Math.max(0, fuel - amount)` em penalties (linha 495)
  - Restaurado para `FUEL_MAX` ao pickup (linha 581)
- `FUEL_DECAY_INTERVAL_MS = 500` — 1pt perdido a cada 500ms de movimento. Alterar afeta balance de TODOS os niveis.
- Decay so ocorre quando `dir !== 'NONE'` — invariante de design.
- `fuelDecAccumMs` e acumulador interno, nao deve ser lido ou escrito fora de `update()` e `init()`.

#### Game Over
- `gameOver: boolean` — `false` no `init()`, `true` apenas em `triggerGameOver()`.
- `triggerGameOver()` e idempotente (guard no inicio). Pode ser chamado de qualquer lugar com segurança.
- Apos `gameOver = true`: `update()` retorna imediatamente (linha 395); input de movimento ignorado; SPACE/ENTER/touch chama `restartLevel()`; ESC vai para TitleScene.
- `restartLevel()` usa `scene.restart({ levelIndex })` — passa indice correto; `init()` e chamado pelo Phaser antes de `create()`.
- `advancing: boolean` — flag anti-double-fire para `advanceLevel()`, `restartLevel()` e navegacao ESC. Resetado no `init()`.

#### Galao de combustivel (FuelBarrel)
- Apenas **1 galao ativo por vez** (`this.fuelBarrel?: FuelBarrel`).
- Spawna apenas em tiles `TILE.TALL` excluindo o tile atual do player.
- `spawnFuelBarrel` e agendado via `scheduleFuelSpawn()` que usa `FUEL_SPAWN_MS[levelIndex] ?? 8000`.
- Pickup (`onPickupFuel`): restaura `fuel = FUEL_MAX` e reagenda novo spawn.
- **Invariante**: qualquer codepath que encerre o level (levelClear, gameOver, ESC) DEVE chamar `clearFuelBarrel()` e `fuelSpawnTimer?.remove()`. O SHUTDOWN tambem deve chamar `clearFuelBarrel()` (bug G4-01 pendente de fix).

#### Tile types e interacoes
- `TILE.TALL (1)`: cortado ao entrar → `cutTileAt()` → `cutCount++`
- `TILE.FLOWERS (2)`: penalty `-12`, tile vira `TILE.CUT` (one-shot)
- `TILE.STONE (3)`: penalty `-25` + camera shake, tile permanece
- `TILE.CUT (0)`: sem interacao
- Galao tem prioridade sobre tile type em `onEnterTile` — se tile do galao e TALL, o pickup ocorre e o tile TALL nao e processado naquele frame (mas fica como TALL). Galao em tile STONE nao deve ocorrer (spawn filtra por `TILE.TALL` apenas).

#### HUD (G4)
- `fuelBarBg`: depth 1000, scrollFactor 0. Posicao: x=920..1240, y=40 (centro HUD).
- `fuelBarFill`: depth 1001, scrollFactor 0, origin (0, 0.5). Width varia de 0 a 314px.
- `fuelLabel`: depth 1002, scrollFactor 0. Texto: `COMBUSTIVEL N/100`.
- Cores: verde (`GENTILEZA_LEAF=0x4FBA53`) se ratio > 0.5, amarelo (`GENTILEZA_YELLOW=0xF5C97E`) se 0.25-0.5, laranja (`MOWER_ORANGE=0xE8631E`) se < 0.25.
- **Nao adicionar elementos HUD com x < 40 ou x > 920 em modo normal** — risco de colisao visual.

#### Modo olhos cansados (G5 — adicionado em `d484e11`)
- `VisualScale` e calculado em `visualScaleFor(getSettings())` no `init()`.
- Em `eyeStrainMode=true`: fonts maiores, player maior, D-pad maior. Mesma logica de jogo.
- `getSettings()` le de `localStorage`. Se indisponivel, retorna defaults (sem erro).
- G5+ nao deve chamar `getSettings()` dentro de `update()` — custo de I/O potencial.

#### D-Pad (G5 — adicionado em `d484e11`)
- 4 botoes interativos (UP/DOWN/LEFT/RIGHT) posicionados em (180, 540) com `setScrollFactor(0)`, depth 2000.
- Botoes sao `setInteractive` — disparam `currentlyOver` no handler global `pointerdown`, que retorna cedo se `currentlyOver.length > 0` (evita duplo movimento).
- Em game over ou level clear, D-pad chama `restartLevel()` ou `advanceLevel()` respectivamente.

### Sinais de regressao para monitorar em G5+

1. **Alterar `FUEL_MAX`**: requer rebalancear `FUEL_SPAWN_MS`, `PENALTY_FLOWERS`, `PENALTY_STONE` e os thresholds de cor da barra (0.5, 0.25).
2. **Novos tile types (4-7)**: adicionar ao `onEnterTile()` com comportamento explicito; nao deixar sem handler (atualmente nao tem efeito mas e silencioso).
3. **Novos campos em `SceneData`**: garantir reset em `init()`.
4. **Adicionar elementos interativos ao jogo**: verificar se `currentlyOver` no handler pointerdown ainda funciona corretamente (pode bloquear tap-to-move de forma inesperada).
5. **Modificar `onLevelClear` ou `triggerGameOver`**: garantir que `clearFuelBarrel()` e `fuelSpawnTimer?.remove()` continuem sendo chamados.
6. **Adicionar tweens persistentes**: garantir que sejam parados e destruidos no SHUTDOWN ou nos metodos de cleanup.
7. **`cutCount` em area-of-effect**: se G5+ adicionar corte de multiplos tiles por frame, garantir que `cutCount` nao ultrapasse `grama_alta_para_cortar` de forma que `onLevelClear` seja chamado mais de uma vez (atualmente o guard `levelCleared` previne, mas um incremento de +N pode pular a condicao exata `>=`).
