# QA G8 pass-01 - Relatorio de Revisao

**Sprint**: G8 - Frontend ranking (submit modal + tela top 50 + cache nickname)
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G8 pass-01
**HEAD / Commit principal G8**: 67b06cd
**HEAD analisado**: ad71970
**Commits revisados**: 67b06cd (G8 principal - diff contra a03405c)
**Build validado**: nao (analise estatica)

**Arquivos alterados**:
- jogo/src/config/Constants.ts (NOVO)
- jogo/src/config/GameConfig.ts (refatorado pra re-export)
- jogo/src/types/Ranking.ts (NOVO)
- jogo/src/api/RankingApi.ts (NOVO)
- jogo/src/state/RunStats.ts (NOVO)
- jogo/src/ui/SubmitModal.ts (NOVO)
- jogo/src/scenes/RankingScene.ts (NOVO)
- jogo/src/scenes/GameScene.ts
- jogo/src/scenes/TitleScene.ts
- jogo/index.html (CSS do modal)
- jogo/src/main.ts (chama adoptNicknameFromUrl)

---

## Cobertura

| Area | Metodo |
|---|---|
| Constants.ts isolamento (zero imports de scenes) | Leitura completa |
| GameConfig re-export pra compat | Leitura completa |
| Ranking.ts: contrato com backend G7 (regex, range) | Comparacao vs backend/app/models.py |
| RankingApi: kinds de erro | Leitura linha a linha |
| RunStats singleton: startRun, enterLevel, recordCut, endRun, isRankingEligible | Leitura + analise de fluxo |
| RunStats.buildSubmitPayload: clamp pct=100 com level<10 | Comparacao vs backend/app/validation.py |
| RunStats.adoptNicknameFromUrl: parse + regex | Leitura completa |
| SubmitModal: regex client-side, auto-uppercase, ENVIAR disabled | Leitura completa |
| SubmitModal: cache localStorage | Leitura completa |
| SubmitModal: HTML overlay vs Phaser | Inspecao DOM |
| SubmitModal: CSS landscape mobile, teclado virtual | Leitura CSS index.html |
| GameScene.openSubmitModal: trigger em level10 clear + game over | Analise de fluxo |
| GameScene.submitModalOpen flag bloqueia handlers | Leitura completa |
| TitleScene: botao RANKING + colisao com toggles existentes | Calculo manual de coordenadas |
| TitleScene: startRun em JOGAR (practice false) e selector (practice true) | Leitura completa |
| RankingScene: render top 50, retry em erro | Leitura completa |
| RankingScene: lifecycle / race com fetch on shutdown | Analise estatica |
| Backend contrato: pydantic + validate_plausible | Leitura backend/app/validation.py + models.py |
| Regressao G5/G6: depth, advancing flag, sfx.prime | Diff GameScene/TitleScene |

---

## Achados

### P1-G8-01 - cutsByLevel acumula entre retries do mesmo nivel; permite inflar total_pct ate 99% sem progredir

**Arquivos**:
- jogo/src/state/RunStats.ts:43-47 (recordCut sem reset por level)
- jogo/src/scenes/GameScene.ts:528-537 (cutTileAt -> recordCut)
- jogo/src/scenes/GameScene.ts:724-728 (restartLevel via scene.restart sem endRun nem reset de cuts)

```ts
// state/RunStats.ts:43
export function recordCut(levelIndex: number): void {
  if (!current.active) return;
  if (levelIndex < 0 || levelIndex >= LEVELS_TOTAL) return;
  current.cutsByLevel[levelIndex] += 1;  // sempre incrementa, sem reset
}

// scenes/GameScene.ts:724
private restartLevel(): void {
  if (this.advancing) return;
  this.advancing = true;
  this.scene.restart({ levelIndex: this.levelIndex });
  // nao chama endRun() nem reseta cutsByLevel[levelIndex]
}
```

Cenario reproducivel:
1. Jogador entra em fase 1 (target = N tiles tall)
2. Corta 10 tiles, morre (combustivel zero ou pisa repetidamente em pedra)
3. Aperta ESPACO -> restartLevel -> scene.restart -> init() -> create() -> enterLevel(0)
4. enterLevel so atualiza highestLevel, nao mexe em cutsByLevel
5. Corta 10 tiles de novo (nas mesmas posicoes - level e deep-copy intacto), morre
6. Repete N vezes. cutsByLevel[0] cresce ilimitadamente

Em buildSubmitPayload (state/RunStats.ts:62-68):

```ts
const totalCuts = current.cutsByLevel.reduce((s, c) => s + c, 0);
let pct = totalTarget > 0 ? Math.round((totalCuts / totalTarget) * 100) : 0;
pct = Math.max(0, Math.min(100, pct));
if (current.highestLevel < 10 && pct >= 100) pct = 99;
```

totalCuts pode exceder totalTarget, fazendo pct chegar a 100, depois clampado a 99 quando highestLevel<10. Resultado: jogador submete level_reached=1, total_pct=99 farmando mortes na fase 1 sem nunca completa-la.

Ranking ordena por level_reached DESC, total_pct DESC, time_seconds ASC. Player que zerou ate fase 5 honestamente com 60% real fica abaixo de player com fase 5 + 99% inflado.

**Severidade**: P1 - exploit de ranking publico facil de descobrir. Backend nao detecta porque nao tem estado de runs por player.

**Correcao sugerida**: em enterLevel, resetar cutsByLevel[levelIndex] = 0:

```ts
export function enterLevel(levelIndex: number): void {
  if (!current.active) return;
  current.cutsByLevel[levelIndex] = 0;  // reseta cuts dessa fase a cada entrada
  const reached = levelIndex + 1;
  if (reached > current.highestLevel) current.highestLevel = reached;
}
```

### P1-G8-02 - RankingScene.create() -> loadAndRender() async sem cancelamento ao SHUTDOWN: setText/add em GameObject destruido

**Arquivo**: jogo/src/scenes/RankingScene.ts:56-91

Cenario:
1. Usuario entra em RankingScene (CARREGANDO aparece)
2. Usuario clica < VOLTAR antes do fetch resolver -> scene.start('TitleScene') -> SHUTDOWN do RankingScene
3. Fetch resolve -> tenta `this.statusText.setText(...)` ou `this.add.text(...)` em scene destruida
4. Phaser: setText em destroyed Text emite warning; this.add.text em scene shutdown pode lancar (this.systems indefinido) ou criar text fantasma com listener leak

**Correcao sugerida**: flag de scene viva + check apos await:

```ts
private alive = true;

create(): void {
  this.alive = true;
  // ...
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.alive = false; });
  void this.loadAndRender();
}

private async loadAndRender() {
  // ...
  try {
    const data = await getTopScores(50);
    if (!this.alive) return;
    // ...
  } catch (e) {
    if (!this.alive) return;
    // ...
  }
}
```

**Severidade**: P1 - fluxo natural (rede lenta + back impaciente). Console error / leak de listener no retryBtn fantasma.

### P1-G8-03 - RankingScene exibe "TOP 50" mas so renderiza 13 linhas; demais ficam como "+ N mais..."

**Arquivo**: jogo/src/scenes/RankingScene.ts:21-27, 122-150

```ts
this.add.text(GAME_WIDTH / 2, 60, 'RANKING - TOP 50', {...});  // titulo promete 50
// ...
const visibleRows = Math.min(scores.length, 13);  // corta em 13
if (scores.length > visibleRows) {
  // texto "+ N mais..."
}
```

Calculo: startY=140 + headers + 13 rows * 40 = 700px. GAME_HEIGHT=720, entao 14a linha sai do canvas. Limitar em 13 e correto pra evitar overflow sem scroll, mas titulo e enganoso.

Tampouco existe scroll nem paginacao. Player que ficou em posicao 14+ NAO ve seu nome no ranking, mesmo o backend retornando os 50.

**Severidade**: P1 - funcionalidade central da feature (ver onde voce esta no ranking) quebra apos posicao 13.

**Correcao sugerida**: limitar `getTopScores(13)`, mudar titulo pra "RANKING - TOP 13", remover badge "+ N mais...". Ou implementar scroll vertical.

### P1-G8-04 - submitScore sem timeout: usuario pode ficar preso em "ENVIANDO..." indefinidamente

**Arquivo**: jogo/src/api/RankingApi.ts:24-37

fetch nativo nao tem timeout default. Em rede ruim (mobile 3G perdendo sinal apos enviar request mas antes de receber response), o await pendura por minutos.

Em SubmitModal.ts:82-107, durante o await:
- sendBtn.disabled = true; sendBtn.textContent = 'ENVIANDO...'
- skipBtn.disabled = true
- Modal fica preso. Usuario nao tem botao de cancelar. Nao consegue nem PULAR. Unica saida: fechar a aba.

**Correcao sugerida**: AbortController com 10-15s timeout em submitScore e getTopScores:

```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
try {
  res = await fetch(..., { signal: controller.signal });
} catch (e) {
  throw new RankingApiError('network', 'Sem conexao com o servidor');
} finally {
  clearTimeout(timeoutId);
}
```

**Severidade**: P1 - em mobile 3G/4G instavel (publico-alvo 40-70 mobile-first), submit pode travar sem feedback.

### P2-G8-01 - Modal nao tem cancelamento por ESC

**Arquivo**: jogo/src/ui/SubmitModal.ts:65-71

Convencao web: ESC fecha modal. Aqui ESC nao fecha. O keyboard handler do Phaser pra ESC esta gated por submitModalOpen (GameScene:254-260) - entao ESC fica silencioso. Desktop user precisa usar mouse pra clicar PULAR.

`input.focus()` esta setado, entao keydown chega no input. Adicionar branch ESC que dispara `skipBtn.click()` resolve.

**Severidade**: P2 - UX moderna espera ESC. Mobile nao afetado.

### P2-G8-02 - restartLevel nao reseta startTimeMs: tempo de retries acumula em time_seconds

**Arquivo**: jogo/src/state/RunStats.ts:27-35 + jogo/src/scenes/GameScene.ts:724-728

`startTimeMs` e setado uma vez em startRun. Como restartLevel nao chama endRun nem reinicia o relogio, o `elapsedSec` acumula tempo gasto em retries.

Cenario: jogador morre 5x em fase 1 (gastou 2 minutos), entao zera ate fase 10. O time_seconds reportado inclui os 2 minutos de mortes. Como ranking ordena por time_seconds ASC (apos level e pct), o player honesto que morreu e retomou fica em desvantagem versus player que iniciou run nova so quando confiante.

Decisao de produto: time_seconds e tempo total da run (incluindo retries) ou so do percurso bem-sucedido? Se a primeira (provavelmente o caso), documentar em HANDOFF e fechar como nao-bug.

**Severidade**: P2 - comportamento ambiguo. Documentar a escolha em HANDOFF.

### P2-G8-03 - parseError em status 400 cai em kind 'server' (nao 'validation')

**Arquivo**: jogo/src/api/RankingApi.ts:11-22

Backend FastAPI retorna 422 pra Pydantic validation E pra validate_plausible falha. Mas se algum dia virar 400 (ex: body parse error em Pydantic v3), cai no catch-all 'server'. Acoplamento ao schema atual.

**Sugestao**: tratar todo 4xx (exceto 429) como 'validation', 5xx como 'server'.

**Severidade**: P2 - robustez do API client.

### P2-G8-04 - refreshValid em SubmitModal sobrescreve input.value durante digitacao: cursor pula pro fim

**Arquivo**: jogo/src/ui/SubmitModal.ts:55-60

Quando usuario edita no meio de uma string ja existente, `input.value = ...` em Chrome desktop e mobiles reposiciona cursor pro fim. autocapitalize="characters" resolve em mobile (soft keyboard impede minuscula). Em desktop a UX de edicao no meio quebra.

**Correcao**: salvar `selectionStart` antes do reassign e restaurar com `setSelectionRange`.

**Severidade**: P2 - desktop edition pain.

### P2-G8-05 - loadCachedNickname / saveCachedNickname usam try/catch silencioso: localStorage indisponivel em modo privado quebra cache sem feedback

**Arquivo**: jogo/src/state/RunStats.ts:83-95

Em iOS Safari modo privado, localStorage.setItem lanca QuotaExceededError. Silenciar e ok pra nao quebrar UX, mas usuario nao sabe que cache nao salvou. Em rejogo, perdeu nickname digitado.

**Severidade**: P2 - degradacao silenciosa.

### P2-G8-06 - RANKING button no Title nao protegido contra clique duplo durante transicao

**Arquivo**: jogo/src/scenes/TitleScene.ts:140-143

Falta de guard em RANKING (linha 140-143), JOGAR (linha 57-63) e selectors (linha 120-125). scene.start e idempotente em Phaser, mas dispara dois sfx.prime() e dois disparos de evento. Em GameScene usa-se flag advancing pra mesmo padrao. Inconsistencia.

**Severidade**: P2 - baixo impacto. Consistencia de codigo.

### P3-G8-01 - RANKING_API_URL hardcoded em Constants.ts: dev local sempre aponta pra prod

**Arquivo**: jogo/src/config/Constants.ts:21

Trade-off documentado em HANDOFF. Solucao zero-cost com Vite built-in:

```ts
export const RANKING_API_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : 'https://terra-gentil-game-production.up.railway.app';
```

**Severidade**: P3.

### P3-G8-02 - Submit Modal: input sem pattern HTML attribute; defesa em profundidade reduzida

**Arquivo**: jogo/src/ui/SubmitModal.ts:28-36

Faltam `pattern="[A-Z0-9_]{3,12}"` e `minlength="3"`. Hint pra autopreenchedores e acessibilidade.

**Severidade**: P3.

### P3-G8-03 - RankingScene.renderList recria GameObjects no retry: pode duplicar conteudo se loadAndRender for chamado em paralelo

**Arquivo**: jogo/src/scenes/RankingScene.ts:59-92

Clique duplo em retryBtn dispara duas chamadas simultaneas. Solucao: guard flag `this.loading`. Relacionado a P1-G8-02 - fix conjunto.

**Severidade**: P3.

### P3-G8-04 - Modal em landscape mobile com altura <= 350px (iPhone SE) + teclado virtual: pode ocultar botoes

**Arquivo**: jogo/index.html:61-160

submit-modal usa flex centralizado. Card max-width 480 sem max-height. Em iPhone SE landscape (568x320), teclado virtual rouba ~200px verticais. Body tem overflow: hidden.

Sugestao: `max-height: 90vh; overflow-y: auto` no `.submit-modal-card`.

**Severidade**: P3 - afeta minoria.

### P3-G8-05 - endRun() nao chamado em restartLevel() (intencional) - auditado e OK isoladamente

**Arquivo**: jogo/src/scenes/GameScene.ts:724-728 + state/RunStats.ts:57-59

Comentario em GameScene:707-710 explica o design. Verificado: invariante "run nao inicia sozinha" preservado. Combinado com P1-G8-01, este nao-fechamento amplifica o exploit. P1-G8-01 captura a raiz; este e contexto.

**Severidade**: nao e bug. Documentado por transparencia.

### P3-G8-06 - TitleScene RANKING button vs toggles: sem colisao visual

**Arquivo**: jogo/src/scenes/TitleScene.ts:66-98, 128-143

Verificacao manual: RANKING em (1240, 60), toggles em y=470, JOGAR em y=370. Sem sobreposicao. sfx.prime() chamado no RANKING button - invariante G6 preservado.

**Severidade**: nao e bug.

---

## Resumo

| Severidade | Total | IDs |
|---|---|---|
| P0 | 0 | - |
| P1 | 4 | P1-G8-01, P1-G8-02, P1-G8-03, P1-G8-04 |
| P2 | 6 | P2-G8-01, P2-G8-02, P2-G8-03, P2-G8-04, P2-G8-05, P2-G8-06 |
| P3 | 6 | P3-G8-01, P3-G8-02, P3-G8-03, P3-G8-04, P3-G8-05, P3-G8-06 |

Nao foi achada regressao em G5/G6: D-pad layout intacto, submitModalOpen flag bloqueia handlers corretamente, sfx.prime() mantido em todos os pontos de entrada, depth ordering preservado.

Contrato com backend G7 espelhado corretamente em types/Ranking.ts:1 (regex), state/RunStats.ts:67-73 (clamps de pct e time_seconds). Verificado vs backend/app/models.py:5-9 e backend/app/validation.py:6-15.
