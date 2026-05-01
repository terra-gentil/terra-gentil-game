# Handoff G6 pass-02

---

## Para reverificacao desta sprint (G6 pass-03+)

### Validado nesta rodada

- [x] P1-01 do pass-01 - FECHADO em 67bb45f (osc/gain.disconnect apos 'ended' em SfxPlayer.ts:90-97)
- [x] P1-02 do pass-01 - FECHADO em 67bb45f (sfx.prime() em SfxPlayer.ts:32-34, usado em TitleScene.ts:60, 121, 141)
- [x] P2-01 do pass-01 - MITIGADO (prime() cria context no user gesture varios frames antes do primeiro playTone)
- [x] Singleton sfx unico (3 imports apenas)
- [x] AudioContext lazy, nunca em module-load
- [x] Fallback webkitAudioContext correto
- [x] setMuted guard em playTone()
- [x] 6 pontos de disparo cobertos no GameScene
- [x] Sequencia toggle SOM correta (setMuted antes de fuelPickup)
- [x] Sincronizacao mute em todas as scenes (TitleScene.create, GameScene.init, RankingScene.create)
- [x] G7 (backend): nenhuma regressao audio (so backend)
- [x] G7.5 (WebView + nickname URL): adoptNicknameFromUrl() em main.ts:5 puramente localStorage, sem AudioContext
- [x] G8 (RankingScene + SubmitModal + submitModalOpen): RankingScene.setMuted correto, botao RANKING chama prime(), SubmitModal nao toca SFX, submitModalOpen nao bloqueia SFX em curso
- [x] git diff 67bb45f..HEAD em jogo/src/audio/ e Settings.ts = vazio

### Gaps abertos para pass-03+

- [ ] Build TypeScript nao executado (shell sandboxado)
- [ ] Validacao iOS Safari real (Web Inspector / sessao 5min+ / Audio Nodes count)
- [ ] Toggle SOM como primeira interacao em iOS Safari (P3-G6-01 desta rodada)
- [ ] Teste mute mid-SFX (esperado: continua ate fim)
- [ ] WebView do React Native expoe Web Audio? (cenario novo apos G7.5)

---

## Para QA das proximas sprints (G9+)

### Invariantes do pass-01 - todos seguem validos no HEAD ad71970

Ver `qa/g6/pass-01/handoff.md` "Para QA das proximas sprints" - todos continuam valendo.

### Invariantes adicionados/reforcados pelo qa-fixes round-3 (67bb45f)

#### sfx.prime() - disciplina de uso

- OBRIGATORIO chamar sfx.prime() no handler de qualquer botao da TitleScene que INICIA outra scene mas NAO toca SFX no proprio handler. Atualmente: JOGAR, selectors 1-10, RANKING.
- NAO necessario em handlers que ja chamam sfx.* no proprio handler (ex: toggle SOM ja chama fuelPickup que cria context via ensureContext).
- Se G9+ adicionar novos botoes na TitleScene que iniciam scenes (tutorial, sobre, configuracoes), DEVE chamar sfx.prime() antes do scene.start.
- prime() e idempotente: chamar varias vezes nao causa efeito colateral.

#### osc/gain disconnect

- O lifecycle `osc.addEventListener('ended', () => { osc.disconnect(); gain.disconnect(); })` no playTone() e invariante critico.
- Se G9+ migrar pra AudioBufferSourceNode (OGG via FamiStudio), DEVE replicar com source.onended.
- O try/catch interno protege contra double-disconnect. Manter.

#### Skip de SFX redundantes em game over

- penaltyFlowers/penaltyStone em GameScene.onEnterTile rodam dentro de `if (!this.gameOver)` - evita sobreposicao com gameOver().
- applyFuelPenalty roda ANTES do guard (penalty ainda aplica). So feedback (shake + SFX) e suprimido.
- Se G9+ adicionar novos tiles com penalty: applyFuelPenalty primeiro, depois `if (!this.gameOver) { feedback }`.

### Sinais de regressao a monitorar em G9+

1. G9 substitui retangulos por sprites - sem risco direto. Se adicionar novos eventos com SFX (power-up, multiplicador, combo), DEVE adicionar metodo em SfxPlayer.
2. Se G9 adicionar musica de fundo - manter SfxPlayer como facade (playMusic/stopMusic). setMuted deve silenciar musica e SFX juntos.
3. Se G9 trocar SFX sintetizados por OGG via Phaser sound - manter interface publica sfx.cut() etc inalterada (facade). Ver G6.5 trade-off no HANDOFF.
4. Se G9 adicionar PauseScene - chamar sfx.setMuted no create. NAO parar SFX em curso (cosmetic, nao critico).
5. G10 lancamento: SfxPlayer nao tem console.log, nada a remover.

### Estado de bugs apos pass-02

| ID | Sprint | Severidade | Status pass-02 |
|---|---|---|---|
| P1-01 | G6 | P1 | FECHADO em qa-fixes round-3 |
| P1-02 | G6 | P1 | FECHADO em qa-fixes round-3 |
| P2-01 | G6 | P2 | MITIGADO (downgrade pra P3 efetivo apos prime()) |
| P2-02 | G6 | P2 | ABERTO - descobribilidade toggle SOM (UX, aceito) |
| P2-03 | G6 | P2 | ABERTO - hierarquia visual toggle vs JOGAR (UX, aceito) |
| P2-04 | G6 | P2 | OK informativo - cast webkitAudioContext correto |
| P2-05 | G6 | P2 | ABERTO/aceitavel - timbres sem playtesting reportado |

### Achados novos pass-02 (todos P3 informativos / verificacoes positivas)

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| P3-G6-01 | G6 | P3 | informativo - prime() nao em toggle SOM (nao-bug, ja toca SFX no handler) |
| P3-G6-02 | G6 | P3 | informativo - RankingScene.setMuted defensivo |
| P3-G6-03 | G6 | P3 | verificacao positiva - adoptNicknameFromUrl nao toca audio |
| P3-G6-04 | G6 | P3 | verificacao positiva - SubmitModal sem regressao audio |
| P3-G6-05 | G6 | P3 | verificacao positiva - VOLTAR sem prime() necessario |
| P3-G6-06 | G6 | P3 | verificacao positiva - submitModalOpen sem leak mute |
