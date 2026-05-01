# Handoff G7.5 pass-01

---

## Para reverificacao desta sprint (G7.5 pass-02+)

### O que ja foi validado (analise estatica)

- [x] adoptNicknameFromUrl: validacao correta. URLSearchParams -> get('nickname') -> early return em null/vazio -> toUpperCase -> NICKNAME_REGEX.test -> saveCachedNickname so se valido
- [x] main.ts:1-9: ordem do boot correta. Adoption antes de new Phaser.Game
- [x] Ranking.ts:1 NICKNAME_REGEX literalmente identico a backend/app/models.py:6
- [x] Edge cases analisados: ausente, vazio, espacos URL-encoded, acentuados, < 3, > 12, HTML chars, duplicates, encoding malformado
- [x] Sobrescrita: URL valido SEMPRE sobrescreve cache (P2-G7.5-01)
- [x] Sem injection: input.value (property) + Phaser canvas (text). innerHTML em SubmitModal:20 e estatico
- [x] Privacy: nickname nao-PII por design
- [x] try/catch protege contra window.location indisponivel
- [x] Compat: APIs Web standard
- [x] Regressao: fluxo sem ?nickname= preservado

### Gaps (pendente para pass-02+)

- [ ] NAO validei codigo do app RN - GameScreen.tsx, App.tsx, HomeScreen.tsx vivem em C:\Gitlab_hz\app-terragentil\ (outro repo), sem acesso. Pendente: app constroi URL com encoding adequado, landscape lock no mount, restore portrait no unmount, BackHandler, status bar, botao X overlay, loading spinner
- [ ] Build TypeScript nao executado neste pass
- [ ] Teste manual no browser real: ?nickname=ANDRE, =andre, =AB, =ABCDEFGHIJKLM, =AN%2BDRE, = (vazio)
- [ ] Teste manual em WebView Android e iOS - WKWebView as vezes strip query params
- [ ] Teste de cache override: salvar X via modal, abrir URL com Y, conferir que Y vence (P2-G7.5-01)
- [ ] Teste end-to-end: app -> WebView -> URL -> cache seed -> jogo -> game over -> modal pre-fill -> submit
- [ ] Teste de regressao desktop sem URL param

---

## Para QA das proximas sprints (G9+)

### Invariantes do contrato URL param

- Nome do param: `nickname` (lowercase). Mudar em SINCRONIA com app RN.
- Encoding aceito: case-insensitive (toUpperCase interno). Backend exige uppercase. Manter simetria com SubmitModal.ts:55-60.
- Validacao: `NICKNAME_REGEX = /^[A-Z0-9_]{3,12}$/` - DEVE ser literalmente identica ao backend app/models.py:6.
- Duplicates: get retorna primeiro. NAO mudar pra getAll.
- Invalido/ausente: silencioso. Cache preservado.
- Boot order: adoptNicknameFromUrl DEVE rodar antes de `new Phaser.Game`.

### Invariantes do contrato cache (localStorage["gentileza:nickname"])

- Chave usada por: RunStats.ts:13, 91, 84, 106 + SubmitModal.ts:52.
- Toda nova fonte de seed DEVE passar por NICKNAME_REGEX.test antes de saveCachedNickname.
- Modal e o UNICO ponto de captura de input direto. NAO adicionar outro fluxo sem regex.

### Sanitizacao / vetor de XSS

- Renderizado em SubmitModal.ts:53 (input.value = cached, safe) e RankingScene.ts:129 (Phaser canvas, safe).
- Se G9+ exibir nickname em HTML overlay, usar textContent ou property, NUNCA `innerHTML +=`.

### Sinais de regressao a monitorar em G9+

1. Se G9 adicionar autenticacao no app: NAO concatenar token/userId na URL. Usar postMessage.
2. Se mudar nome do localStorage key: adicionar migracao da chave antiga.
3. Se mudar pra hash routing (#/...): URLSearchParams(window.location.search) nao captura - quebra silenciosa.
4. Se atualizar Vite ou Phaser: confirmar boot sincrono e ordem em main.ts.
5. Se backend mudar regex: atualizar Ranking.ts:1 literalmente.
6. Se app trocar ?nickname= por outra interface: manter ambas ou depreciar com cuidado.
7. Se G9 adicionar multi-user no jogo: adoptNicknameFromUrl pode virar adoptIdentityFromUrl.

### Tabela de bugs abertos desta sprint (G7.5)

| ID | Sprint | Severidade | Status | Descricao |
|---|---|---|---|---|
| P2-G7.5-01 | G7.5 | P2 | ABERTO | URL sobrescreve cache sem doc nem feedback visual |
| P2-G7.5-02 | G7.5 | P2 | ABERTO | Divergencia silenciosa toUpperCase URL vs backend uppercase-only |
| P2-G7.5-03 | G7.5 | P2 | ABERTO | URLSearchParams.get retorna primeiro de duplicates - sem comentario |
| P3-G7.5-01 | G7.5 | P3 | ABERTO (aceito) | Privacy query param em historico - nickname nao-PII, aceitavel |
| P3-G7.5-02 | G7.5 | P3 | ABERTO (opcional) | try/catch sem log - dificulta debug |

### Bugs herdados de sprints anteriores ainda abertos

(Ver `qa/g6/pass-02/handoff.md` e `qa/g5/pass-03/handoff.md` pra estado atual.)

### Lacunas explicitas desta passada

- Nao validei codigo do app RN - outro repo, sem acesso. Interface URL e generica suficiente pra que erros do lado app se manifestem como "param invalido / fluxo padrao", sem corromper estado do jogo. Mas integracao end-to-end precisa QA dedicado do repo do app.
- Build TS nao executado. Pass-02 deveria rodar `npm run build`.
- Sem testes automatizados. adoptNicknameFromUrl seria trivialmente testavel com Vitest + jsdom. Sugestao pra G10.
