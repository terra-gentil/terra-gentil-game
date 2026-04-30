# Handoff G4 pass-02

---

## Para reverificacao desta sprint (G4 pass-03+)

### O que foi validado nesta pass (analise estatica — HEAD aa2633a)

- [x] Fix P1 G4-01 (SHUTDOWN + clearFuelBarrel) confirmado em `a67a26b` — correto e completo
- [x] `SfxPlayer` usa Web Audio API async — nenhum SFX call bloqueia o game loop
- [x] `sfx.setMuted()` chamado em `init()` — sem vazamento de estado entre restarts
- [x] `sfx.cut()` apos `cutTileAt()` — ordering correto
- [x] `sfx.penaltyFlowers()` apos `applyFuelPenalty()` — ordering correto (caso fuel > 12)
- [x] `sfx.penaltyStone()` apos `shake()` — ordering correto (caso fuel > 25)
- [x] `sfx.fuelPickup()` apos barrel.destroy() e scheduleFuelSpawn() — ordering correto
- [x] `sfx.levelClear()` apos clearFuelBarrel() — ordering correto
- [x] `sfx.gameOver()` apos clearFuelBarrel(), antes de build da mensagem — ordering correto no caso normal
- [x] Spawn/timer/cleanup verificados em todas as 7 transicoes (levelClear, gameOver-decay, gameOver-penalty, ESC/SHUTDOWN, restart, pickup, sem-candidatos)

### Gaps abertos

- [ ] **Bug P2 (G4-02)**: Quando `fuel == 0` e jogador pisa pedra, `applyFuelPenalty(25)` chama `triggerGameOver()` (que dispara `sfx.gameOver()`), mas `onEnterTile` continua e aciona `cameras.main.shake()` + `sfx.penaltyStone()` sobre o game over. Dissonancia audio audivel (thump 90Hz sobre nota 220Hz). Fix: checar `if (!this.gameOver)` apos `applyFuelPenalty` antes de shake e SFX nas branches STONE e FLOWERS em `onEnterTile` (`GameScene.ts:496-500`).
- [ ] **Build TypeScript nao executado** — permissao de shell negada. Executar `npm run build` em `jogo/` para confirmar zero erros.
- [ ] **Feedback critico de fuel (P2)**: sem animacao de piscar quando `fuel < 25%`. Tween em `fuelBarFill` pendente.
- [ ] **Teste de camera em niveis 9-10**: `startFollow` sem offsetX foi corrigido mas nao testado visualmente.
- [ ] **Teste de keyboard leak**: cleanup via SHUTDOWN implementado mas nao testado em runtime (completar 3+ fases em sequencia).
- [ ] **Teste de jitter** em fases 1-3 (worldW=896 < 1280).
- [ ] **Validacao editor_x vs game_x**: spawn em `editor_x` (linha 198) — confirmar tile correto no runtime.
- [ ] **Teste em mobile real**: D-pad, touch targets, feedback visual.
- [ ] **Balance fases 6-10**: 4 STONEs consecutivos = game over imediato; verificar se galao pode ser coletado antes.
- [ ] **Teste de SFX em mobile (AudioContext autoplay policy)**: Web Audio criado lazy, mas a politica de autoplay pode atrasar o primeiro som apos long idle. Testar em iOS Safari e Android Chrome.

---

## Para o QA da proxima sprint (G7+)

### Contratos estabelecidos/confirmados pela G4 pass-02

#### Sistema de fuel (sem alteracao)
- Todos os contratos de G4 pass-01 permanecem validos (ver handoff pass-01).

#### SFX (G6 — adicionado em `aa2633a`)

- `sfx` e singleton exportado de `src/audio/SfxPlayer.ts`.
- Operacoes sao fire-and-forget; nao retornam Promise nem callback.
- `sfx.setMuted(bool)` e chamado em `init()`. G7+ deve chamar `sfx.setMuted()` ao alterar settings de som sem reiniciar a scene.
- Seis eventos cobertos: `cut`, `penaltyFlowers`, `penaltyStone`, `fuelPickup`, `levelClear`, `gameOver`.
- `SfxPlayer` e implementacao temporaria (Web Audio sintetizado). Quando assets OGG forem adicionados, trocar para `this.sound.play(key)` no GameScene — nao expor `AudioContext` para fora do `SfxPlayer`.

#### Invariante de ordering SFX (importante para G7+)
- SFX deve ser chamado **apos** toda a logica de estado do frame (fuel, tile, gameOver flag). Nunca antes.
- Quando `applyFuelPenalty` pode triggar `gameOver` internamente, o caller deve checar `this.gameOver` apos a chamada antes de disparar SFX adicionais do mesmo evento (ver bug G4-02).

### Sinais de regressao para monitorar em G7+

1. Todos os sinais de G4 pass-01 continuam validos.
2. **Alterar `onEnterTile`**: garantir que novas branches de tile tambem seguem o padrao "logica primeiro, SFX depois" e checam `this.gameOver` apos `applyFuelPenalty` se o novo tile pode causar game over.
3. **Adicionar novos metodos SFX**: garantir que `playTone` nao crie referencia ciclica ao `AudioContext` nem acumule nodes nao-terminados (nodes sao auto-GC apos `osc.stop()`).
4. **Toggle de som em runtime (settings)**: se G7+ adicionar toggle sem restart, chamar `sfx.setMuted()` imediatamente apos salvar a setting. Nao depender de `init()` para propagar.
5. **`restartLevel()` durante SFX em andamento**: Web Audio nodes continuam ate o `stop()` agendado mesmo apos `scene.restart()`. Sons longos (gameOver dura ~940ms) podem vazar para o proximo restart. Considerar `this.ctx.close()` ou `this.ctx.suspend()` no `setMuted(true)` se isso se tornar problema audivel.
