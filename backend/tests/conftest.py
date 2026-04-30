import os
import tempfile
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setenv("DB_PATH", path)

    import importlib

    from app import db as db_module
    from app import main as main_module

    importlib.reload(db_module)
    importlib.reload(main_module)

    main_module.app.state.limiter.reset()

    with TestClient(main_module.app) as c:
        yield c

    try:
        os.remove(path)
    except OSError:
        pass
