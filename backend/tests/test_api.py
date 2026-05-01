from fastapi.testclient import TestClient


def valid_payload(**overrides):
    base = {
        "nickname": "ANDRE",
        "level_reached": 5,
        "total_pct": 75,
        "time_seconds": 120,
    }
    base.update(overrides)
    return base


class TestHealth:
    def test_health_ok(self, client: TestClient):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "version" in body


class TestCreateScore:
    def test_creates_score(self, client: TestClient):
        r = client.post("/scores", json=valid_payload())
        assert r.status_code == 201
        body = r.json()
        assert body["id"] >= 1
        assert body["nickname"] == "ANDRE"
        assert body["level_reached"] == 5
        assert body["total_pct"] == 75
        assert body["time_seconds"] == 120
        assert "created_at" in body

    def test_rejects_lowercase_nickname(self, client: TestClient):
        r = client.post("/scores", json=valid_payload(nickname="andre"))
        assert r.status_code == 422

    def test_rejects_short_nickname(self, client: TestClient):
        r = client.post("/scores", json=valid_payload(nickname="AN"))
        assert r.status_code == 422

    def test_rejects_long_nickname(self, client: TestClient):
        r = client.post("/scores", json=valid_payload(nickname="A" * 13))
        assert r.status_code == 422

    def test_rejects_special_chars(self, client: TestClient):
        r = client.post("/scores", json=valid_payload(nickname="AN-DRE"))
        assert r.status_code == 422

    def test_rejects_level_out_of_range(self, client: TestClient):
        assert client.post("/scores", json=valid_payload(level_reached=0)).status_code == 422
        assert client.post("/scores", json=valid_payload(level_reached=11)).status_code == 422

    def test_rejects_pct_out_of_range(self, client: TestClient):
        assert client.post("/scores", json=valid_payload(total_pct=-1)).status_code == 422
        assert client.post("/scores", json=valid_payload(total_pct=101)).status_code == 422

    def test_rejects_implausible_time(self, client: TestClient):
        # Business rule (validate_plausible) -> 400. Schema invalid -> 422.
        r = client.post("/scores", json=valid_payload(level_reached=10, time_seconds=5))
        assert r.status_code == 400
        assert "muito baixo" in r.json()["detail"]

    def test_rejects_implausible_high_time(self, client: TestClient):
        # P2-G7-06: validate_plausible rejeita > 3600s (60min)
        r = client.post(
            "/scores", json=valid_payload(level_reached=10, time_seconds=4000)
        )
        assert r.status_code == 400
        assert "implausivel" in r.json()["detail"]

    def test_rejects_pct_100_below_level_10(self, client: TestClient):
        r = client.post("/scores", json=valid_payload(level_reached=5, total_pct=100))
        assert r.status_code == 400
        assert "100" in r.json()["detail"]

    def test_accepts_pct_100_at_level_10(self, client: TestClient):
        r = client.post(
            "/scores",
            json=valid_payload(level_reached=10, total_pct=100, time_seconds=600),
        )
        assert r.status_code == 201


class TestTopScores:
    def test_empty_top(self, client: TestClient):
        r = client.get("/scores/top")
        assert r.status_code == 200
        body = r.json()
        assert body["scores"] == []
        assert body["count"] == 0

    def test_top_ordering(self, client: TestClient):
        client.post("/scores", json=valid_payload(nickname="LOW", level_reached=2, total_pct=50, time_seconds=60))
        client.post("/scores", json=valid_payload(nickname="HIGH", level_reached=10, total_pct=80, time_seconds=300))
        client.post("/scores", json=valid_payload(nickname="MID", level_reached=5, total_pct=90, time_seconds=200))

        r = client.get("/scores/top")
        assert r.status_code == 200
        scores = r.json()["scores"]
        assert [s["nickname"] for s in scores] == ["HIGH", "MID", "LOW"]

    def test_top_tiebreak_by_pct(self, client: TestClient):
        r1 = client.post("/scores", json=valid_payload(nickname="AAA", level_reached=5, total_pct=70, time_seconds=120))
        r2 = client.post("/scores", json=valid_payload(nickname="BBB", level_reached=5, total_pct=90, time_seconds=120))
        assert r1.status_code == 201 and r2.status_code == 201
        r = client.get("/scores/top")
        assert [s["nickname"] for s in r.json()["scores"]] == ["BBB", "AAA"]

    def test_top_tiebreak_by_time(self, client: TestClient):
        r1 = client.post("/scores", json=valid_payload(nickname="SLOW", level_reached=5, total_pct=80, time_seconds=300))
        r2 = client.post("/scores", json=valid_payload(nickname="FAST", level_reached=5, total_pct=80, time_seconds=100))
        assert r1.status_code == 201 and r2.status_code == 201
        r = client.get("/scores/top")
        assert [s["nickname"] for s in r.json()["scores"]] == ["FAST", "SLOW"]

    def test_top_limit_param(self, client: TestClient):
        for i in range(5):
            client.post(
                "/scores",
                json=valid_payload(nickname=f"USR_{i}", level_reached=i + 1, time_seconds=(i + 1) * 30),
            )
        r = client.get("/scores/top?limit=3")
        assert r.status_code == 200
        assert r.json()["count"] == 3

    def test_top_limit_validation(self, client: TestClient):
        assert client.get("/scores/top?limit=0").status_code == 422
        assert client.get("/scores/top?limit=101").status_code == 422


class TestRateLimit:
    def test_post_rate_limit(self, client: TestClient):
        for i in range(5):
            r = client.post("/scores", json=valid_payload(nickname=f"USR_{i}"))
            assert r.status_code == 201
        r = client.post("/scores", json=valid_payload(nickname="USR_X"))
        assert r.status_code == 429

    def test_get_rate_limit(self, client: TestClient):
        # P2-G7-08: GET /scores/top tem limite 60/min. Validamos que apos 60
        # requests rapidos do mesmo IP, a 61a recebe 429.
        for _ in range(60):
            r = client.get("/scores/top")
            assert r.status_code == 200
        r = client.get("/scores/top")
        assert r.status_code == 429


class TestCORS:
    def test_cors_allows_github_pages(self, client: TestClient):
        r = client.options(
            "/scores/top",
            headers={
                "Origin": "https://terra-gentil.github.io",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin") == "https://terra-gentil.github.io"

    def test_cors_blocks_unknown_origin(self, client: TestClient):
        r = client.options(
            "/scores/top",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        # CORSMiddleware do Starlette retorna 400 pra preflight de origem nao
        # permitida. Verificamos os 2 sinais (status + ausencia do header) pra
        # nao depender so da ausencia, que pode dar falso positivo se o handler
        # mudar de comportamento (QA G7 P1-04).
        assert r.status_code == 400
        assert "access-control-allow-origin" not in r.headers
