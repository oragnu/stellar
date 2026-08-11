"""Default cache backend (`CACHE_BACKEND=db`): the star-list payload is
stored directly in the `star_cache` Postgres table rather than a filesystem
blob (the original app's approach) — survives restarts, needs no extra
infra, plays nicely with read-only container filesystems / ephemeral PaaS
disks.

Note: this backend is specific to the star-cache use case (keyed by user
id, backed by the StarCache model) rather than a fully generic
key/value store — the `CacheBackend` protocol methods take a plain string
key for interface symmetry with the memory/redis backends, but under the
hood the key is expected to be a user id.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.star_cache import StarCache


class DbCacheBackend:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get(self, key: str) -> Any | None:
        row = await self._db.get(StarCache, uuid.UUID(key))
        if row is None:
            return None
        if row.expires_at < datetime.now(UTC):
            return None
        return row.payload

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        user_id = uuid.UUID(key)
        now = datetime.now(UTC)
        row = await self._db.get(StarCache, user_id)
        if row is None:
            row = StarCache(user_id=user_id, payload=value, fetched_at=now, expires_at=now)
            self._db.add(row)
        row.payload = value
        row.fetched_at = now
        row.expires_at = now + timedelta(seconds=ttl_seconds)
        await self._db.flush()

    async def delete(self, key: str) -> None:
        await self._db.execute(sa_delete(StarCache).where(StarCache.user_id == uuid.UUID(key)))

    async def evict_expired(self) -> int:
        result = await self._db.execute(
            sa_delete(StarCache).where(StarCache.expires_at < datetime.now(UTC))
        )
        return result.rowcount or 0  # type: ignore[attr-defined]
