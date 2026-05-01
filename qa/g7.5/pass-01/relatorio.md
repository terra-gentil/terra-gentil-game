# QA G7.5 pass-01 - Relatorio de Revisao

**Sprint**: G7.5 - WebView no app Terra Gentil + nickname via URL param
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G7.5 pass-01
**HEAD analisado**: ad71970
**Commit principal G7.5**: ad71970 (diff contra 67b06cd)
**Arquivos alterados (jogo)**: jogo/src/main.ts, jogo/src/state/RunStats.ts, HANDOFF.md
**Build validado**: nao (analise estatica manual)

NOTA: parte da G7.5 (codigo do app RN: GameScreen.tsx, App.tsx, HomeScreen.tsx) esta em outro repo (`C:\Gitlab_hz\app-terragentil\`). NAO foi auditado neste pass.

---

## Cobertura

- adoptNicknameFromUrl em RunStats.ts: leitura linha a linha
- Validacao via NICKNAME_REGEX: cast toUpperCase + test
- Encoding URL (espaco, +, %20, unicode): analise contratual de URLSearchParams
- Edge cases: param ausente / vazio / duplicado / invalido
- Sobrescrita de cache existente vs novo URL param
- Boot order: adoptNicknameFromUrl antes de new Phaser.Game(config)
- Vetores de injection (innerHTML, textContent, Phaser canvas)
- Privacy do query param (logs, historico)
- Regressao do fluxo sem ?nickname=
- Compat browser desktop vs WebView Android/iOS
- Paridade com NICKNAME_REGEX do backend (app/models.py:6)
- Modal SubmitModal.ts consumindo cache via loadCachedNickname

---

## Achados

### P2-G7.5-01 - URL param sempre sobrescreve cache existente sem documentacao do contrato

**Arquivo**: jogo/src/state/RunStats.ts:99-109

A funcao chama saveCachedNickname incondicionalmente quando o param URL e valido, sobrescrevendo qualquer nickname previo no cache. Cenario problematico: tablet familiar compartilhado, esposa joga via WebView com user logado, apelido pessoal previo do marido (salvo via modal) e silenciosamente substituido. Sem feedback visual no modal indicando origem URL. Decisao "URL > cache" nao esta documentada em codigo nem em HANDOFF.

**Severidade**: P2 - UX/contrato. Sem crash. Mitigacao: comentar a decisao + atualizar HANDOFF.

### P2-G7.5-02 - Divergencia silenciosa: lowercase no URL aceito (toUpperCase) mas backend rejeita lowercase

**Arquivo**: jogo/src/state/RunStats.ts:104-107

`candidate = raw.toUpperCase()` ANTES do regex test. `?nickname=andre` vira ANDRE e e aceito. Comportamento espelha SubmitModal.ts:55-60 (intencional). Mas a paridade nao esta documentada - se um lado mudar, contrato silencioso quebra.

**Severidade**: P2 - documental.

### P2-G7.5-03 - URLSearchParams.get() retorna primeiro valor de duplicates - sem comentario explicito

**Arquivo**: jogo/src/state/RunStats.ts:102

`?nickname=A&nickname=B` retorna A (primeiro). Comportamento correto pelo spec WHATWG, mas sem teste/comentario abre porta a regressao silenciosa se mudarem pra getAll.

**Severidade**: P2 - sem bug, recomendar comentario.

### P3-G7.5-01 - Privacy: query param visivel em historico/logs

**Arquivo**: jogo/src/state/RunStats.ts:99-109 (decisao arquitetural)

Nickname e nao-PII por design (regex restrito, handle publico). Aceitavel. Alternativa endurecida seria fragment (#nickname=...) que nao vai pro servidor, mas requer refactor do app RN. Nao recomendado mudar.

**Severidade**: P3 - documentar no HANDOFF.

### P3-G7.5-02 - try/catch engole erro sem log

**Arquivo**: jogo/src/state/RunStats.ts:100, 108

Mitigacao opcional: adicionar console.warn pra debug-friendliness, alinhado com trade-off #6 do HANDOFF (console.log em prod).

**Severidade**: P3 - opcional.

### P3-G7.5-03 - innerHTML em SubmitModal.ts:20 SEM nickname interpolado

**Arquivo**: jogo/src/ui/SubmitModal.ts:20-44

Verificacao explicita do brief: o template literal e ESTATICO. Nickname chega via input.value = cached (linha 53, property assignment, safe) e Phaser canvas (RankingScene.ts:129). SEM vetor XSS. Defesa em profundidade: regex `[A-Z0-9_]{3,12}` ja sanitiza.

**Severidade**: P3 - verificacao positiva.

### P3-G7.5-04 - Boot order correto: adoptNicknameFromUrl antes de new Phaser.Game(config)

**Arquivo**: jogo/src/main.ts:1-9

adoptNicknameFromUrl e sincrono (URLSearchParams + localStorage), roda antes da instanciacao do Phaser.Game. Cache seedado antes de qualquer scene possivel consumir.

**Severidade**: P3 - verificacao positiva.

### P3-G7.5-05 - Regressao: fluxo sem ?nickname= preservado

**Arquivo**: jogo/src/state/RunStats.ts:103

Param ausente -> get retorna null -> early return. Param vazio (?nickname=) -> '' falsy -> mesmo early return. Sem corrupcao do cache existente.

**Severidade**: P3 - verificacao positiva.

### P3-G7.5-06 - Encoding: edge cases rejeitados sem crash

**Arquivo**: jogo/src/state/RunStats.ts:101-105

Tabela de cenarios:
- ?nickname=ANDRE -> salvo
- ?nickname=andre -> ANDRE salvo (toUpperCase)
- ?nickname=ANDRE%20HZ -> espaco rejeitado, nao toca
- ?nickname=ANDRE+HZ -> + vira espaco, rejeitado
- ?nickname=acentuado -> rejeitado
- ?nickname=AB -> < 3 chars rejeitado
- ?nickname=ABCDEFGHIJKLM -> > 12 chars rejeitado
- ?nickname=<script> -> < > rejeitados
- ?nickname= -> early return
- ?nickname=A&nickname=B -> A vence (URLSearchParams.get spec)
- encoding malformado (%G1) -> URLSearchParams nao throws; try/catch outer pegaria

**Severidade**: P3 - verificacao positiva.

### P3-G7.5-07 - Compat WebView vs desktop sem branch

**Arquivo**: jogo/src/state/RunStats.ts:99-109

APIs Web standard (URLSearchParams, window.location.search, localStorage) - WebView Android (Chromium), WKWebView iOS, desktop. Boa decisao: interface generica, qualquer cliente pode passar.

**Severidade**: P3 - verificacao positiva.

---

## Verificacao de invariantes pre-G7.5

- NICKNAME_REGEX em Ranking.ts: OK identico ao backend
- NICKNAME_KEY 'gentileza:nickname' em RunStats.ts:13: OK nao alterado
- loadCachedNickname / saveCachedNickname API: OK sem mudanca
- SubmitModal.ts:52 consome cache: OK inalterado
- main.ts instancia Phaser.Game: OK apos adoption
- Backend models.py:6 regex: OK paridade literal mantida
- Modal pre-fill (input.value = cached): OK inalterado

---

## Resumo

| Severidade | Total |
|---|---|
| P0 | 0 |
| P1 | 0 |
| P2 | 3 |
| P3 | 7 |

G7.5 funcionalmente solido. Apenas melhorias documentais sugeridas.
