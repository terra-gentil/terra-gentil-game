# Relatorio QA G5 pass-03

**Sprint**: G5 - Mobile (D-pad virtual + modo olhos cansados com persistencia)
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G5 pass-03
**HEAD analisado**: ad71970
**Commits revisados**: d484e11 (G5 base), 8662a4a (checklist)
**Build validado**: nao (sandbox)

---

## Cobertura

Verificacao dos invariantes G5 + auditoria de regressoes G6/G7/G7.5/G8.

---

## Verificacao dos invariantes G5 - todos OK

- D-pad 4 botoes em `cx=180`, depth rect=2000 + arrow=2001 - `GameScene.ts:340-388`
- cy dinamico = `GAME_HEIGHT - (dpadButtonSize/2 + dpadArm + 20)` - `GameScene.ts:344` - DOWN_bottom=700 em ambos os modos
- Filtro `currentlyOver.length > 0` no handler global - `GameScene.ts:229`
- Settings: STORAGE_KEY='gentileza:settings', defaults `eyeStrainMode:false`/`soundEnabled:true`, spread forward-compat - `Settings.ts:6-22`
- Toggles atomicas (le-flip-salva-retorna) - `Settings.ts:32-44`
- `getSettings()` so em GameScene.init() - mudancas no Title nao refletem em fase em curso (linha 148)
- centerMessage depth=2002 - `GameScene.ts:648, 682`
- index.html lock paisagem + `user-scalable=no` - inalterado

---

## Bugs antigos - estado

| ID | Status |
|---|---|
| P1-01 | FECHADO (depth=2002 inalterado) |
| P1-03 | FECHADO (formula cy inalterada) |
| P2-02 | ABERTO - trade-off aceito |
| P2-03 | ABERTO - barra fuel ainda 320x32 fixa, `VisualScale` sem `fuelBarW`/`fuelBarH` |
| P2-04 | ABERTO - trade-off aceito |
| P3-01 | ABERTO - gap ~25px estado DESLIGADO/DESLIGADO |

---

## Regressoes G6/G7/G8 sobre G5

- **G6 botao SOM (x=840, y=470)**: gap horizontal de ~40px LIGADO/LIGADO com eyeStrainButton (x=440). SEM colisao
- **G6 SfxPlayer**: nao cria GameObjects, nao aparece em `currentlyOver`. Sem impacto no D-pad
- **G7/G7.5**: backend e WebView - zero touch em GameScene/TitleScene/Settings. Nao tocam em `gentileza:settings`
- **G8 rankingBtn (x=1240, y=60)**: gap vertical de ~384px com toggles em y=470. Sem colisao com G5
- **G8 SubmitModal HTML overlay (z-index 2000 CSS)**: cobre canvas Phaser por completo. Gate novo `submitModalOpen` adicionado defensivamente em handler global, D-pad e teclas (`GameScene.ts:228, 250, 256, 374`). Comportamento correto

---

## Achados novos (P3, ambos OUT-OF-SCOPE de G5)

### P3-G5-02 (atribuir a QA G8) - rankingBtn margem apertada com titulo

**Arquivo**: TitleScene.ts:129

rankingBtn (G8) em `y=60` com altura ~52px deixa borda inferior em ~86px. Titulo "GENTILEZA" tem borda superior em ~96px. Margem ~10px - aceitavel mas apertada com fonts substitutas em Android.

**Severidade**: P3 (out-of-scope G5).

### P3-G5-03 (atribuir a QA G6) - SfxPlayer.cut() volume baixo

**Arquivo**: SfxPlayer.ts (mix de audio)

`SfxPlayer.cut()` toca volume 0.08 vs 0.16-0.20 dos outros SFX. Mix de audio, nao G5.

**Severidade**: P3 (out-of-scope G5).

---

## Caminhos relevantes

- `jogo/src/scenes/GameScene.ts` (D-pad 340-388, gates 223-258, depth 648/682)
- `jogo/src/scenes/TitleScene.ts` (toggles 66/82, rankingBtn 129)
- `jogo/src/config/Settings.ts` (storage e toggles)
- `jogo/index.html` (viewport e modal CSS)
- `jogo/src/audio/SfxPlayer.ts` (G6 - sem impacto em G5)
- `jogo/src/ui/SubmitModal.ts` (G8 - HTML overlay)

---

## Resumo

| Severidade | Total | Novos | Herdados |
|---|---|---|---|
| P0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 0 |
| P2 | 3 | 0 | 3 (todos trade-offs aceitos) |
| P3 | 3 | 2 (out-of-scope) | 1 |

Nenhum bug funcional novo em G5 - sprint limpa apos 3 passes; o achado mais notavel e cosmetico e OUT-OF-SCOPE: P3-G5-02 (rankingBtn vs titulo, atribuir G8).
