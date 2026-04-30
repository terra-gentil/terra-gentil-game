from .models import ScoreCreate

MIN_SECONDS_PER_LEVEL = 3


def validate_plausible(score: ScoreCreate) -> tuple[bool, str | None]:
    min_time = score.level_reached * MIN_SECONDS_PER_LEVEL
    if score.time_seconds < min_time:
        return False, (
            f"time_seconds muito baixo pro level alcancado "
            f"(minimo {min_time}s pra level {score.level_reached})"
        )
    if score.level_reached < 10 and score.total_pct == 100:
        return False, "total_pct 100 so e valido se level_reached == 10"
    return True, None
