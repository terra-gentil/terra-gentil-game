# Handoff G8 pass-01

---

## Para reverificacao desta sprint (G8 pass-02+)

### O que ja foi validado (analise estatica)

- [x] Constants.ts: zero imports de scenes (dep circular quebrada). RANKING_API_URL hardcoded
- [x] GameConfig.ts: re-exporta Constants pra compat de imports legados. Importa scenes (BootScene, TitleScene, GameScene, RankingScene) - registrado nas 4
- [x] types/Ranking.ts: NICKNAME_REGEX = /^[A-Z0-9_]{3,12}$/ casa exatamente backend/app/models.py:6 pattern=r"^[A-Z0-9_]{3,12}$". ScoreCreate, ScoreOut, TopResponse alinhados com backend
- [x] api/RankingApi.ts: RankingApiError com 4 kinds (network, rate_limit, validation, server). 429 -> rate_limit, 422 -> validation, demais -> server
- [x] state/RunStats.ts: singleton em modulo. startRun reseta tudo com practiceMode + startLevelIndex. enterLevel atualiza highestLevel sem decremento. recordCut incrementa cutsByLevel[idx]. endRun seta active=false. isRankingEligible = active && !practiceMode
- [x] state/RunStats.ts: buildSubmitPayload clampa pct=100 -> 99 quando highestLevel<10 (espelha validate_plausible.py:13-14). time_seconds clampa em [level*3, 36000]
- [x] state/RunStats.ts: adoptNicknameFromUrl le ?nickname= da URL, valida regex, salva no localStorage. Try/catch silencioso
- [x] ui/SubmitModal.ts: HTML overlay (div absoluto em body) com z-index 2000 - fora do canvas Phaser. CSS em index.html
- [x] ui/SubmitModal.ts: refreshValid faz toUpperCase em tempo real, valida com NICKNAME_REGEX, ENVIAR.disabled = !valid
- [x] ui/SubmitModal.ts: loadCachedNickname pre-popula input se cache existe. saveCachedNickname salva apos submit OK
- [x] ui/SubmitModal.ts: ENVIANDO... disabled em sendBtn + skipBtn durante await. Em erro, re-enable e mostra feedback
- [x] scenes/GameScene.ts: submitModalOpen flag checada antes de handlers (228, 250, 256, 374). Bloqueia input duplo no canvas enquanto modal aberto
- [x] scenes/GameScene.ts: enterLevel chamado em create() (linha 163), recordCut em cutTileAt (linha 532), endRun em onEscape, win+submit, win+skip e onSubmitted
- [x] scenes/GameScene.ts: openSubmitModal disparado em onLevelClear se isLast && isRankingEligible() (linha 650), e em triggerGameOver se isRankingEligible() (linha 684)
- [x] scenes/GameScene.ts: gameOver+skip deixa run viva (intencional, comentado em :707-710). Win+skip chama endRun + scene.start('TitleScene')
- [x] scenes/TitleScene.ts: JOGAR -> startRun({ practiceMode: false, startLevelIndex: 0 }). Selector 1-10 -> startRun({ practiceMode: true, startLevelIndex: i }). RANKING button -> scene.start('RankingScene') sem startRun
- [x] scenes/TitleScene.ts: RANKING button (1240, 60) - sem colisao com toggles (470, 470/640) ou JOGAR (640, 370)
- [x] scenes/TitleScene.ts: sfx.prime() chamado em todos os entry points (JOGAR, selectors, RANKING) - invariante G6 mantido
- [x] scenes/RankingScene.ts: registrada no GameConfig (linha 31). create() faz fetch, mostra CARREGANDO/erro/lista. Botao retry em erro reusa loadAndRender. < VOLTAR e ESC voltam pro Title
- [x] index.html: CSS .submit-modal-card etc. body overflow hidden, modal em z-index 2000 sobre canvas

### Gaps (pendente pra pass-02+)

- [ ] Build TypeScript nao executado (sandbox)
- [ ] Teste em iPhone Safari real: modal HTML em landscape com teclado virtual aberto. Confirmar P3-G8-04
- [ ] Teste de submit em rede instavel: simular fetch hang via Chrome DevTools throttling "Slow 3G" + offline. Confirmar P1-G8-04
- [ ] Teste de retry em RankingScene: clicar retry 2x rapido em sequencia. Confirmar P3-G8-03
- [ ] Teste de SHUTDOWN durante fetch: clicar < VOLTAR enquanto CARREGANDO. Confirmar P1-G8-02
- [ ] Teste de exploit P1-G8-01: morrer 30x em fase 1, retry, dar Esc pro Title quando atingir 99%, confirmar que submit propaga total_pct=99 com level_reached=1
- [ ] Teste de cursor jump: editar nickname em desktop Chrome no meio da string, verificar P2-G8-04
- [ ] Teste de modo privado iOS Safari: conferir P2-G8-05
- [ ] Teste de regressao mobile: D-pad ainda funcional em GameScene; toggles do Title ainda visiveis e clicaveis

---

## Para QA das proximas sprints (G9+)

### Invariantes estabelecidos pela G8 que nao podem ser quebrados

#### Constants.ts (jogo/src/config/Constants.ts)

- O arquivo NUNCA pode importar de scenes/, ui/, audio/, ou api/. So tipos e constantes primitivas.
- GameConfig.ts re-exporta GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, COLORS, RANKING_API_URL pra compat. Manter ate fim do projeto ou migrar todos imports pra '../config/Constants' direto.
- RANKING_API_URL hardcoded e trade-off documentado. Se G9+ precisar trocar a URL, preferir `import.meta.env.DEV` ternario sem `.env`.

#### Backend contract (types/Ranking.ts vs backend/app/)

| Constraint | Frontend | Backend |
|---|---|---|
| nickname regex | NICKNAME_REGEX = /^[A-Z0-9_]{3,12}$/ | pattern=r"^[A-Z0-9_]{3,12}$" |
| level_reached | range 1..10 | Field(..., ge=1, le=10) |
| total_pct | range 0..100, clamp 100->99 se level<10 | Field(..., ge=0, le=100) + validate_plausible:13-14 |
| time_seconds | range [level*3, 36000] | Field(..., ge=1, le=36000) + validate_plausible:7-12 |

Mismatches resultam em 422 ou em scores aceitos com dados inconsistentes.

#### RunStats singleton

- O singleton sobrevive scene.start (Phaser nao destroi modulos ESM). NAO migrar pra Phaser registry.
- startRun e a UNICA forma de iniciar uma run. Chamado so em TitleScene.
- enterLevel(idx) atualiza highestLevel monotonic. NAO faz reset de cutsByLevel - bug P1-G8-01. Se G9+ tocar nessa funcao, considerar incluir reset de cutsByLevel[idx].
- recordCut(idx) hoje incrementa sem dedup. P1-G8-01 propos tornar idempotente.
- endRun() apenas seta active=false. Nao limpa stats.
- isRankingEligible() retorna `active && !practiceMode`. G9+ NAO deve abrir SubmitModal se false.
- buildSubmitPayload tem clamps de pct e time_seconds. NAO remover sem rever validate_plausible.py simultaneamente.
- adoptNicknameFromUrl: invariante: se URL nao tem nickname valido, cache nao e tocado.

#### SubmitModal lifecycle

- Modal e DOM overlay (div absoluto em body), NAO Phaser. z-index 2000 cobre canvas.
- A flag GameScene.submitModalOpen DEVE ser checada por TODOS os handlers de input do canvas:
  - global pointerdown (228), keyboard SPACE/ENTER (250), keyboard ESC (256), D-pad rect pointerdown (374)
- Modal so e fechado por skipBtn ou sendBtn (apos OK ou erro).
- Modal NAO deve ser exibido em practice mode. isRankingEligible() controla isso.

#### RankingApiError contract

- 4 kinds: 'network' | 'rate_limit' | 'validation' | 'server'
- Hoje SubmitModal.ts mostra apenas e.message diretamente. Se G9+ quiser tratar diferente por kind, checar `e instanceof RankingApiError ? e.kind`.

#### Ordering do ranking (backend SQL)

Index e query ordenam por: level_reached DESC, total_pct DESC, time_seconds ASC, created_at ASC.

Se G9+ alterar a ordenacao, atualizar idx_scores_ranking, ORDER BY no main.py, e logica de Player que entra "antes" - frontend nao tem isso hoje.

---

### Sinais de regressao a monitorar em G9+

1. Se G9 substituir tilemap real: garantir que cutTileAt continua chamando recordCut(levelIndex), e que TILE.TALL ainda e o tile-alvo.
2. Se G9 adicionar sprite real do Gentileza: depth do player nao deve subir alem de 2002. Se subir, modal de submit fica atras.
3. Se G9 adicionar HUD novo: nao colidir com depth do D-pad (2000-2001) nem do center message (2002).
4. Se G9 adicionar mais scenes: registrar em GameConfig.ts:31. Lembrar que adicionar scene novo PODE re-introduzir dep circular se a scene importar de '../config/GameConfig' em vez de '../config/Constants' - usar Constants direto.
5. Se G9 adicionar power-ups que dao cuts gratis (ex: bomba que limpa area): garantir que cada cut chama recordCut UMA VEZ por tile. Caso contrario, P1-G8-01 fica pior.
6. Se G9 adicionar tela de pause durante gameplay: a flag submitModalOpen do GameScene assume que modal so abre em level cleared / game over. Recomenda-se flag separada (pauseOpen).
7. Se G9 trocar o backend: manter paridade do regex e clamps. Updates simultaneos.
8. Se G9 adicionar autenticacao no app: adoptNicknameFromUrl e o ponto de injecao. Manter regex check antes de salvar no cache.

---

## Tabela de bugs abertos

| ID | Sprint | Severidade | Descricao | Arquivo:linha |
|---|---|---|---|---|
| P1-G8-01 | G8 | P1 | cutsByLevel acumula entre retries; permite total_pct=99 fake | state/RunStats.ts:43-47, GameScene.ts:724-728 |
| P1-G8-02 | G8 | P1 | RankingScene loadAndRender sem cancel ao SHUTDOWN; setText em scene morta | RankingScene.ts:56-91 |
| P1-G8-03 | G8 | P1 | Titulo "TOP 50" mas so renderiza 13 linhas | RankingScene.ts:21-27, 122-150 |
| P1-G8-04 | G8 | P1 | submitScore sem timeout; modal preso em ENVIANDO... indefinido | RankingApi.ts:24-37 |
| P2-G8-01 | G8 | P2 | Modal sem cancelamento por ESC | SubmitModal.ts:65-71 |
| P2-G8-02 | G8 | P2 | restartLevel nao reseta startTimeMs; tempo de retries acumula | RunStats.ts:27-35, GameScene.ts:724-728 |
| P2-G8-03 | G8 | P2 | parseError 400 cai em 'server' nao 'validation' | RankingApi.ts:11-22 |
| P2-G8-04 | G8 | P2 | refreshValid sobrescreve input.value; cursor pula pro fim em desktop | SubmitModal.ts:55-60 |
| P2-G8-05 | G8 | P2 | localStorage falha silencioso em modo privado iOS | RunStats.ts:83-95 |
| P2-G8-06 | G8 | P2 | scene.start sem guard duplo em TitleScene; consistencia com advancing flag | TitleScene.ts:57, 120, 140 |
| P3-G8-01 | G8 | P3 | RANKING_API_URL hardcoded; dev local sempre prod | Constants.ts:21 |
| P3-G8-02 | G8 | P3 | input sem pattern HTML attribute | SubmitModal.ts:28-36 |
| P3-G8-03 | G8 | P3 | renderList recria sem guard contra paralelismo de retries | RankingScene.ts:59-92 |
| P3-G8-04 | G8 | P3 | Modal sem max-height; teclado virtual em landscape pode ocultar botoes | index.html:61-160 |
| P3-G8-05 | G8 | n/a | endRun nao chamado em restartLevel (intencional, auditado) | GameScene.ts:707-710, 724-728 |
| P3-G8-06 | G8 | n/a | RANKING button vs toggles (auditado, sem colisao) | TitleScene.ts:128-143 |

### Bugs herdados de sprints anteriores

Ver `qa/g6/pass-02/handoff.md` (P1-01/P1-02 do G6 fechados em qa-fixes round-3) e `qa/g5/pass-03/handoff.md` (P2-02, P2-03, P2-04 abertos como trade-offs).
