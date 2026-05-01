# Handoff G7 pass-01

---

## Para reverificacao desta sprint (G7 pass-02+)

### O que ja foi validado (analise estatica)

- [x] Endpoints `/health`, `POST /scores`, `GET /scores/top` definidos corretamente em main.py
- [x] Pydantic ScoreCreate com regex `[A-Z0-9_]{3,12}` em models.py:6 (espelha NICKNAME_REGEX do frontend)
- [x] Ranges: level 1..10, total_pct 0..100, time_seconds 1..36000
- [x] Validate_plausible em validation.py: tempo minimo 3s/level, pct=100 so com level=10
- [x] init_db ativa WAL, cria tabela e indice idx_scores_ranking
- [x] Queries usam `?` placeholders (parameterized) - sem SQL injection
- [x] Rate limit: 5/min POST, 60/min GET (slowapi)
- [x] CORS allowlist: GitHub Pages + localhost via env CORS_ORIGINS
- [x] Volume `/data` em railway.toml
- [x] Healthcheck `/health` configurado em railway.toml (sem rate limit)
- [x] requirements.txt com versoes pinadas
- [x] tests/test_api.py com 20 cenarios

### Gaps abertos (pass-02+)

- [ ] Rodar pytest local (sandbox bloqueou)
- [ ] Smoke test real no Railway pos-fix do P1-G7-01
- [ ] Validar `--proxy-headers` no uvicorn em ambiente real
- [ ] Validar logs sem IP em prod
- [ ] Auditar que volume /data e acessivel ao USER nao-root apos fix P1-G7-02
- [ ] Validar comportamento de connection pool sob carga
- [ ] Validacao manual de CORS preflight via curl

---

## Para QA das proximas sprints (G9+)

### Invariantes do schema/contrato do backend

#### nickname

- Regex: `^[A-Z0-9_]{3,12}$` (literal). DEVE casar exatamente com `jogo/src/types/Ranking.ts` (frontend) e com URL param adopter em `jogo/src/state/RunStats.ts:adoptNicknameFromUrl`.
- Uppercase only. Lowercase deve ser rejeitado pelo backend (nao aceitar). Frontend faz toUpperCase antes de submeter.

#### Ranges numericos

- level_reached: 1..10 (int). Frontend mostra fase atual+1.
- total_pct: 0..100 (int). pct=100 so legitimo se level_reached=10. Frontend clampa 100->99 quando highest<10 antes de submeter.
- time_seconds: 1..36000 (int). Tempo minimo: 3s * level_reached.

#### Ordering do ranking (SQL)

Ordem fixa: `level_reached DESC, total_pct DESC, time_seconds ASC, created_at ASC`.

Index `idx_scores_ranking` cobre essa ordem em db.py:18-19. Se G9+ mudar ordem, atualizar:
- `backend/app/db.py:18-19` (CREATE INDEX)
- `backend/app/main.py` ORDER BY do GET /scores/top
- Re-criar indice em prod via migracao manual

#### Rate limit

- POST /scores: 5/min/IP via slowapi
- GET /scores/top: 60/min/IP via slowapi
- /health sem rate limit

Apos fix P1-G7-01, IP e do cliente real (forwarded). Se G9+ adicionar endpoints, decidir limite por endpoint.

#### CORS

- allowlist via env `CORS_ORIGINS`, default contem GitHub Pages + localhost
- `allow_credentials=False`
- WebView do app RN tambem cai sob origem `null` ou data:// dependendo da plataforma. Avaliar quando G7.5 evoluir.

#### Persistencia

- SQLite em arquivo `/data/scores.db` em prod
- WAL mode + index ja criados em init_db
- Volume Railway 500MB
- Backup: nao automatico (gap aberto)

### Sinais de regressao a monitorar em G9+

1. Se G9 adicionar campos no score (ex: device_type, region): atualizar Pydantic, db.py CREATE TABLE (com migracao), index, e schema do frontend.
2. Se G9 trocar SQLite por Postgres: rever WAL nao-aplicavel, mudar driver, manter mesma ordem de columns.
3. Se G9 adicionar autenticacao: rever CORS allow_credentials, adicionar auth middleware antes de slowapi.
4. Se G9+ adicionar endpoint admin (delete score, ban nickname): isolar atras de auth basica + IP allowlist.
5. Se G10 adicionar i18n: nicknames em outros alfabetos exigem mudar regex (e tudo o que o espelha).

### Bugs abertos desta sprint

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| P1-G7-01 | G7 | P1 | ABERTO - rate limit global por proxy Railway, fix simples no Dockerfile |
| P1-G7-02 | G7 | P1 | ABERTO - container roda como root, sem USER nao-root |
| P1-G7-03 | G7 | P1 | ABERTO - fixture importlib.reload fragil em testes |
| P1-G7-04 | G7 | P1 | ABERTO - test_cors falso positivo possivel |
| P2-G7-01 | G7 | P2 | ABERTO - 422 onde brief pede 400 pra business rule |
| P2-G7-02 | G7 | P2 | ABERTO - sem exception_handler(Exception) |
| P2-G7-03 | G7 | P2 | ABERTO - WAL nao reaplica em DB existente |
| P2-G7-04 | G7 | P2 | ABERTO - sem connection pool |
| P2-G7-05 | G7 | P2 | ABERTO - logs uvicorn com IP (LGPD/GDPR pendente) |
| P2-G7-06 | G7 | P2 | ABERTO - time_seconds 36000s permite valores irreais |
| P2-G7-07 | G7 | P2 | ABERTO - created_at sem tzinfo |
| P2-G7-08 | G7 | P2 | ABERTO - sem testes pra GET rate limit |
| P2-G7-09 | G7 | P2 | ABERTO - Dockerfile sem HEALTHCHECK local |
| P2-G7-10 | G7 | P2 | ABERTO - lifespan nao loga falha de init_db |
