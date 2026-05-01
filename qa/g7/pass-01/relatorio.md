# QA G7 pass-01 - Relatorio de Revisao

**Sprint**: G7 - Backend de ranking FastAPI + SQLite (deploy Railway concluido)
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G7 pass-01
**HEAD analisado**: ad71970
**Commits revisados**: 9d87925 (backend implementation), a03405c (deploy Railway concluido + URL prod)
**URL prod**: https://terra-gentil-game-production.up.railway.app
**Build validado**: nao (analise estatica; nao tentei rodar pytest/Docker no sandbox)

---

## Cobertura

| Area | Metodo |
|---|---|
| FastAPI app: endpoints health, scores POST, scores top GET | Leitura completa main.py |
| Pydantic ScoreCreate/ScoreOut/regex/ranges | Leitura models.py |
| db.py: init_db, WAL, indices, parameterized queries | Leitura linha a linha |
| validation.py: anti-abuse (tempo minimo, pct=100 so com level=10) | Releitura |
| Dockerfile: imagem, USER, healthcheck | Leitura completa |
| railway.toml: volume, healthcheck path | Leitura completa |
| tests/test_api.py: 20 cenarios | Cobertura por categoria |
| README backend: passo a passo deploy | Releitura |
| requirements.txt: versoes pinadas | Cross-check com vulnerabilidades conhecidas |

---

## Achados

### P1-G7-01 (CRITICO) - slowapi.get_remote_address atras do proxy Railway agrupa todos os jogadores no mesmo IP

**Arquivo**: backend/app/main.py:35

`slowapi.util.get_remote_address` resolve `request.client.host`. Atras do proxy/load-balancer do Railway, isso retorna o IP do edge, nao do cliente real. Resultado: todos os jogadores compartilham o mesmo "IP" pra rate limit. A partir do 6 POST/min de qualquer jogador, o backend retorna 429 pra todos.

**Reproducao**: dois browsers/dispositivos diferentes fazem submit simultaneo. Apos 5 submits combinados em 1min, 6o submit recebe 429 mesmo sendo de IP diferente.

**Severidade**: P1 - rate limit efetivamente quebrado em prod.

**Correcao sugerida**: adicionar flag uvicorn `--proxy-headers --forwarded-allow-ips='*'` no CMD do Dockerfile (uvicorn vai ler `X-Forwarded-For` do header do Railway). Alternativamente, usar middleware customizado que extrai IP do header.

**Arquivo a alterar**: backend/Dockerfile:18

```diff
- CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
+ CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
```

### P1-G7-02 - Container roda como root (sem USER nao-root)

**Arquivo**: backend/Dockerfile:1-19

Sem `USER appuser` (ou similar) antes do CMD. Container roda como root - se houver RCE no FastAPI, escalada privilegiada e trivial.

**Severidade**: P1 - hardening basico.

**Correcao sugerida**:
```diff
+ RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
+ USER appuser
  CMD ...
```

E garantir que `/data` (volume Railway) seja acessivel ao user 1000.

### P1-G7-03 - Fixture `client` fragil com importlib.reload

**Arquivo**: backend/tests/conftest.py:9-31

`importlib.reload(app.main)` pra cada teste e fragil - mudancas no fluxo de import podem deixar testes contaminados (state preservado). Isolamento incerto.

**Severidade**: P1 - test infra. Sem impacto em prod, mas testes podem dar falsos positivos/negativos.

**Correcao sugerida**: usar fixture com `monkeypatch` em env vars + criar app via factory function que recebe DB_PATH e CORS_ORIGINS como argumentos.

### P1-G7-04 - test_cors_blocks_unknown_origin pode dar falso positivo

**Arquivo**: backend/tests/test_api.py:146-154

O teste assume que TestClient honra CORSMiddleware do mesmo jeito que o uvicorn em prod. Se `Access-Control-Allow-Origin` nao retorna no body do TestClient (que nao simula browser fully), o teste passa por motivo errado.

**Severidade**: P1 - test infra. Falso senso de seguranca.

**Correcao sugerida**: testar o header explicitamente em vez de status code. Validar via curl real em smoke test.

### P2-G7-01 - 422 onde brief pede 400 pra business rule

**Arquivo**: backend/app/main.py:67-69 (validate_plausible)

Brief no HANDOFF diz "400 validacao". FastAPI retorna 422 pra Pydantic AND pra HTTPException(status_code=422) levantado em validate_plausible. Mistura validacao de schema com regra de negocio.

**Severidade**: P2 - clareza de API.

### P2-G7-02 - Sem exception_handler(Exception)

**Arquivo**: backend/app/main.py

Erros nao previstos viram 500 com stack trace (em DEBUG) ou body vazio. Cliente recebe `RankingApiError('server')` mas sem detalhe.

**Severidade**: P2 - resilience.

### P2-G7-03 - WAL nao defensivo em get_connection

**Arquivo**: backend/app/db.py:14-21

`init_db` ativa WAL mode. Mas se DB ja existir e for reaberto sem WAL (ex: backup restaurado), `get_connection` nao reaplica `PRAGMA journal_mode=WAL`. Em volume Railway novo, init_db roda. Em restore, pode nao.

**Severidade**: P2.

### P2-G7-04 - Sem connection pool (cria/fecha conexao por request)

**Arquivo**: backend/app/db.py

SQLite stdlib com `sqlite3.connect()` em cada request. Custo baixo (open arquivo) mas nao zero. Em alta carga (5 RPS sustentado) pode aparecer.

**Severidade**: P2.

### P2-G7-05 - Logs do uvicorn com IP (LGPD/GDPR pendente)

uvicorn logs default incluem IP do cliente. Sem politica de retencao/redacao documentada.

**Severidade**: P2.

### P2-G7-06 - time_seconds ate 36000s permite valores ilegitimos

**Arquivo**: backend/app/models.py:9

36000s = 10h. Run normal de 10 fases dura 5-15 min. 10h e plausivel pra deixar a aba aberta sem jogar.

**Severidade**: P2 - permite scores com tempo inflado pra mexer com ordering ASC (mas nessa direcao e desfavoravel ao player, entao baixo dano).

### P2-G7-07 - created_at UTC sem tz info

**Arquivo**: backend/app/db.py + models.py

`datetime.utcnow()` cria datetime naive. Comparacoes em outros timezones quebram silenciosamente. Fix: `datetime.now(timezone.utc)`.

**Severidade**: P2.

### P2-G7-08 - Sem testes pra GET rate limit

**Arquivo**: backend/tests/test_api.py

POST tem teste de rate limit. GET nao. Cobertura incompleta.

**Severidade**: P2.

### P2-G7-09 - Dockerfile sem HEALTHCHECK

**Arquivo**: backend/Dockerfile

Railway tem healthcheck via `railway.toml`. Mas `docker run` local nao tem - dificulta debug.

**Severidade**: P2.

### P2-G7-10 - lifespan nao loga falha de init_db

**Arquivo**: backend/app/main.py:lifespan

Se init_db lanca, FastAPI nao inicia mas log fica generico. Adicionar log explicito.

**Severidade**: P2.

---

## P3 (15 - resumo)

- SQL injection: PROTEGIDO. Todas as queries usam `?` placeholders (db.py linhas 30, 38, 44).
- XSS: NAO APLICAVEL (API retorna JSON, nao HTML).
- OPTIONS preflight: CORSMiddleware lida automaticamente.
- allow_credentials=False: CORRETO (nao usamos cookies).
- 5/min POST + 60/min GET: limites razoaveis pro publico-alvo.
- Anti-abuse: tempo minimo 3s/level (validation.py:7-12), pct=100 so com level=10 (validation.py:13-14) - ambos fortes.
- requirements.txt versoes pinadas: positivo.
- Volume `/data`: persistente em Railway.
- Healthcheck path `/health` em railway.toml: correto.
- Endpoint `/health` sem rate limit: correto.
- regex nickname identico ao frontend: confirmado.
- ranges level/pct/time: corretos vs HANDOFF.
- DB_PATH/CORS_ORIGINS via env: padrao 12-factor.
- Sem PII no schema: nickname [A-Z0-9_] e o unico campo de identidade, nao-PII.
- 2 scores residuais (DIAG, PERSIST) em prod: aceito conforme HANDOFF.

---

## Resumo

| Severidade | Total |
|---|---|
| P0 | 0 |
| P1 | 4 |
| P2 | 10 |
| P3 | 15 (verificacoes positivas + cosmeticos) |

**Achado mais grave**: P1-G7-01 - rate limit efetivamente global em prod por causa do proxy Railway. Fix simples no Dockerfile.
