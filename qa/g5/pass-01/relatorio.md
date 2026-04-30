# QA G5 - Relatorio pass-01

**Sprint**: G5 — Mobile (D-pad touch) + Acessibilidade (modo olhos cansados)
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G5 pass-01
**Commit**: d484e11
**Arquivos alterados**: `jogo/src/config/Settings.ts` (novo), `jogo/src/scenes/GameScene.ts`, `jogo/src/scenes/TitleScene.ts`
**Build validado**: nao (permissao de shell negada; analise estatica manual)

---

## Cobertura

| Area | Metodo |
|---|---|
| Settings module (get/save/toggle) | Leitura completa |
| D-pad geometry e limites de tela | Calculo manual com GAME_HEIGHT=720 |
| Depth conflicts D-pad vs centerMessage | Analise de ordem de criacao e depth values |
| Listener lifecycle (SHUTDOWN) | Leitura completa |
| Filtro pointerdown global (currentlyOver) | Leitura completa |
| VisualScale aplicacao | Leitura de cada campo vs uso em create/buildHud/buildDPad |
| TitleScene toggle | Leitura completa |
| Acessibilidade: tamanho de alvo touch | Calculo manual (px) |
| Acessibilidade: contraste de cores | Analise hex |
| Regressao G3 P1 (camera offset) | Leitura de startFollow |
| TypeScript build | NAO validado (shell negado) |

---

## Achados

### P1-01 — D-pad arrows (depth 2001) sobrepoe centerMessage (depth 2000)

**Arquivo**: `jogo/src/scenes/GameScene.ts:344-354` e `:606-618`, `:629-646`

```ts
// buildDPad — arrow text
arrow.setOrigin(0.5).setScrollFactor(0).setDepth(2001);  // linha 354

// onLevelClear — centerMessage
this.centerMessage.setDepth(2000);  // linha 618

// triggerGameOver — centerMessage
this.centerMessage.setDepth(2000);  // linha 646
```

Os 4 textos de seta do D-pad ficam em depth 2001. O `centerMessage` fica em depth 2000.
Como Phaser renderiza depth superior por cima, as setas do D-pad ficam ACIMA da mensagem
central de "fase completa" / "sem combustivel".

Posicoes dos botoes do D-pad (scrollFactor=0, coordenadas de tela):
- UP: (180, 450) — potencialmente dentro da area da mensagem que cobre y~290..470 (48px font, 2-3 linhas, padding 30px)
- RIGHT: (270, 540) — na borda inferior do box da mensagem
- Em modo olhos cansados (font 56px): caixa maior, sobreposicao ainda mais provavel

Resultado visual: as setas ▲◀▼▶ aparecem sobre o texto da mensagem de vitoria/derrota,
prejudicando a leitura.

**Correcao sugerida**: aumentar centerMessage para depth 2002 (acima de tudo do D-pad), ou
diminuir arrows para depth 1999 (abaixo da centerMessage).

---

### P1-02 — `arrow` Text nao e interativo mas intercepta visualmente o hit area do `rect`

**Arquivo**: `jogo/src/scenes/GameScene.ts:347-354`

```ts
const arrow = this.add.text(bx, by, btn.arrow, { ... });
arrow.setOrigin(0.5).setScrollFactor(0).setDepth(2001);
```

O `arrow` Text esta centrado exatamente sobre o `rect` Rectangle interativo. Em Phaser 3,
um Text object nao-interativo renderizado sobre um Rectangle interativo nao bloqueia o
hit-test (o input continua passando para o rect abaixo). Isso e tecnicamente correto.

Porem, em dispositivos mobile com `useHandCursor: true`, o cursor em desktop aparece corretamente,
mas no mobile o touch pode registrar coordenadas levemente fora do `rect` se o usuario tocar
no centro da seta (que visualmente e o ponto obvio). Como `arrow` nao esta em `setInteractive`,
o `rect` e o unico hitbox — e o rect cobre a area correta (size x size). Nao e um bug, mas vale
documentar para se `arrow` ganhar `setInteractive` no futuro.

**Severidade reduzida para observacao**: nao e bug funcional, e um non-issue tecnico que pode
gerar confusao em code review futuro.

---

### P1-03 — Eye-strain DOWN button flerta com borda inferior da tela

**Arquivo**: `jogo/src/scenes/GameScene.ts:326-336`

```ts
const cx = 180;
const cy = GAME_HEIGHT - 180;  // = 540
// eye strain: arm=105, size=140
// DOWN center: (180, 540+105=645)
// DOWN bottom edge: 645 + 140/2 = 645 + 70 = 715
// GAME_HEIGHT = 720 => margem de 5px
```

Em modo olhos cansados (arm=105, size=140), o botao DOWN tem borda inferior em y=715, com
apenas 5px de margem ate y=720 (borda da tela). Em dispositivos onde o Phaser Scale.FIT
adiciona bordas pretas (letterboxing), isso e ok — o jogo renderiza a 1280x720 e o Scale.FIT
centraliza. Mas se o browser tiver uma barra de gesto inferior (iPhone Safari, Android nav
gestures), o touch target pode ser parcialmente obscurecido.

Considerando o publico alvo 40-70 anos com touch precisao reduzida, 5px de margem e critico.

**Correcao sugerida**: reducir `cy = GAME_HEIGHT - 195` em modo olhos cansados (ou diminuir `arm`
para 100), garantindo margem minima de 20px.

---

### P2-01 — `visualScaleFor` nao e chamado em `create()` — apenas em `init()`. Sem problema, mas pode confundir

**Arquivo**: `jogo/src/scenes/GameScene.ts:129-144`

```ts
init(data: SceneData): void {
  // ...
  this.vs = visualScaleFor(getSettings());  // linha 143
}
```

`this.vs` e setado em `init()`, que Phaser chama antes de `create()`. Isso e correto. Porem,
se uma scene for `scene.restart()`, Phaser chama `init()` novamente — logo, `vs` e re-lido.
Isso significa que um toggle de settings que ocorra entre `init()` e o fim de `create()` (janela
de microssegundos) pode resultar em estado inconsistente. Na pratica, impossivel de ocorrer
pois o toggle so e acessivel na TitleScene. Nao e bug, mas e um ponto de fragilidade.

**Impacto**: P2 (nenhum impacto pratico atual).

---

### P2-02 — Mudanca de olhos cansados durante a fase nao tem efeito ate reiniciar a scene — sem aviso ao usuario

**Arquivo**: `jogo/src/scenes/TitleScene.ts:65-68`

```ts
this.eyeStrainButton.on('pointerdown', () => {
  const updated = toggleEyeStrainMode();
  this.refreshEyeStrainLabel(updated.eyeStrainMode);
});
```

O toggle so afeta a proxima entrada no GameScene (pois `vs` e lido em `init()`). O botao esta
na TitleScene, entao o usuario precisa voltar ao titulo para ativar. Isso e aceitavel como
design (toggle so na title), mas o botao nao comunica isso. Um usuario que entra no menu de pause
(no futuro) e aciona o toggle pode esperar efeito imediato.

**Recomendacao**: adicionar subtexto "(aplica na proxima fase)" abaixo do botao.

---

### P2-03 — Barra de combustivel nao escala em modo olhos cansados

**Arquivo**: `jogo/src/scenes/GameScene.ts:289-302`

```ts
const fuelBarW = 320;  // fixo
const fuelBarH = 32;   // fixo
```

O `VisualScale` nao tem campos para `fuelBarW`/`fuelBarH`. Em modo olhos cansados, a fonte do
label da barra aumenta de 20px para 24px, mas o container da barra permanece 320x32. Isso pode
causar overflow de texto dentro do container visual da barra.

O label (`fuelLabel`) e renderizado com depth 1002 sobre a barra (depth 1000/1001), e tem
`setOrigin(0.5)` centralizado. Com texto maior pode ficar ligeiramente cortado ou desalinhado
visualmente.

**Impacto**: cosmético/P2 — a barra funciona, mas a proporcao visual fica inconsistente com o
resto do HUD que escala.

---

### P2-04 — D-pad RIGHT button pode sobrepor tiles do level em fases pequenas

**Arquivo**: `jogo/src/scenes/GameScene.ts:326-328`

```ts
const cx = 180;
const cy = GAME_HEIGHT - 180;  // 540
// arm=90 (normal) => RIGHT button center: (270, 540)
// RIGHT button bounds: x=210..330
```

Para fases de 14 tiles (largura_efetiva = 14x64 = 896px):
- `worldOffsetX = round((1280-896)/2) = 192`
- Tiles ocupam x=192..1088

O botao RIGHT do D-pad ocupa x=210..330 (normal) ou x=215..355 (olhos cansados).
A area x=210..330 sobrepos tiles do level (que comecam em x=192). Isso significa que
colunas 0-2 do mapa ficam visualmente parcialmente cobertas pelo D-pad.

Em modo olhos cansados o botao UP/DOWN (x=110..250, centrado em 180) tambem sobrepoe
tiles das colunas 0-1 (x=192..320).

O D-pad tem alpha 0.55 (semi-transparente), entao os tiles sao parcialmente visiveis.
Para o player cortar grama nas colunas esquerdas do level, o D-pad pode dificultar a
visualizacao — mas nao bloqueia a interacao (o player usa o D-pad pra se mover, nao
toca diretamente nos tiles).

**Impacto**: P2 — jogabilidade degradada em fases pequenas para o publico 40-70 anos.
Considerar deslocar o D-pad para `cx = 140` em niveis com worldW < GAME_WIDTH.

---

### P2-05 — Camera `startFollow` sem offset — fix correto da regressao G3 P1

**Arquivo**: `jogo/src/scenes/GameScene.ts:207`

```ts
this.cameras.main.startFollow(this.player, false, 0.1, 0);
```

G3 identificou que o offset `-GAME_WIDTH/2 + this.player.x` causava descentramento do player
em fases largas. G5 removeu o offset, alinhando com comportamento padrao do Phaser. Confirmado:
a regressao P1 do G3 foi corrigida neste commit.

---

### P2-06 — Contraste do toggle desligado (#37474F sobre fundo TitleScene #1B5E20) pode ser insuficiente

**Arquivo**: `jogo/src/scenes/TitleScene.ts:107`

```ts
this.eyeStrainButton.setBackgroundColor(active ? '#558B2F' : '#37474F');
```

- Estado DESLIGADO: texto branco (#FFFFFF) sobre fundo cinza-azul (#37474F)
  - Relative luminance: #37474F ≈ L=0.038 (escuro). #FFFFFF = L=1.0.
  - Contraste ≈ 27:1. OK para WCAG AA/AAA.
- Estado LIGADO: texto branco (#FFFFFF) sobre verde-claro (#558B2F)
  - #558B2F ≈ L=0.116. Contraste ≈ 8:1. OK para WCAG AA.
- Diferenciacao entre LIGADO (#558B2F) e DESLIGADO (#37474F):
  - Para daltonismo deuteranopia/protanopia (verde-vermelho): ambas as cores tem luminosidade
    baixa-media mas hues distintas (verde vs cinza-azul). Distinguiveis por luminosidade.
  - Para tritanopia (azul-amarelo): #558B2F e verde, #37474F e cinza-azul. Pode ser dificil
    distinguir.
  
**Recomendacao**: adicionar indicador textual alem da cor (ja esta presente: "LIGADO"/"DESLIGADO")
— isso mitiga o problema de daltonismo. O texto ja cumpre o requisito.

---

### P2-07 — `fuelSpawnTimer` nao e removido no `SHUTDOWN` se `fuelSpawnTimer = undefined` no momento

**Arquivo**: `jogo/src/scenes/GameScene.ts:253-259`

```ts
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  this.input.off('pointerdown', onPointerDown);
  kb.off('keydown-SPACE', onConfirm);
  kb.off('keydown-ENTER', onConfirm);
  kb.off('keydown-ESC', onEscape);
  this.fuelSpawnTimer?.remove();  // linha 258
});
```

`this.fuelSpawnTimer?.remove()` e chamado no SHUTDOWN. O operador `?.` garante que nao ha
erro se `fuelSpawnTimer` for undefined. Porem, se o timer ja foi disparado e completou
(ex: o galao foi spawnado e o timer nao foi reschedulado), `fuelSpawnTimer` ainda aponta
para o `TimerEvent` concluido. `remove()` em um TimerEvent concluido e inofensivo no Phaser.
Nao e bug.

Observacao: em `onLevelClear()` e `triggerGameOver()`, `fuelSpawnTimer?.remove()` tambem e
chamado (linhas 600, 626). Entao o timer e limpo antes do SHUTDOWN na maioria dos casos.

**Status**: sem bug. Documentado para clareza.

---

### P3-01 — Background olhos cansados (#062007) vs normal (#0E3211) — diferenca minima

**Arquivo**: `jogo/src/scenes/GameScene.ts:72, 86`

```ts
bgColor: '#062007',  // eye strain
bgColor: '#0E3211',  // normal
```

A diferenca entre #062007 e #0E3211 e de apenas ~20% de luminosidade no canal verde.
Visualmente quase identico para o publico 40-70. O efeito de "contraste alto" prometido
pelo modo olhos cansados nao e percetivel no fundo. A diferenca real de acessibilidade
vem das fontes maiores e do player maior — o fundo escuro adicional e negligenciavel.

**Recomendacao (P3)**: documentar como intencional ou remover o campo `bgColor` do
`VisualScale` para simplificar o codigo, ja que nao ha impacto real.

---

### P3-02 — Subtitulo "Resgate dos Jardins" em fundo verde escuro — contraste aceitavel

**Arquivo**: `jogo/src/scenes/TitleScene.ts:24-31`

```ts
const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 5 + 100, 'Resgate dos Jardins', {
  fontSize: '48px',
  color: '#FFFFFF',
  stroke: '#000000',
  strokeThickness: 4,
});
```

Texto branco com stroke preto de 4px sobre fundo #1B5E20. O stroke preto garante legibilidade
independente do fundo. Nao ha problema de contraste.

---

### P3-03 — Listeners de D-pad botoes (pointerdown/pointerover/pointerout) nao sao removidos manualmente no SHUTDOWN

**Arquivo**: `jogo/src/scenes/GameScene.ts:356-369`

```ts
rect.on('pointerdown', () => { ... });
rect.on('pointerover', () => rect.setFillStyle(0x000000, 0.75));
rect.on('pointerout', () => rect.setFillStyle(0x000000, 0.55));
```

Estes listeners sao locais ao `rect` GameObject. Quando a scene e desligada (SHUTDOWN),
Phaser destroi todos os GameObjects da scene, o que remove os listeners locais automaticamente.
Nao ha leak de listeners para o D-pad.

O SHUTDOWN handler (linha 253-259) gerencia apenas os listeners globais (`this.input.on`,
`kb.on`) que sao registrados no input manager da scene — esses precisam de remocao manual
e sao corretamente removidos.

**Status**: implementacao correta. Documentado para clareza.

---

### POSITIVO — Filtro `currentlyOver` previne double input corretamente

**Arquivo**: `jogo/src/scenes/GameScene.ts:214-219`

```ts
const onPointerDown = (
  pointer: Phaser.Input.Pointer,
  currentlyOver: Phaser.GameObjects.GameObject[]
) => {
  if (this.advancing) return;
  if (currentlyOver.length > 0) return;
```

O segundo parametro do evento `pointerdown` do Phaser Input Manager e a lista de GameObjects
interativos sob o ponteiro. Se o usuario tocar no D-pad, `currentlyOver` tera o `rect`
correspondente — entao o handler global retorna sem acao. O handler local do `rect` trata
o input. Logica correta, sem double-dispatch.

---

### POSITIVO — `advancing` flag previne double-fire em advanceLevel/restartLevel

**Arquivo**: `jogo/src/scenes/GameScene.ts:649-663`

```ts
private advanceLevel(): void {
  if (this.advancing) return;
  this.advancing = true;
  ...
}
private restartLevel(): void {
  if (this.advancing) return;
  this.advancing = true;
  ...
}
```

Flag `advancing` e checada tanto no handler do D-pad quanto no handler global e nos handlers
de teclado. Previne transicao de scene duplicada mesmo em multiplos taps simultaneos.
Implementacao robusta.

---

### POSITIVO — Settings module com fallback correto

**Arquivo**: `jogo/src/config/Settings.ts:11-20`

```ts
export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
```

O spread `{ ...DEFAULT_SETTINGS, ...parsed }` garante forward-compatibility: se um campo novo
for adicionado ao `Settings` no futuro, settings antigas (sem o campo) recebem o default.
O `try/catch` trata JSON corrompido e `SecurityError` em private mode. Correto.

---

### POSITIVO — Regressao G3 P1 corrigida (camera startFollow sem offset)

**Arquivo**: `jogo/src/scenes/GameScene.ts:207`

O offset incorreto `-GAME_WIDTH/2 + this.player.x` foi removido. `startFollow` agora usa
parametros padrao (lerp 0.1, sem offset manual). O Phaser clampara a camera aos bounds
definidos em `setBounds`, o que e o comportamento correto para todas as larguras de level.

---

## Resumo por severidade

| ID | Severidade | Descricao |
|---|---|---|
| P1-01 | P1 | D-pad arrows (depth 2001) sobrepoem centerMessage (depth 2000) |
| P1-02 | P1 (observacao) | arrow Text sobre rect: tecnicamente nao-bug, documentar |
| P1-03 | P1 | DOWN button em eye-strain com apenas 5px de margem inferior |
| P2-01 | P2 | `visualScaleFor` so chamado em `init()` — janela de inconsistencia teorica |
| P2-02 | P2 | Toggle nao avisa que efeito e so na proxima fase |
| P2-03 | P2 | Barra de combustivel nao escala com olhos cansados |
| P2-04 | P2 | D-pad RIGHT (e UP/DOWN em eye-strain) sobrepoe tiles de levels pequenos |
| P2-05 | P2 (fix) | Camera startFollow — regressao G3 P1 foi corrigida neste commit |
| P2-06 | P2 | Contraste toggle desligado OK; tritanopia mitigado pelo texto LIGADO/DESLIGADO |
| P2-07 | P2 (ok) | fuelSpawnTimer?.remove() no SHUTDOWN — correto |
| P3-01 | P3 | Background eye-strain #062007 vs #0E3211 — diferenca negligenciavel |
| P3-02 | P3 | Subtitulo branco com stroke preto — contraste OK |
| P3-03 | P3 | D-pad listeners locais nao precisam de remocao manual — correto |

**Bugs a corrigir**: P1-01 (depth conflict), P1-03 (margem DOWN button).
**UX a melhorar**: P2-02 (aviso de timing do toggle), P2-04 (D-pad sobre tiles pequenos).
