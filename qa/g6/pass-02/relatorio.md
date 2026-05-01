# QA G6 pass-02 - Relatorio de Revisao

**Sprint**: G6 - Audio SFX sintetizado via Web Audio API + toggle de som
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G6 pass-02
**HEAD analisado**: ad71970 (G7.5 WebView no app + nickname via URL param)
**Commits revisados nesta rodada**:
- aa2633a (G6 base - ja revisado em pass-01)
- 67bb45f (qa-fixes round-3 - fechamento de P1-01 e P1-02 do pass-01)
- Pos-G6: 9d87925, a03405c, bc810e6, 67b06cd, 6f3b89a, ad71970

**Arquivos focais**: jogo/src/audio/SfxPlayer.ts, jogo/src/config/Settings.ts, jogo/src/scenes/GameScene.ts, jogo/src/scenes/TitleScene.ts, jogo/src/scenes/RankingScene.ts, jogo/src/main.ts, jogo/src/ui/SubmitModal.ts
**Build validado**: nao (analise estatica, permissao de shell para npm run build indisponivel)

---

## Cobertura

| Area | Metodo |
|---|---|
| Fechamento P1-01 (osc.disconnect / gain.disconnect) | git show 67bb45f + leitura HEAD |
| Fechamento P1-02 (sfx.prime no user gesture) | git show 67bb45f + cobertura dos 3 botoes |
| Status P2-01 (resume sem await) | Releitura logica + impacto pratico apos prime() |
| AudioContext lazy via ensureContext() | Releitura SfxPlayer.ts:36-51 |
| Fallback webkitAudioContext via cast TS | SfxPlayer.ts:44 |
| Singleton sfx exportado | grep de instancias |
| setMuted() guard antes de criar nodes | SfxPlayer.ts:68 |
| 6 pontos de disparo no GameScene | grep + leitura linha por linha |
| Sequencia toggle SOM | TitleScene.ts:91-97 |
| Regressoes G7/G7.5/G8 | git diff 67bb45f..HEAD em paths relevantes |
| sfx.prime() em todos os botoes que iniciam audio context | TitleScene.ts:60, 121, 141 |

---

## Status dos achados do pass-01

| ID pass-01 | Severidade | Status pass-02 | Justificativa |
|---|---|---|---|
| P1-01 | P1 | FECHADO | qa-fixes round-3 (67bb45f) adicionou osc.addEventListener('ended', () => { osc.disconnect(); gain.disconnect() }) em playTone() com try/catch - SfxPlayer.ts:90-97 |
| P1-02 | P1 | FECHADO | qa-fixes round-3 adicionou metodo prime() em SfxPlayer e o invoca em todos os 3 caminhos de saida da TitleScene (JOGAR, selectors 1-10, RANKING) |
| P2-01 | P2 | MITIGADO (downgrade pra P3 efetivo) | Continua sem await, mas prime() cria context dentro do user gesture; quando o primeiro playTone() roda no GameScene, o context ja foi criado ha varios frames e o resume() ja resolveu na maioria dos browsers. Risco residual restrito a iOS Safari muito antigo |
| P2-02 | P2 | ABERTO | UX descobribilidade dos toggles nao foi alterada; aceito como trade-off no HANDOFF |
| P2-03 (UX) | P2 | ABERTO | Hierarquia visual segue como em G6 |
| P2-04 (cast) | P2 | OK informativo | Cast continua correto, sem mudancas |
| P2-05 (timbre) | P2 | ABERTO/aceitavel | Sem playtesting reportado |

---

## Achados desta rodada

### P3-G6-01 - sfx.prime() nao e chamado nos toggles SOM/OLHOS CANSADOS da TitleScene

**Arquivo**: jogo/src/scenes/TitleScene.ts:75-78, 91-97

O sfx.prime() foi adicionado em JOGAR (60), selectors (121) e RANKING (141). O toggle SOM nao chama prime() antes do sfx.fuelPickup() de feedback, MAS isso nao e bug: o handler do toggle SOM ja toca SFX no proprio handler (sfx.fuelPickup()), entao ensureContext() roda DENTRO do user gesture. Diferente de JOGAR/selectors/RANKING que iniciam outra scene e so tocam SFX varios frames depois.

**Severidade**: P3 (informativo/nao-bug). Documentado pra clareza.

### P3-G6-02 - RankingScene chama sfx.setMuted no create() porem nao dispara SFX

**Arquivo**: jogo/src/scenes/RankingScene.ts:19

setMuted aqui e defensivo. Inofensivo, redundante (TitleScene/GameScene tambem chamam ao entrar). Sem acao recomendada.

**Severidade**: P3 (informativo).

### P3-G6-03 - adoptNicknameFromUrl() em main.ts nao toca audio

Sem AudioContext em module-load. Sem regressao G7.5.

**Severidade**: P3 (verificacao positiva).

### P3-G6-04 - SubmitModal HTML overlay nao toca SFX

Modal abre apos sfx.levelClear()/gameOver() ja terem disparado. submitModalOpen flag bloqueia handlers do canvas mas nao SFX em curso (oscilador ja agendado no scheduler). Comportamento esperado.

**Severidade**: P3 (verificacao positiva - sem regressao G8).

### P3-G6-05 - RankingScene VOLTAR/Esc nao chama prime()

Voltar pro Title nao toca audio. Context ja foi criado pelo prime() do botao RANKING. Sem problema.

**Severidade**: P3 (verificacao positiva).

### P3-G6-06 - submitModalOpen nao causa leak de muted state

TitleScene/RankingScene re-sincronizam muted no proprio create() ao receber o scene.start. Sem leak.

**Severidade**: P3 (verificacao positiva).

---

## Verificacao de invariantes G6

Todos os invariantes do pass-01 seguem validos no HEAD ad71970:
- Singleton sfx unico (3 imports: TitleScene, GameScene, RankingScene)
- AudioContext lazy, nunca em module-load
- Fallback webkitAudioContext via cast TS correto
- ctx.resume() se suspended (sem await; mitigado por prime())
- osc/gain.disconnect() apos 'ended' (CORRIGIDO em 67bb45f)
- setMuted guard em playTone() antes de ensureContext()
- Settings.soundEnabled default true
- sfx.setMuted em GameScene.init() linha 150, TitleScene.create() linha 19, RankingScene.create() linha 19
- 6 pontos de disparo: cut(501), penaltyFlowers(508), penaltyStone(515), fuelPickup(614), levelClear(630), gameOver(662)
- Sequencia toggle SOM: setMuted antes de fuelPickup
- sfx.prime() em JOGAR(60), selectors(121), RANKING(141)
- Skip penaltyFlowers/Stone se gameOver disparou (qa-fixes round-3)

`git diff 67bb45f..HEAD jogo/src/audio/ jogo/src/config/Settings.ts` retornou VAZIO.

---

## Resumo por severidade

P0=0, P1=0, P2=0 (novos), P3=6 (verificacoes positivas/informativos).

Conclusao: G6 esta LIMPO no HEAD. P1-01 e P1-02 do pass-01 fechados em qa-fixes round-3. Sem regressoes em G7/G7.5/G8.

---

## Gaps remanescentes

- [ ] Build TypeScript nao executado (mesma limitacao do pass-01)
- [ ] Validacao em iOS Safari real apos qa-fixes round-3 (Web Inspector + sessao 5min+)
- [ ] Toggle SOM como primeira interacao em iOS Safari (P3-G6-01)
- [ ] Teste de mute mid-SFX (esperado: SFX em curso termina)
- [ ] WebView do React Native expoe Web Audio? (G7.5 colocou jogo dentro do app)
