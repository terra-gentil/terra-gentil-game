# Relatorio QA G5 pass-02

**Data:** 2026-04-30
**HEAD:** aa2633a
**Escopo:** Verificacao dos fixes P1 de pass-01 + analise das mudancas da G6 (Settings.ts + TitleScene)
**Metodo:** Analise estatica de codigo

---

## 1. Verificacao dos fixes do pass-01

### 1.1 Fix P1-01 — centerMessage depth 2000 -> 2002

**Status: CONFIRMADO CORRIGIDO**

GameScene.ts linhas 630 e 660:
```
this.centerMessage.setDepth(2002);
```
(em `onLevelClear` e `triggerGameOver`, respectivamente)

Hierarchy de depth resultante:
- D-pad rects: 2000
- D-pad arrows: 2001
- centerMessage: 2002 (acima de ambos)

Comentario no codigo confirma intencionalidade: `// Depth 2002 fica acima do D-pad (rectangle 2000 + arrow text 2001)`

**P1-01: FECHADO.**

---

### 1.2 Fix P1-03 — Margem inferior do DOWN button em eye-strain mode

**Status: CONFIRMADO CORRIGIDO**

Linha 334 de GameScene.ts:
```typescript
const cy = GAME_HEIGHT - (this.vs.dpadButtonSize / 2 + this.vs.dpadArm + 20);
```

Calculo resultante para ambos os modos:

| Parametro | Normal | Eye-strain |
|---|---|---|
| dpadButtonSize | 120 | 140 |
| dpadArm | 90 | 105 |
| cy | 720-(60+90+20)=**550** | 720-(70+105+20)=**525** |
| DOWN center | 550+90=640 | 525+105=630 |
| DOWN bottom edge | 640+60=**700** | 630+70=**700** |
| Margem inferior | **20px** | **20px** |

A formula garante que o DOWN button sempre termina em GAME_HEIGHT - 20 = 700px, independente do modo. Isso resolve a margem de 5px que havia sido identificada como P1-03 em pass-01. A formula e matematicamente equivalente a: DOWN_bottom = GAME_HEIGHT - 20.

**P1-03: FECHADO.**

---

## 2. Analise das mudancas da G6

### 2.1 Settings.ts — Extensibilidade com soundEnabled

**Status: CORRETO**

Mudancas em `C:\Gitlab_hz\terra-gentil-game\jogo\src\config\Settings.ts`:

1. Interface `Settings` ganhou `soundEnabled: boolean`
2. `DEFAULT_SETTINGS.soundEnabled = true` definido (default ligado, correto para UX)
3. Pattern de spread `{ ...DEFAULT_SETTINGS, ...parsed }` mantido em `getSettings()` — forward-compat preservado: storage antigo sem `soundEnabled` receberá o default `true`
4. Nova funcao `toggleSound()` espelha exatamente a estrutura de `toggleEyeStrainMode()`: le + flip + salva + retorna novo estado atomicamente
5. `STORAGE_KEY` nao mudou — dados existentes de usuarios continuam validos

Invariantes do handoff pass-01 para Settings.ts: todos preservados.

**Sem regressao. Extensibilidade confirmada.**

---

### 2.2 TitleScene — Dois toggles lado a lado, overlap?

**Status: OK — sem overlap**

Posicoes dos botoes (TitleScene.ts linhas 61 e 77):
- eyeStrainButton: x = GAME_WIDTH/2 - 200 = **440**, y = GAME_HEIGHT/2 + 110 = **470**
- soundButton: x = GAME_WIDTH/2 + 200 = **840**, y = **470**

Estimativa de largura dos textos (fontSize 24px, Arial Black, padding x:20 = 20px cada lado):

| Botao | Texto (estado LIGADO) | Largura estimada texto | + padding (40px) | Semi-largura |
|---|---|---|---|---|
| OLHOS CANSADOS | "OLHOS CANSADOS: LIGADO" | ~430px | ~470px | ~235px |
| SOM | "SOM: LIGADO" | ~210px | ~250px | ~125px |

Bordas horizontais (pior caso — ambos LIGADO):
- eyeStrainButton: esquerda = 440 - 235 = **205**, direita = 440 + 235 = **675**
- soundButton: esquerda = 840 - 125 = **715**, direita = 840 + 125 = **965**

Gap entre os dois botoes: 715 - 675 = **40px**. Sem sobreposicao.

Verificacao de limites de tela (GAME_WIDTH=1280):
- Borda esquerda do eyeStrain (205px): 205px da borda da tela — OK
- Borda direita do sound (965px): 1280 - 965 = 315px da borda direita — OK

**Sem overlap. Layout correto.**

**Nota P2 (baixo risco):** Em estado DESLIGADO, "OLHOS CANSADOS: DESLIGADO" e ligeiramente mais longo (~460px estimado). A semi-largura aumenta para ~250px, direita = 440 + 250 = 690. Gap cai para 715 - 690 = 25px. Ainda sem sobreposicao mas margem reduzida. Aceitavel.

---

### 2.3 Toggle de SOM em y=470 (mesma linha do OLHOS CANSADOS)

A preocupacao levantada era se ambos estariam na mesma posicao y. Confirmado: ambos em y = GAME_HEIGHT/2 + 110 = 470. Isso e intencional (layout lado a lado), correto e sem conflito de layout dado o gap de 40px entre eles.

---

## 3. D-pad em fases pequenas (levels 1-3): sobreposicao com tiles

**Status: ACEITAVEL — sem regressao**

Geometria do nivel 1 (14x11 tiles, menor largura dos niveis 1-3):
- worldW = 14 * 64 = **896px**
- worldOffsetX = (1280 - 896) / 2 = **192px** (centralizacao horizontal)
- Borda esquerda do nivel (world): x = 192px

D-pad (modo normal): cx=180, arm=90, size=120
- LEFT button center: 180 - 90 = 90; bordas: 30 a 150
- RIGHT button center: 180 + 90 = 270; bordas: 210 a 330
- Centro do D-pad (cx=180) esta 12px a esquerda da borda do nivel (192px)
- Borda direita do RIGHT button (330px) penetra na coluna 0 (192-256), coluna 1 (256-320) e 10px dentro da coluna 2 (320-384) do nivel

D-pad (modo eye-strain): cx=180, arm=105, size=140
- LEFT button: bordas 5 a 155
- RIGHT button center: 285; bordas: 215 a 355
- Borda direita do RIGHT button (355px) penetra 35px dentro da coluna 2 (320-384)

**Avaliacao:** A sobreposicao do D-pad com as primeiras colunas dos niveis estreitos (1-3) e **uma caracteristica pre-existente documentada como P2-04** no pass-01, nao uma regressao introduzida pelo fix de cy. Com cy mais alto em eye-strain (525 vs 550), o D-pad sobe 25px verticalmente — isso nao altera a sobreposicao horizontal, apenas a posicao vertical. Em termos de jogabilidade, os primeiros tiles ficam levemente mais obscurecidos verticalmente, mas o jogador ainda ve os tiles por cima do D-pad (tiles sao renderizados em depth baixo, D-pad em 2000/2001). A sobreposicao visual e esperada e documentada como aceitavel para o publico-alvo.

**Sem nova regressao. P2-04 permanece aberto porem inalterado.**

---

## 4. SfxPlayer — analise rapida (novo modulo G6)

**Status: CORRETO**

- AudioContext criado lazily na primeira chamada apos user gesture — respeita politica de auto-play dos browsers
- `setMuted()` sincronizado em `TitleScene.create()` e em `GameScene.init()` antes de qualquer som
- Toggle de som em TitleScene da feedback imediato (`sfx.fuelPickup()` se ligando)
- `sfx.setMuted(!updated.soundEnabled)` aplicado antes de qualquer playback — correto
- Sem interferencia com o handler `pointerdown` global (SFX nao e interativo, nao aparece em `currentlyOver`)

**Sem issues.**

---

## 5. Resumo de status de bugs

| ID | Severidade | Status pass-01 | Status pass-02 |
|---|---|---|---|
| P1-01 | P1 | ABERTO | **FECHADO** — centerMessage depth=2002 confirmado |
| P1-03 | P1 | ABERTO | **FECHADO** — formula garante margem de 20px em ambos os modos |
| P2-02 | P2 | ABERTO | ABERTO — toggle sem aviso de timing (sem mudanca) |
| P2-03 | P2 | ABERTO | ABERTO — barra de fuel nao escala (sem mudanca) |
| P2-04 | P2 | ABERTO | ABERTO — D-pad sobrepoe tiles em levels pequenos (sem nova regressao) |

**Novos issues G6:**

Nenhum P1 ou P2 novo encontrado.

**P3-01 (cosmético):** Estado DESLIGADO dos toggles ("OLHOS CANSADOS: DESLIGADO" + "SOM: DESLIGADO") gera gap de ~25px entre os botoes — funcional mas estreito se houver outros idiomas futuramente.

---

## 6. Gaps pendentes (nao verificaveis por analise estatica)

- Build TypeScript nao executado (permissao negada)
- Teste em dispositivo real: touch targets, home indicator iOS, toggle + reinicio de fase
- localStorage corrompido: try/catch presente, nao testado em runtime
- Teste de depth conflict visual (P1-01 FECHADO por codigo, pendente validacao visual)
