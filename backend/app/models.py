from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator


class ScoreCreate(BaseModel):
    nickname: str = Field(..., pattern=r"^[A-Z0-9_]{3,12}$")
    level_reached: int = Field(..., ge=1, le=10)
    total_pct: int = Field(..., ge=0, le=100)
    time_seconds: int = Field(..., ge=1, le=36000)


class ScoreOut(BaseModel):
    id: int
    nickname: str
    level_reached: int
    total_pct: int
    time_seconds: int
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def ensure_utc(cls, v):
        # SQLite CURRENT_TIMESTAMP retorna 'YYYY-MM-DD HH:MM:SS' UTC mas naive
        # (P2-G7-07). Forcamos tzinfo=utc pra que o JSON serializado leve sufixo
        # 'Z' / '+00:00' e clientes em outros timezones nao interpretem como
        # horario local.
        if isinstance(v, str):
            v = datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


class TopResponse(BaseModel):
    scores: list[ScoreOut]
    count: int


class HealthResponse(BaseModel):
    status: str
    version: str
