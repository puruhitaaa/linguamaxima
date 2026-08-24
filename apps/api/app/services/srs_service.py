from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

@dataclass
class SRSResult:
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review: datetime

def calculate_sm2(
    quality: int,
    current_ease_factor: float = 2.5,
    current_interval: int = 0,
    current_repetitions: int = 0,
    now: datetime | None = None,
) -> SRSResult:
    """
    SuperMemo SM-2 algorithm calculation.
    Quality scale:
    0: Complete blackout
    1: Incorrect, but upon seeing correct answer it felt familiar
    2: Incorrect, but correct answer seemed easy to recall
    3: Correct with serious difficulty
    4: Correct with hesitation
    5: Perfect recall
    """
    if now is None:
        now = datetime.now(timezone.utc)

    # Ensure quality is in range [0, 5]
    q = max(0, min(5, quality))
    ef = current_ease_factor
    repetitions = current_repetitions
    interval = current_interval

    if q >= 3:
        # Correct response
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = int(round(interval * ef))
        repetitions += 1

        # Calculate new ease factor
        ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        if ef < 1.3:
            ef = 1.3
    else:
        # Incorrect response (Again)
        repetitions = 0
        interval = 1

    next_review = now + timedelta(days=interval)

    return SRSResult(
        ease_factor=round(ef, 2),
        interval_days=interval,
        repetitions=repetitions,
        next_review=next_review,
    )
