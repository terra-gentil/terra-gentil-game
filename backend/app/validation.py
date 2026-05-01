from .models import ScoreCreate

MIN_SECONDS_PER_LEVEL = 3
# Run real do publico-alvo dura 5-15 min. 1h e teto generoso, acima disso
# claramente nao e sequenciada (aba aberta, walking sim, etc). Schema mantem
# le=36000 pra compat, mas validate_plausible filtra (P2-G7-06).
MAX_PLAUSIBLE_SECONDS = 3600


def validate_plausible(score: ScoreCreate) -> tuple[bool, str | None]:
    min_time = score.level_reached * MIN_SECONDS_PER_LEVEL
    if score.time_seconds < min_time:
        return False, (
            f"time_seconds muito baixo pro level alcancado "
            f"(minimo {min_time}s pra level {score.level_reached})"
        )
    if score.time_seconds > MAX_PLAUSIBLE_SECONDS:
        return False, (
            f"time_seconds implausivel (> {MAX_PLAUSIBLE_SECONDS}s = 60min). "
            "run sequenciada do publico-alvo nao excede esse limite"
        )
    if score.level_reached < 10 and score.total_pct == 100:
        return False, "total_pct 100 so e valido se level_reached == 10"
    return True, None
