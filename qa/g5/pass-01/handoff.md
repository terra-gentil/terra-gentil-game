# Handoff G5 pass-01

---

## Para reverificacao desta sprint (G5 pass-02+)

### O que ja foi validado (analise estatica)

- [x] `Settings.ts`: `getSettings()` com try/catch, fallback correto, spread para forward-compat
- [x] `saveSettings()`: silencioso em falha (private mode) — correto
- [x] `toggleEyeStrainMode()`: le + flip + save + retorna novo estado — sem side effects indevidos
- [x] `VisualScale`: todos os 10 campos usados em `buildHud()`, `buildDPad()`, `create()` — cobertura completa exceto `fuelBarW/fuelBarH` (nao escalados, ver P2-03)
- [x] D-pad geometry (normal): UP=(180,450) DOWN=(180,630) LEFT=(90,540) RIGHT=(270,540), tamanho 120x120
- [x] D-pad geometry (eye-strain): UP=(180,435) DOWN=(180,645) LEFT=(75,540) RIGHT=(285,540), tamanho 140x140
- [x] DOWN button eye-strain margem inferior: 715px vs GAME_HEIGHT=720 — 5px de margem (P1-03)
- [x] Depth D-pad rects=2000, arrows=2001, centerMessage=2000 — arrows acima da mensagem (P1-01)
- [x] Filtro `currentlyOver.length > 0` — previne double-dispatch corretamente
- [x] Flag `advancing` em advanceLevel/restartLevel — previne double-fire corretamente
- [x] SHUTDOWN handler remove listeners globais (pointerdown, SPACE, ENTER, ESC, fuelSpawnTimer) — correto
- [x] D-pad listeners locais (pointerdown/over/out no `rect`) destruidos com o GameObject — correto
- [x] Camera `startFollow(player, false, 0.1, 0)` — sem offset, regressao G3 P1 corrigida
- [x] TitleScene toggle: `refreshEyeStrainLabel` chamado em init e apos toggle — correto
- [x] localStorage GDPR: config nao-sensivel, sem necessidade de consent — OK
- [x] localStorage private mode: try/catch em saveSettings — OK

### Gaps (pendente para pass-02+)

- [ ] **Build TypeScript nao executado** — permissao de shell negada. Verificar que `Settings.ts` compila sem erros e que a importacao em `GameScene.ts` e `TitleScene.ts` resolve corretamente.
- [ ] **Teste em dispositivo mobile real** — validar tamanhos de touch target (120x120px normal, 140x140px eye-strain) em tela de 375px (iPhone SE) com scale FIT.
- [ ] **Teste de margem inferior (P1-03)** — em iPhone Safari com home indicator, o DOWN button em eye-strain pode ser parcialmente obscurecido. Validar em simulador iOS.
- [ ] **Teste de depth conflict (P1-01)** — ativar mode eye-strain, completar uma fase, verificar visualmente se as setas do D-pad aparecem sobre o texto de "FASE X COMPLETA!".
- [ ] **Teste de toggle + reinicio de fase** — alternar modo durante title, entrar na fase, confirmar que o VisualScale e aplicado corretamente.
- [ ] **Teste de localStorage corrompido** — setar manualmente `localStorage.setItem('gentileza:settings', 'invalid_json')` e confirmar que o jogo inicia normalmente com defaults.
- [ ] **Teste de tapagem de tiles (P2-04)** — em fase 1 (14 tiles), confirmar visualmente se a sobreposicao do D-pad sobre colunas 0-2 e aceitavel para o publico alvo.

---

## Para QA das proximas sprints (G6+)

### Invariantes estabelecidos pela G5 que nao podem ser quebrados

#### Settings module (`jogo/src/config/Settings.ts`)

- `STORAGE_KEY = 'gentileza:settings'` — nao mudar sem migrar dados existentes no localStorage
- `DEFAULT_SETTINGS.eyeStrainMode = false` — default deve ser DESLIGADO
- `getSettings()` DEVE retornar `{ ...DEFAULT_SETTINGS }` em caso de erro — nunca lancar excecao
- `saveSettings()` DEVE ser silencioso em falha — nunca lancar excecao
- `toggleEyeStrainMode()` DEVE ler + salvar + retornar o novo estado em uma unica chamada atomica
- O tipo `Settings` so tem `eyeStrainMode: boolean` atualmente. Novos campos DEVEM ter default no `DEFAULT_SETTINGS` para garantir forward-compat com settings antigas.
- Se G6+ adicionar novos campos ao `Settings`, DEVE atualizar `DEFAULT_SETTINGS` correspondentemente e testar que `getSettings()` com storage antigo (sem o novo campo) retorna o default correto via spread.

#### VisualScale e modo olhos cansados

- `visualScaleFor(settings: Settings): VisualScale` DEVE retornar valores consistentes para ambos os modos
- `this.vs` e lido em `init()` de GameScene — NUNCA chamar `visualScaleFor()` apenas em `create()` (seria chamado antes do `init()` na cadeia do Phaser)
- Se G6+ adicionar novos elementos visuais escalaveis, DEVEM ser incluidos no `VisualScale` e no `visualScaleFor()`
- D-pad sempre presente (nao opcional) — nao condicionar buildDPad() ao modo mobile

#### D-pad

- 4 botoes sempre visiveis (nao esconder em nenhum estado do jogo)
- Posicao base: `cx=180, cy=GAME_HEIGHT-180` — se alterar, verificar margens de tela em ambos os modos
- Depth dos rects: atualmente 2000. Se centerMessage for corrigida para depth 2002, D-pad pode manter 2000/2001
- **INVARIANTE CRITICO**: depth das arrows do D-pad DEVE ser MENOR que depth da centerMessage. Atualmente isso esta VIOLADO (P1-01 pendente). G6 deve corrigir.
- `setScrollFactor(0)` — D-pad deve permanecer fixo na viewport
- Listeners locais (`rect.on('pointerdown/over/out')`) — Phaser destroi ao SHUTDOWN, nao precisam de remocao manual
- Handler global `pointerdown` DEVE continuar usando `currentlyOver.length > 0` como guard contra double-dispatch

#### Lifecycle de listeners

- SHUTDOWN handler DEVE remover: `this.input.off('pointerdown', onPointerDown)`, `kb.off('keydown-SPACE')`, `kb.off('keydown-ENTER')`, `kb.off('keydown-ESC')`
- Se G6+ adicionar novos listeners globais em `create()`, DEVEM ser adicionados ao SHUTDOWN handler
- `fuelSpawnTimer?.remove()` no SHUTDOWN deve ser mantido

#### Flag `advancing`

- `advancing` deve ser resetado para `false` em `init()` (ja esta — linha 142)
- `advanceLevel()` e `restartLevel()` DEVEM checar `if (this.advancing) return` antes de qualquer acao
- Handler global `onPointerDown` DEVE checar `if (this.advancing) return` — nao remover

#### Camera

- `this.cameras.main.startFollow(this.player, false, 0.1, 0)` sem offset adicional — offset era o bug P1 do G3
- Se G6+ alterar o follow, testar em niveis 1-3 (worldW < GAME_WIDTH) e niveis 8-10 (worldW > GAME_WIDTH)

### Sinais de regressao a monitorar em G6+

1. **Se G6 adicionar audio**: verificar que os AudioContext events nao interferem com o `pointerdown` global e o filtro `currentlyOver`
2. **Se G6 adicionar HUD buttons** (ex: mute): esses buttons serao interativos e apareceram em `currentlyOver`, o que pode bloquear o tap-to-move incorretamente se o player tocar num HUD button enquanto quer mover
3. **Se G6 adicionar popup/modal**: verificar depth > 2001 (acima das arrows do D-pad) e que o modal e `setInteractive` para bloquear o handler global
4. **Se mudar `GAME_HEIGHT`**: recalcular geometria do D-pad — especialmente margem inferior do DOWN button em eye-strain (atualmente apenas 5px)
5. **Se mudar `GAME_WIDTH`**: recalcular `worldOffsetX` e sobreposicao do D-pad com tiles em niveis estreitos
6. **Se `Settings` ganhar novos campos booleanos**: garantir que o `VisualScale` seja extendido correspondentemente e que o toggle na TitleScene seja atualizado
7. **Se TitleScene ganhar mais elementos**: verificar layout com o toggle em `GAME_HEIGHT/2 + 130` e o selector de fases em `GAME_HEIGHT - 140` — ha 270px de espaco para elementos adicionais

### Estado de bugs abertos desta sprint

| ID | Severidade | Status |
|---|---|---|
| P1-01 | P1 | ABERTO — depth arrows 2001 > centerMessage 2000 |
| P1-03 | P1 | ABERTO — DOWN button eye-strain com 5px de margem |
| P2-02 | P2 | ABERTO — toggle sem aviso de timing |
| P2-03 | P2 | ABERTO — barra de fuel nao escala |
| P2-04 | P2 | ABERTO — D-pad sobrepoe tiles em levels pequenos |
