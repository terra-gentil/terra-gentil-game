# Terra Gentil ranking API

Backend de ranking pra Terra Gentil Game (sprint G7). FastAPI + SQLite,
deploy em Railway com volume persistente.

## Stack

- FastAPI 0.115
- Pydantic 2.9 (validacao)
- slowapi (rate limit)
- SQLite stdlib (single file, persistente via Railway volume)
- Python 3.12 slim no Docker

## Endpoints

| Metodo | Path | Descricao | Rate limit |
|--------|------|-----------|-----------|
| GET | `/health` | Healthcheck pro Railway | sem limite |
| POST | `/scores` | Cria score novo | 5/min/IP |
| GET | `/scores/top?limit=50` | Top scores ordenados | 60/min/IP |

### Schema do POST /scores

```json
{
  "nickname": "ANDRE",       // [A-Z0-9_]{3,12}
  "level_reached": 10,        // 1..10
  "total_pct": 100,           // 0..100, so pode ser 100 se level==10
  "time_seconds": 600         // 1..36000, minimo de 3s por level
}
```

### Ordem do ranking

`level_reached DESC, total_pct DESC, time_seconds ASC, created_at ASC`

Quem foi mais longe vence; empatou em level, quem cortou mais vence; empatou
em pct, quem foi mais rapido vence; empatou em tudo, quem postou primeiro
fica em cima.

## Dev local

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate                  # bash Windows
# ou: source .venv/bin/activate         # linux/mac

pip install -r requirements.txt
uvicorn app.main:app --reload

# health: http://localhost:8000/health
# docs:   http://localhost:8000/docs    (Swagger UI gratis do FastAPI)
```

## Tests

```bash
cd backend
.venv/Scripts/python -m pip install pytest httpx
.venv/Scripts/python -m pytest -q
```

## Variaveis de ambiente

| Var | Default | Descricao |
|-----|---------|-----------|
| `DB_PATH` | `./scores.db` | Path do SQLite. Em prod usar `/data/scores.db` (volume) |
| `CORS_ORIGINS` | `https://terra-gentil.github.io,http://localhost:5173` | Lista CSV de origins permitidas |
| `PORT` | `8000` | Porta do uvicorn (Railway sobrescreve) |

## Deploy no Railway (passo a passo)

### Pre-requisitos

1. Conta em https://railway.app/
2. Repo `terra-gentil/terra-gentil-game` ja conectado ao GitHub (esta)

### 1. Criar projeto (recomendado: novo)

- Dashboard Railway > **New Project** > **Deploy from GitHub repo**
- Selecionar `terra-gentil/terra-gentil-game`
- Railway vai detectar e tentar buildar a raiz; **vai falhar** porque a raiz nao tem Dockerfile

### 2. Apontar pra subpasta

Service settings:
- **Root Directory**: `backend`
- **Builder**: Dockerfile (railway.toml ja configura isso, mas confirmar)
- **Watch Paths**: `backend/**` (so rebuilda quando backend muda)

### 3. Volume pra SQLite persistir

Service settings > Volumes:
- **Mount path**: `/data`
- Tamanho: 1 GB e mais que suficiente pra anos de scores

(O `railway.toml` ja declara o volume; em alguns plan tiers precisa criar manual)

### 4. Variaveis de ambiente

Service settings > Variables:
- `DB_PATH` = `/data/scores.db`
- `CORS_ORIGINS` = `https://terra-gentil.github.io,http://localhost:5173`
- `PORT` = (Railway gera automatico, nao mexer)

### 5. Deploy

Railway redeploya automatico no proximo push pra `main` que toque `backend/**`.

### 6. Smoke test pos-deploy

Pegar URL publica do service (`https://<service>.up.railway.app`):

```bash
curl https://<service>.up.railway.app/health
# {"status":"ok","version":"0.1.0"}

curl -X POST https://<service>.up.railway.app/scores \
  -H 'Content-Type: application/json' \
  -d '{"nickname":"ANDRE","level_reached":3,"total_pct":80,"time_seconds":60}'

curl https://<service>.up.railway.app/scores/top
```

### 7. Apontar o jogo

Quando G8 (frontend ranking) for codado, vai usar a URL publica do service.

## Trade-offs aceitos

- **SQLite single-writer**: ok pra leituras concorrentes; writes serializam.
  Suficiente pra carga prevista (jogo casual de mascote).
- **Sem auth**: ranking publico, qualquer IP submete. Defesa: rate limit + validacao server-side.
- **Sem retencao**: forever inicial. Trivial adicionar `DELETE` por idade depois.
- **Anti-abuse simples**: tempo minimo plausivel. Nao bloqueia speedrun honesto, bloqueia spam.
- **Em-dash ausentes**: convencao do projeto (PT-BR sem travessao).
