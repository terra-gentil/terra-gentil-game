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


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


limiter = Limiter(key_func=get_remote_address, default_limits=[])

app = FastAPI(title="Terra Gentil ranking API", version=VERSION, lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
        raise HTTPException(status_code=422, detail=reason)

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
