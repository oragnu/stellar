"""Small cache-backend interface so the star cache (and, later, the
rate-limiter) can run on Postgres by default and swap to Redis as an
opt-in upgrade for multi-instance deployments — see
docs/adr/0003-apscheduler-no-redis-by-default.md. Never required for a
normal single-instance self-host.
"""

from typing import Any, Protocol


class CacheBackend(Protocol):
    async def get(self, key: str) -> Any | None: ...

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None: ...

    async def delete(self, key: str) -> None: ...
