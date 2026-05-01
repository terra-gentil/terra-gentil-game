import logging
import os
import sqlite3
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .db import get_db, init_db
from .models import HealthResponse, ScoreCreate, ScoreOut, TopResponse
from .validation import validate_plausible

VERSION = "0.1.0"

DEFAULT_ORIGINS = [
    "https://terra-gentil.github.io",
    "http://localhost:5173",
]

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", ",".join(DEFAULT_ORIGINS)).split(",")
    if o.strip()
]


_lifespan_logger = logging.getLogger("terra_gentil.lifespan")
_lifespan_logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # P2-G7-10: log explicito em init_db pra que falhas (volume nao montado,
    # permissao negada, schema corrupto) apareçam no Railway antes do uvicorn
    # tentar atender requests com banco quebrado.
    try:
        init_db()
        _lifespan_logger.info("init_db OK")
    except Exception as e:
        _lifespan_logger.exception("init_db falhou: %s", e)
        raise
    yield


limiter = Limiter(key_func=get_remote_address, default_limits=[])

app = FastAPI(title="Terra Gentil ranking API", version=VERSION, lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# P2-G7-02: handler global pra excecoes nao previstas. Sem isso, FastAPI retorna
# 500 com body vazio (em prod) ou stack trace (em debug). Cliente recebe
# RankingApiError('server') mas sem causa visivel nos logs.
_unhandled_logger = logging.getLogger("terra_gentil.unhandled")
_unhandled_logger.setLevel(logging.ERROR)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    from fastapi.responses import JSONResponse
    _unhandled_logger.exception(
        "unhandled %s em %s %s: %s",
        type(exc).__name__, request.method, request.url.path, exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "internal server error"},
    )


# Log de requests sem IP do cliente (P2-G7-05, LGPD/GDPR friendly).
# uvicorn roda com --no-access-log no Dockerfile pra suprimir o log default
# que inclui IP+porta. Aqui logamos apenas method, path e status.
_request_logger = logging.getLogger("terra_gentil.request")
_request_logger.setLevel(logging.INFO)


@app.middleware("http")
async def log_request_no_ip(request: Request, call_next):
    response = await call_next(request)
    _request_logger.info(
        "%s %s -> %s", request.method, request.url.path, response.status_code
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", version=VERSION)


@app.post("/scores", response_model=ScoreOut, status_code=201)
@limiter.limit("5/minute")
def create_score(
    request: Request,
    payload: ScoreCreate,
    db: sqlite3.Connection = Depends(get_db),
):
    ok, reason = validate_plausible(payload)
    if not ok:
        # P2-G7-01: business rule -> 400. Reservamos 422 pra falhas de schema
        # Pydantic (formato do payload), seguindo HTTP semantica.
        raise HTTPException(status_code=400, detail=reason)

    cursor = db.execute(
        """
        INSERT INTO scores (nickname, level_reached, total_pct, time_seconds)
        VALUES (?, ?, ?, ?)
        """,
        (
            payload.nickname,
            payload.level_reached,
            payload.total_pct,
            payload.time_seconds,
        ),
    )
    db.commit()
    row = db.execute(
        "SELECT id, nickname, level_reached, total_pct, time_seconds, created_at "
        "FROM scores WHERE id = ?",
        (cursor.lastrowid,),
    ).fetchone()
    return ScoreOut(**dict(row))


@app.get("/scores/top", response_model=TopResponse)
@limiter.limit("60/minute")
def top_scores(
    request: Request,
    limit: int = 50,
    db: sqlite3.Connection = Depends(get_db),
):
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="limit deve estar entre 1 e 100")

    rows = db.execute(
        """
        SELECT id, nickname, level_reached, total_pct, time_seconds, created_at
        FROM scores
        ORDER BY level_reached DESC, total_pct DESC, time_seconds ASC, created_at ASC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()

    scores = [ScoreOut(**dict(r)) for r in rows]
    return TopResponse(scores=scores, count=len(scores))
