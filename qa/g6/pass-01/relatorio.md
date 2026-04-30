# QA G6 pass-01 — Relatorio de Revisao

**Sprint**: G6 — Audio SFX sintetizado via Web Audio API + toggle de som
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G6 pass-01
**HEAD / Commit principal G6**: `aa2633a`
**Commits revisados**: `aa2633a` (G6 principal — diff contra `a67a26b`)
**Arquivos alterados**: `jogo/src/audio/SfxPlayer.ts` (novo), `jogo/src/config/Settings.ts`, `jogo/src/scenes/GameScene.ts`, `jogo/src/scenes/TitleScene.ts`, `README.md`
**Build validado**: nao (analise estatica manual; permissao de shell negada para `npm run build`)

---

## Cobertura

| Area | Metodo |
|---|---|
| SfxPlayer: ensureContext / lazy AudioContext | Leitura completa |
| SfxPlayer: gerenciamento de lifecycle de OscillatorNode/GainNode | Analise linha a linha |
| SfxPlayer: muted flag e setMuted | Leitura completa |
| Settings: soundEnabled default, toggleSound, getSettings spread | Leitura completa |
| GameScene: sincronizacao sfx.setMuted em init() | Leitura completa |
| GameScene: todos os 6 pontos de disparo de SFX | Leitura completa |
| TitleScene: sequencia unmute → play feedback | Leitura completa |
| TitleScene: sincronizacao sfx.setMuted em create() | Leitura completa |
| AudioContext: politica de auto-play, user gesture, suspended state | Analise de spec |
| Possivel memory leak: OscillatorNode sem disconnect() | Analise detalhada |
| Invariantes G5 herdados (depth, advancing, listeners) | Verificacao de regressao |
| Layout TitleScene: posicionamento dos 2 toggles | Calculo manual |

---

## Achados

### P1-01 — OscillatorNode e GainNode criados sem disconnect() explícito: potencial acúmulo no grafo de audio

**Arquivo**: `jogo/src/audio/SfxPlayer.ts:62-76`

```ts
const osc = ctx.createOscillator();
const gain = ctx.createGain();
// ...
osc.connect(gain).connect(ctx.destination);
osc.start(start);
osc.stop(start + dur);
// osc.disconnect() e gain.disconnect() NAO sao chamados
```

Quando `osc.stop()` e chamado com um tempo futuro, o oscilador continua no grafo de audio ate
aquele tempo, depois e parado pelo Web Audio scheduler. **No entanto, o spec garante que apos
`stop()`, o `OscillatorNode` dispara o evento `ended` e pode ser coletado pelo GC — mas apenas
se nao houver referencias vivas**. O `GainNode` ainda esta conectado ao `ctx.destination`.

O problema concreto:

- Cada chamada a `playTone()` cria 2 novos nodes e os conecta ao grafo
- `osc.stop()` agenda o fim mas **nao desconecta** o `gain` do `destination`
- Na pratica moderna (Chrome 90+, Firefox 85+, Safari 14+): apos `osc.stop()` disparar,
  o oscilador e o gain sao garbage-collected porque o AudioContext interno descarta as referencias
  apos o fim da reproducao. **Este comportamento e de implementacao, nao garantido pelo spec.**
- Em Safari antigo (iOS 13.x) e AudioContext com muitas iteracoes (cortar 4 tiles/s por 5min =
  ~1200 OscillatorNodes), o grafo pode acumular nodes "parados mas nao desconectados".
- Cenario de risco: partida longa de 10 min, fases 1-10 sem parar, audio habilitado.
  Cada tile cortado = 1 `cut()` = 1 par osc+gain. 10min x 4 tiles/s = 2400 nodes.
  Em Safari iOS 13, isso pode causar degradacao gradual de audio ou consumo de memoria.

**Correcao sugerida**: adicionar `osc.addEventListener('ended', () => { osc.disconnect(); gain.disconnect(); })` em `playTone()`:

```ts
osc.connect(gain).connect(ctx.destination);
osc.start(start);
osc.stop(start + dur);
osc.addEventListener('ended', () => {
  osc.disconnect();
  gain.disconnect();
});
```

O evento `ended` e disparado garantidamente apos `stop()` (spec § 3.10). Sem custo de performance.

**Severidade**: P1 — afeta potencialmente o publico iOS em sessoes longas. Para navegadores
modernos desktop e pratica comum omitir `disconnect()` (o GC cuida), mas para o target do jogo
(iOS Safari no tablet dos 40-70 anos) e relevante.

---

### P1-02 — AudioContext criado na TitleScene antes do tap em JOGAR: primeiro SFX no GameScene pode falhar em mobile Safari

**Arquivo**: `jogo/src/scenes/TitleScene.ts:17-18` e `jogo/src/audio/SfxPlayer.ts:26-41`

```ts
// TitleScene.create():
sfx.setMuted(!getSettings().soundEnabled);  // linha 18 — nao cria context

// SfxPlayer.ensureContext():
if (this.ctx) {
  if (this.ctx.state === 'suspended') {
    this.ctx.resume().catch(() => {});  // sem await
  }
  return this.ctx;
}
// ctx so e criado na primeira chamada de playTone() (dentro de um evento de usuario)
```

**Analise do fluxo em mobile Safari:**

1. Usuario abre o jogo → TitleScene.create() roda. `sfx.setMuted()` nao cria AudioContext. OK.
2. Usuario toca em JOGAR (user gesture) → `this.scene.start('GameScene')`. **Nenhum SFX e tocado aqui.**
3. O tap em JOGAR e o user gesture do browser. O AudioContext poderia ser criado AQUI com seguranca.
4. GameScene.init() roda — `sfx.setMuted(false)`. Ainda sem context.
5. GameScene.create() roda. Ainda sem SFX.
6. Primeiro tile cortado: `sfx.cut()` → `playTone()` → `ensureContext()`.
7. `ensureContext()` chama `new AudioContext()` — **mas neste momento o user gesture ja ocorreu ha varios frames!**

Em Chrome e Firefox, o AudioContext criado logo apos um user gesture (mesmo alguns frames depois)
e aceito como "triggered by user gesture" porque o browser mantem um "activation stack" por
alguns segundos. **Em Safari iOS <= 16.x, o comportamento e mais restritivo**: o AudioContext
DEVE ser criado diretamente no handler do evento (ou dentro de uma microtask/Promise do handler).
Se o `new AudioContext()` ocorrer no proximo frame de jogo (400ms+ apos o tap), Safari pode
criar o context em estado `suspended`.

`ensureContext()` verifica `ctx.state === 'suspended'` e chama `ctx.resume()` — **sem await**.
Isso significa que se o context estiver suspended, `resume()` e uma Promise que pode nao
resolver antes do proximo `playTone()`. O primeiro SFX em GameScene sera perdido.

**Impacto real**: o SFX de cut (o mais frequente) pode ser silenciado no primeiro tile depois
de entrar no jogo via JOGAR. Subsequentes funcionam porque o context ja foi resumed.

**Mitigacao possivel**: tocar um SFX silencioso (volume 0) no handler do botao JOGAR para
criar e desbloquear o AudioContext enquanto o user gesture ainda esta no stack:

```ts
// TitleScene.ts, handler do startButton:
startButton.on('pointerdown', () => {
  sfx.prime(); // novo metodo: cria e resume o context se possivel
  this.scene.start('GameScene', { levelIndex: 0 });
});
```

```ts
// SfxPlayer.ts:
prime(): void {
  const ctx = this.ensureContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
```

Alternativamente, o tap nos seletores de fase (1-10) na TitleScene tambem e um user gesture —
mas o tap em JOGAR nao dispara nenhum SFX atualmente.

**Nota**: em desktop (Chrome, Firefox, Edge), o context e desbloqueado pela primeira interacao
com o documento (nao precisa ser o mesmo handler). O problema e **especifico para mobile Safari
e Chrome for iOS**.

**Severidade**: P1 — o publico alvo usa tablets iOS. O primeiro SFX no GameScene pode falhar.

---

### P2-01 — resume() chamado sem await: race condition em context suspended

**Arquivo**: `jogo/src/audio/SfxPlayer.ts:28-30`

```ts
if (this.ctx.state === 'suspended') {
  this.ctx.resume().catch(() => {});  // sem await
}
return this.ctx;  // retorna o ctx ainda suspended
```

`ensureContext()` retorna o `ctx` imediatamente apos iniciar `resume()`, antes que a Promise
resolva. Se o contexto estiver suspended e `resume()` demorar (ex: iOS com throttling de audio),
o `playTone()` subsequente chamara `osc.start()` em um contexto ainda suspenso. O Web Audio
spec diz que nodes criados em um contexto suspenso nao reproduzem som ate o context ser resumed.

Para SFX de 50-200ms, se o context demorar >50ms para resumed, o SFX pode ser perdido
(o oscilador ja parou quando o context comecar a reproduzir).

**Correcao sugerida**: tornar `playTone()` async ou enfileirar o playTone em uma callback de resume:

```ts
private ensureContext(): AudioContext | undefined {
  // ...
  if (this.ctx.state === 'suspended') {
    this.ctx.resume().then(() => {
      // context ready — chamada ja foi passada adiante, proximo SFX funciona
    }).catch(() => {});
  }
  return this.ctx;
}
```

Alternativamente (mais robusto):

```ts
private async playToneAsync(...): Promise<void> {
  const ctx = this.ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
  // ... criar osc, gain, start
}
```

Porem, tornar publicos como `cut()`, `penaltyFlowers()` etc. async alteraria a interface publica.
A solucao pragmatica: o `resume()` sem await e aceitavel para SFX de ~100ms+, mas documentar
que o primeiro SFX apos unlock pode ser perdido.

**Severidade**: P2 — impacto real baixo para SFX longos, mas pode silenciar `sfx.cut()` (50ms).

---

### P2-02 — Toggle SOM na TitleScene: botoes nao tem tamanho de tap target garantido de 44x44pt

**Arquivo**: `jogo/src/scenes/TitleScene.ts:61, 77`

```ts
// eyeStrainButton: x = GAME_WIDTH/2 - 200 = 440, y = GAME_HEIGHT/2 + 110 = 470
// soundButton:     x = GAME_WIDTH/2 + 200 = 840, y = GAME_HEIGHT/2 + 110 = 470
// padding: { x: 20, y: 12 }, fontSize: 24px
```

Texto "SOM: LIGADO" em Arial Black 24px com padding 20x12 produz um botao de aproximadamente:
- Largura: ~190px (texto ~150px + 40px de padding)
- Altura: ~24px (linha de texto) + 24px (padding vertical total) = ~48px

O tamanho de tap target e adequado em altura (~48px > 44pt iOS HIG). Porem, a **distancia
entre os dois botoes** (olhos cansados e som) e de 400px entre centros, com texto de ~190px
cada. Espacamento entre bordas: ~400 - 190 = ~210px. Sem overlap.

Mas o botao OLHOS CANSADOS tem texto mais longo: "OLHOS CANSADOS: DESLIGADO" em 24px.
Estimativa: ~320px de largura. Com centro em 440px: borda direita em 440+160=600px.
Botao SOM: centro em 840px, borda esquerda em 840-95=745px. Espacamento: 745-600=145px. OK.

**Porem**: em dispositivos com GAME_WIDTH < 840px (Portrait mobile, 375px iPhone SE com FIT),
o Scale FIT vai redimensionar tudo. Os botoes ficam menores. A separacao de 400px de canvas
vira 400 x (375/1280) ≈ 117px de separacao de tela — ainda aceitavel, mas proximos.

**Severidade**: P2 — sem sobreposicao confirmada, mas margem apertada em mobile portrait com
escala reduzida. O publico 40-70 com dedos maiores pode ter dificuldade.

---

### P2-03 — Toggle SOM menor que botao JOGAR: hierarquia visual inconsistente mas funcional

**Arquivo**: `jogo/src/scenes/TitleScene.ts:38-43, 77-82`

```ts
// JOGAR: fontSize '40px', padding { x:40, y:20 }
// SOM:   fontSize '24px', padding { x:20, y:12 }
```

O botao JOGAR e notavelmente maior e tem animacao de pulsacao (alpha 0.7 yoyo). Os toggles
sao menores e estaticos. Para descobribilidade, isso e bom — JOGAR e a acao principal.
Porem, a diferenca de 40px vs 24px e grande; usuarios menos familiarizados com UI de jogos
podem nao notar os toggles ao primeiro olhar.

**Nota positiva**: os toggles mostram estado (LIGADO/DESLIGADO em texto + cor de fundo).
Isso e bom para acessibilidade.

**Recomendacao (P2)**: aumentar fonte dos toggles para 28px ou adicionar subtitulo acima deles
("OPCOES:") para melhorar descobribilidade. Nao critico.

**Severidade**: P2 (UX/descobribilidade).

---

### P2-04 — webkitAudioContext fallback: cast pode falhar em TypeScript strict mode

**Arquivo**: `jogo/src/audio/SfxPlayer.ts:33-35`

```ts
const Ctor = window.AudioContext ??
  (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
```

O cast `as unknown as { webkitAudioContext?: typeof AudioContext }` e o padrao correto para
acessar APIs prefixadas em TypeScript. O uso de `??` (nullish coalescing) e correto — so usa
o fallback se `window.AudioContext` for `null` ou `undefined`.

**Porem**: `webkitAudioContext` em Safari antigo (iOS <= 9, nao ha suporte na App Store atual)
retorna um construtor com assinatura diferente de `typeof AudioContext`. Em Safari iOS 14.x+,
`window.AudioContext` (sem prefixo) ja esta disponivel. O fallback e apenas para Safari muito
antigo ou Chrome antigo em Android.

**Verificacao**: `typeof AudioContext` como tipo do construtor e correto — `webkitAudioContext`
expoe a mesma interface. O cast nao causa runtime error.

**Status**: implementacao correta. Documentado.

**Severidade**: P2 (informativo — sem bug, mas mereceu analise).

---

### P2-05 — Volumes: penaltyStone (0.20) com square wave pode soar agressivo para publico 40-70

**Arquivo**: `jogo/src/audio/SfxPlayer.ts:93-95`

```ts
penaltyStone(): void {
  this.playTone(90, 220, 'square', 0.20);   // volume 0.20
  this.playTone(60, 250, 'sawtooth', 0.10, 60);
}
```

Square wave a 90Hz com volume 0.20 produz um som grave e percussivo. Para o publico 40-70
anos com reducao de audicao na faixa de altas frequencias (tipico de presbiacusia), sons graves
sao melhor percebidos. **Este SFX esta bem calibrado para o publico alvo** — grave, curto, e
distinguivel.

`fuelPickup` com 3 sines ascendentes (C5-E5-G5) e volume 0.20 no G5 final: sine wave e a mais
suave. Nao agressivo.

`levelClear` com 4 squares e volume 0.16: square em frequencias 440-880Hz pode soar agressivo
em caixas de som de tablet. O envelope `exponentialRampToValueAtTime(0.001, start + dur)` ja
faz o decay. Aceitavel.

**Consideracao**: o `gameOver` usa `sawtooth` em 110Hz com volume 0.12. Sawtooth e a mais rica
em harmonicos. Em tablets com caixas de som pequenas (distorcao em volumes altos), 110Hz
sawtooth pode soar "quebrado". Mas volume 0.12 e conservador.

**Recomendacao (P2)**: nenhuma mudanca critica. Se o playtesting indicar que `levelClear` soa
duro, reduzir de 0.16 para 0.12 e mudar `square` para `triangle` para as notas agudas (659, 880Hz).

**Severidade**: P2 (design/tuning).

---

### P3-01 — Resolucao de invariantes herdados do G5: depth de centerMessage

**Arquivo**: `jogo/src/scenes/GameScene.ts:629, 659`

```ts
// onLevelClear:
this.centerMessage.setDepth(2002);  // linha 630

// triggerGameOver:
this.centerMessage.setDepth(2002);  // linha 660
```

O P1-01 do G5 (centerMessage em depth 2000 < D-pad arrows em depth 2001) foi **corrigido neste
commit**: centerMessage agora e depth 2002, acima do D-pad arrows (2001) e rects (2000).
Invariante restaurado. Positivo.

**Severidade**: P3 (informativo — fix herdado confirmado).

---

### P3-02 — Listeners globais no GameScene: nenhum listener de audio interfere com pointerdown

**Arquivo**: `jogo/src/scenes/GameScene.ts:214-239`

Conforme previsto no handoff G5 (item 1 dos sinais de regressao), o `sfx.*` nao registra
listeners no input manager do Phaser nem no DOM. SfxPlayer e stateless do ponto de vista de
eventos — apenas cria nodes de Web Audio quando chamado. O filtro `currentlyOver` permanece
intacto.

**Severidade**: P3 (verificacao positiva — sem regressao).

---

### P3-03 — Toggle SOM nao e interativo durante GameScene: sem conflito com advancing flag

**Arquivo**: `jogo/src/scenes/TitleScene.ts` e `jogo/src/scenes/GameScene.ts`

O botao SOM existe apenas na TitleScene. GameScene nao tem HUD button de som. O aviso do
handoff G5 (item 2: "HUD buttons aparecem em currentlyOver e podem bloquear tap-to-move")
nao se aplica aqui — **design correto de colocar o toggle apenas no title**.

**Severidade**: P3 (verificacao positiva).

---

### P3-04 — Primeira chamada sfx.cut() apos spawn do player nao ocorre (tile inicial e CUT via cutTileAt direto)

**Arquivo**: `jogo/src/scenes/GameScene.ts:270-272`

```ts
if (this.level.tiles[this.playerTileY][this.playerTileX] === TILE.TALL) {
  this.cutTileAt(this.playerTileX, this.playerTileY);
  // sfx.cut() NAO e chamado aqui — chamado apenas em onEnterTile
}
```

`cutTileAt` e chamado diretamente (sem `sfx.cut()`). O SFX de cut so e disparado em
`onEnterTile`. Isso significa que se o tile inicial for TALL, ele e cortado silenciosamente
no spawn. **E comportamento intencional** (nao seria bom ter SFX no spawn antes do player
interagir), mas deveria estar documentado.

**Severidade**: P3 (comportamento intencional, sem bug).

---

### P3-05 — Possível problema com `onPickupFuel`: sfx.fuelPickup() chamado ANTES de scheduleFuelSpawn()

**Arquivo**: `jogo/src/scenes/GameScene.ts:588-596`

```ts
private onPickupFuel(): void {
  if (!this.fuelBarrel) return;
  this.fuel = FUEL_MAX;
  this.updateFuelBar();
  this.fuelBarrel.tween.stop();
  this.fuelBarrel.sprite.destroy();
  this.fuelBarrel = undefined;
  this.scheduleFuelSpawn();  // apos limpar o barrel
  sfx.fuelPickup();           // DEPOIS de scheduleFuelSpawn
}
```

A ordem e: limpar barrel → agendar proximo spawn → tocar SFX. O SFX e disparado por ultimo.
Isso e inofensivo — `sfx.fuelPickup()` e sincrono (agenda notes no AudioContext scheduler) e
nao interfere com o Phaser timer. Sem bug.

**Nota**: em `onLevelClear()`, `sfx.levelClear()` e chamado ANTES de criar o centerMessage
(linha 612 vs 617). Isso e correto — o SFX inicia e o texto aparece simultaneamente do ponto
de vista do usuario.

**Severidade**: P3 (informativo — sem bug).

---

## Verificacao de invariantes G5

| Invariante | Status |
|---|---|
| `STORAGE_KEY = 'gentileza:settings'` | OK — nao alterado |
| `DEFAULT_SETTINGS` inclui novo campo `soundEnabled: true` | OK — spread mantido |
| `getSettings()` retorna `{ ...DEFAULT_SETTINGS, ...parsed }` | OK — nao alterado |
| `saveSettings()` silencioso em falha | OK — nao alterado |
| `toggleSound()` le + salva + retorna novo estado | OK — implementado corretamente |
| `this.vs` lido em `init()`, nao em `create()` | OK — `sfx.setMuted` tambem em `init()` |
| D-pad 4 botoes sempre visiveis | OK — G6 nao alterou D-pad |
| D-pad depth rects=2000, arrows=2001 | OK — nao alterado |
| `centerMessage.setDepth(2002)` (correcao P1-01 G5) | CORRIGIDO neste commit |
| SHUTDOWN remove listeners globais | OK — SfxPlayer nao adiciona listeners |
| `advancing` flag em init(), advanceLevel(), restartLevel() | OK — nao alterado |
| Camera `startFollow(player, false, 0.1, 0)` sem offset | OK — nao alterado |

---

## Resumo por severidade

| ID | Severidade | Descricao |
|---|---|---|
| P1-01 | P1 | OscillatorNode sem disconnect() — potencial acumulo em Safari iOS em sessoes longas |
| P1-02 | P1 | AudioContext criado apos user gesture: primeiro SFX no GameScene pode falhar em mobile Safari |
| P2-01 | P2 | resume() sem await: SFX pode ser perdido se context ainda suspended |
| P2-02 | P2 | Tamanho de tap target dos toggles pode ser apertado em mobile portrait com FIT |
| P2-03 | P2 | Toggles menores que JOGAR — descobribilidade reduzida para publico 40-70 |
| P2-04 | P2 | webkitAudioContext cast — correto, documentado |
| P2-05 | P2 | Volumes/timbres: aceitaveis, mas levelClear (square 880Hz) pode soar duro em tablet |
| P3-01 | P3 (fix) | centerMessage depth 2002 — P1-01 do G5 resolvido neste commit |
| P3-02 | P3 | Sem interferencia de audio com input handler — verificacao positiva |
| P3-03 | P3 | Toggle SOM so na TitleScene — sem conflito com advancing flag |
| P3-04 | P3 | cutTileAt no spawn: sem sfx.cut() — intencional |
| P3-05 | P3 | Ordem sfx.fuelPickup() vs scheduleFuelSpawn — inofensivo |

**Bugs a corrigir antes de producao**: P1-01 (disconnect), P1-02 (prime() antes de JOGAR).
**UX a melhorar (opcional)**: P2-01 (await resume), P2-03 (descobribilidade do toggle).
**Bugs herdados do G5 ainda abertos**: P1-03 (DOWN button margem 5px), P2-02 (aviso timing toggle olhos cansados), P2-03 (barra fuel nao escala), P2-04 (D-pad sobrepoe tiles).
