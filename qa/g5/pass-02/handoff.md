# Handoff G5 pass-02

---

## Para reverificacao desta sprint (G5 pass-03+ / G6+)

### O que foi validado neste pass (analise estatica, HEAD aa2633a)

- [x] centerMessage depth=2002 em `onLevelClear` e `triggerGameOver` — acima de D-pad arrows (2001) e rects (2000) — P1-01 FECHADO
- [x] Formula `cy = GAME_HEIGHT - (dpadButtonSize/2 + dpadArm + 20)` garante DOWN_bottom = GAME_HEIGHT - 20 = 700px em ambos os modos — P1-03 FECHADO
- [x] D-pad cy normal=550, cy eye-strain=525 (25px mais alto)
- [x] Settings.ts: `soundEnabled: boolean` adicionado com DEFAULT=true, spread preservado, forward-compat OK
- [x] `toggleSound()` atomica (le + flip + salva + retorna), espelha padrao de `toggleEyeStrainMode()` — correto
- [x] TitleScene toggles lado a lado: gap de 40px (estado LIGADO) / 25px (estado DESLIGADO) — sem sobreposicao
- [x] eyeStrainButton x=440, soundButton x=840, ambos em y=470 — layout correto
- [x] SfxPlayer: AudioContext lazy, `setMuted` sincronizado em TitleScene.create e GameScene.init — correto
- [x] SFX nao interfere com `currentlyOver` (nao e interativo) — correto
- [x] D-pad sobreposicao horizontal com levels 1-3 (worldW=896, offsetX=192): comportamento inalterado vs pass-01 (P2-04)

---

## Invariantes estabelecidos pela G5 (atualizados com G6)

### Settings module (`jogo/src/config/Settings.ts`)

- `STORAGE_KEY = 'gentileza:settings'` — nao mudar sem migrar dados existentes
- `DEFAULT_SETTINGS`: `eyeStrainMode: false`, `soundEnabled: true` — defaults devem ser DESLIGADO / LIGADO respectivamente
- `getSettings()` DEVE retornar `{ ...DEFAULT_SETTINGS }` em caso de erro — nunca lancar excecao
- `saveSettings()` DEVE ser silencioso em falha — nunca lancar excecao
- `toggleEyeStrainMode()` e `toggleSound()` DEVEM ser atomicas (le + flip + salva + retorna novo estado)
- Novos campos DEVEM ter default em `DEFAULT_SETTINGS`. Garantir que `getSettings()` com storage antigo (sem o novo campo) retorna o default via spread

### TitleScene

- eyeStrainButton: x = GAME_WIDTH/2 - 200 = 440, y = GAME_HEIGHT/2 + 110 = 470
- soundButton: x = GAME_WIDTH/2 + 200 = 840, y = 470
- Se G7+ adicionar terceiro toggle: espacar para GAME_WIDTH/2 - 400 / GAME_WIDTH/2 / GAME_WIDTH/2 + 400 (verificar bordas de tela)
- `sfx.setMuted(!getSettings().soundEnabled)` DEVE ser chamado em TitleScene.create() — sincroniza estado inicial
- `sfx.setMuted(!settings.soundEnabled)` DEVE ser chamado em GameScene.init() — sincroniza a cada restart

### GameScene — D-pad

- Formula de cy: `cy = GAME_HEIGHT - (dpadButtonSize/2 + dpadArm + 20)` — NAO alterar sem recalcular margens
- Invariante: DOWN_bottom = GAME_HEIGHT - 20 = 700px em qualquer modo — margem de 20px antes do home indicator
- Depth rects=2000, arrows=2001, centerMessage=2002 — NUNCA inverter esta hierarquia
- Se G7+ adicionar outro overlay (ex: pause modal): depth > 2002
- Se `dpadButtonSize` ou `dpadArm` mudarem: verificar que DOWN_bottom permanece <= GAME_HEIGHT - 20

### SfxPlayer

- AudioContext criado lazily — nao instanciar no constructor ou fora de user gesture
- `setMuted()` deve ser chamado antes de qualquer `play*()`
- Se G7+ adicionar Phaser sound assets (OGG): manter `sfx.setMuted()` como gate antes de `this.sound.play()`
- SFX NAO deve ser interativo — nao pode aparecer em `currentlyOver` do handler global

---

## Bugs abertos (estado atual)

| ID | Severidade | Status | Descricao |
|---|---|---|---|
| P1-01 | P1 | **FECHADO** (aa2633a) | centerMessage depth=2002 acima do D-pad |
| P1-03 | P1 | **FECHADO** (aa2633a) | DOWN button margem inferior = 20px em ambos os modos |
| P2-02 | P2 | ABERTO | Toggle sem aviso de timing (efetiva so na proxima fase) |
| P2-03 | P2 | ABERTO | Barra de fuel nao escala em eye-strain |
| P2-04 | P2 | ABERTO | D-pad sobrepoe tiles nas colunas 0-2 de levels estreitos (1-3) |
| P3-01 | P3 | ABERTO (novo G6) | Gap entre toggles cai para ~25px no estado DESLIGADO — sem overlap mas estreito |

---

## Sinais de regressao a monitorar em G7+

1. **Se G7 adicionar terceiro toggle em TitleScene**: verificar gap horizontal entre os tres botoes com todos em estado DESLIGADO (textos mais longos)
2. **Se G7 mudar fontSize dos toggles**: recalcular largura estimada e gap minimo
3. **Se G7 adicionar Phaser sound (OGG)**: manter `sfx.setMuted()` como gate; verificar que AudioContext nao e instanciado antes de user gesture
4. **Se G7 alterar `dpadButtonSize` ou `dpadArm`**: verificar invariante DOWN_bottom = GAME_HEIGHT - 20; verificar sobreposicao com levels estreitos
5. **Se G7 adicionar novos campos a `Settings`**: atualizar `DEFAULT_SETTINGS`, `VisualScale` se aplicavel, toggle em TitleScene, e `sfx.setMuted()` em init se o campo afetar audio
6. **Se G7 adicionar overlay/modal com depth > 2001**: garantir que e `setInteractive` para bloquear o handler global `onPointerDown`
7. **Camera `startFollow` sem offset adicional**: nao regredir (era bug P1 do G3)

---

## Gaps pendentes (nao verificaveis por analise estatica)

- [ ] Build TypeScript nao executado — verificar que todos os imports resolvem e que nao ha erros de tipo em SfxPlayer, Settings, TitleScene, GameScene
- [ ] Teste em dispositivo real: touch targets 120x120 (normal) e 140x140 (eye-strain) em iPhone SE (375px) com scale FIT
- [ ] Teste de home indicator iOS: margem de 20px do DOWN button pode ser insuficiente em Safari com barra de navegacao retraida + home indicator (~34px safe area)
- [ ] Teste de depth conflict visual: completar fase em eye-strain mode, confirmar centerMessage aparece sobre D-pad arrows
- [ ] Teste de toggle + reinicio de fase: alternar em title, entrar na fase, confirmar VisualScale e soundEnabled aplicados corretamente
- [ ] Teste de localStorage corrompido: `localStorage.setItem('gentileza:settings', 'bad')` — confirmar inicio normal com defaults
- [ ] Teste P2-04: em fase 1 (14 tiles), confirmar sobreposicao do D-pad sobre colunas 0-2 e aceitavel para o publico-alvo
