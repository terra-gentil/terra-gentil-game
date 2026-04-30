from datetime import datetime
from pydantic import BaseModel, Field


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


class TopResponse(BaseModel):
    scores: list[ScoreOut]
    count: int


class HealthResponse(BaseModel):
    status: str
    version: str
