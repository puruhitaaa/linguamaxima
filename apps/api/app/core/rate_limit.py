import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app.core.config import settings


class SlidingWindowRateLimiter:
    """Simple per-client sliding-window rate limiter keyed by client host."""

    def __init__(self, window_seconds: int = 60) -> None:
        self.window_seconds = window_seconds
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int) -> None:
        if limit <= 0:
            return
        now = time.monotonic()
        cutoff = now - self.window_seconds
        bucket = self._buckets[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please wait a minute before trying again.",
            )
        bucket.append(now)

    def reset(self) -> None:
        self._buckets.clear()


generation_rate_limiter = SlidingWindowRateLimiter(window_seconds=60)


async def enforce_generation_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    bucket_key = f"{request.url.path}:{client_ip}"
    generation_rate_limiter.check(bucket_key, settings.generation_rate_limit)
