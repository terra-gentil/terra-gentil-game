import os
import sqlite3
from pathlib import Path

DB_PATH = os.getenv("DB_PATH", "./scores.db")

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    level_reached INTEGER NOT NULL,
    total_pct INTEGER NOT NULL,
    time_seconds INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scores_ranking
    ON scores (level_reached DESC, total_pct DESC, time_seconds ASC, created_at ASC);
"""


def init_db(db_path: str = DB_PATH) -> None:
    parent = Path(db_path).parent
    if str(parent) not in ("", "."):
        parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        conn.executescript("PRAGMA journal_mode = WAL;")
        conn.executescript(SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
