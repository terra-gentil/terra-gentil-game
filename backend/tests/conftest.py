import os
import tempfile
from collections.abc import Iterator
from contextlib import suppress

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """Cliente isolado por teste.

    Usa importlib.reload pra re-instanciar app+db com DB_PATH novo. Trade-off
    conhecido (QA G7 P1-03): reload e fragil se houver state oculto entre modulos.
    Mitigacoes aqui: (1) DB_PATH unico por teste via tempfile, (2) reset explicito
    do limiter slowapi, (3) cleanup no finally pra evitar leak de arquivos. Migrar
    pra factory pattern (create_app(db_path, cors_origins)) e o fix definitivo,
    mas exige refactor de app/main.py - deferred.
    """
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setenv("DB_PATH", path)

    import importlib

    from app import db as db_module
    from app import main as main_module

    importlib.reload(db_module)
    importlib.reload(main_module)

    main_module.app.state.limiter.reset()

    try:
        with TestClient(main_module.app) as c:
            yield c
    finally:
        with suppress(OSError):
            os.remove(path)
