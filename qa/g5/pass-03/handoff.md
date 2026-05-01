# Handoff G5 pass-03

---

## Validado nesta pass

- [x] D-pad 4 botoes em (cx=180), depth rect=2000 + arrow=2001 - GameScene.ts:340-388
- [x] cy dinamico em ambos os modos visuais - GameScene.ts:344
- [x] Filtro `currentlyOver.length > 0` no handler global - GameScene.ts:229
- [x] Settings: STORAGE_KEY='gentileza:settings', defaults corretos
- [x] Toggles atomicas (le-flip-salva-retorna)
- [x] `getSettings()` so em GameScene.init() - sem reflexo em fase em curso
- [x] centerMessage depth=2002 - GameScene.ts:648, 682
- [x] index.html lock paisagem + user-scalable=no inalterado
- [x] G6 botao SOM sem colisao com eye-strain
- [x] G7/G7.5: zero touch em G5
- [x] G8 rankingBtn sem colisao vertical com toggles G5
- [x] G8 SubmitModal HTML overlay com gate `submitModalOpen` em handler global, D-pad e teclas

## Bugs antigos - estado pos-G8

| ID | Status |
|---|---|
| P1-01 | FECHADO |
| P1-03 | FECHADO |
| P2-02 | ABERTO (trade-off) |
| P2-03 | ABERTO - barra fuel sem escala em eye-strain |
| P2-04 | ABERTO (trade-off) |
| P3-01 | ABERTO - gap ~25px estado DESLIGADO/DESLIGADO |

## Achados novos (out-of-scope, atribuidos a outras sprints)

- P3-G5-02 -> atribuir QA G8: rankingBtn margem ~10px com titulo
- P3-G5-03 -> atribuir QA G6: cut() volume 0.08 vs 0.16-0.20 dos outros

---

## Para QA das proximas sprints (G9+)

### Invariantes do D-pad e settings preservados

- D-pad cx=180, cy dinamico baseado em GAME_HEIGHT - dpadButtonSize/2 - dpadArm - 20
- Filtro `currentlyOver.length > 0` previne duplo input com tap-to-move
- Settings via localStorage `gentileza:settings`, defaults `eyeStrainMode:false`, `soundEnabled:true`
- `submitModalOpen` gate em handlers de pointer/keyboard/D-pad

### Sinais de regressao a monitorar em G9+

1. Se G9 adicionar nova UI bottom-left (ex: HUD novo): conferir colisao com D-pad cx=180.
2. Se G9 mudar `dpadButtonSize` ou `dpadArm`: recalcular cy.
3. Se G10 adicionar tela de pause overlay: gate com flag dedicada (nao reusar submitModalOpen).
4. Se G11+ adicionar haptic feedback no D-pad: navigator.vibrate so com user gesture.

### Bugs herdados ainda abertos

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| P2-02 | G5 | P2 | ABERTO - toggle olhos cansados sem aviso de timing (trade-off UX aceito) |
| P2-03 | G5 | P2 | ABERTO - barra de combustivel nao escala em eye-strain |
| P2-04 | G5 | P2 | ABERTO - D-pad sobrepoe tiles em niveis estreitos (trade-off aceito) |
| P3-01 | G5 | P3 | ABERTO - gap ~25px estado DESLIGADO/DESLIGADO |
