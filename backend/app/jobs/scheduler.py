"""In-process APScheduler jobs — periodic star sync + cache/session
eviction. No Redis, no separate worker process. Assumes a single running
app replica; see docs/adr/0003-apscheduler-no-redis-by-default.md.
"""

from datetime import UTC, datetime

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import delete as sa_delete
from sqlalchemy import select

from app.config import Settings
from app.db import async_session_factory
from app.models.session import Session as SessionModel
from app.models.user import User
from app.services import sync_service
from app.services.cache.db import DbCacheBackend

log = structlog.get_logger(__name__)


async def sync_all_users_job(settings: Settings) -> None:
    async with async_session_factory() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        for user in users:
            try:
                await sync_service.refresh_star_cache(user, db, settings, force=True)
            except Exception as exc:  # noqa: BLE001 — one user's failure must not abort the sweep
                log.warning("periodic_sync_failed", user_id=str(user.id), error=str(exc))
        await db.commit()


async def evict_expired_cache_job() -> None:
    async with async_session_factory() as db:
        cache = DbCacheBackend(db)
        evicted = await cache.evict_expired()
        await db.commit()
        if evicted:
            log.info("cache_eviction_swept", count=evicted)


async def session_cleanup_job() -> None:
    async with async_session_factory() as db:
        result = await db.execute(
            sa_delete(SessionModel).where(SessionModel.expires_at < datetime.now(UTC))
        )
        await db.commit()
        rowcount: int = result.rowcount  # type: ignore[attr-defined]
        if rowcount:
            log.info("sessions_cleaned_up", count=rowcount)


def create_scheduler(settings: Settings) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        sync_all_users_job, IntervalTrigger(hours=4), args=[settings], id="sync_all_users"
    )
    scheduler.add_job(evict_expired_cache_job, IntervalTrigger(hours=1), id="evict_expired_cache")
    scheduler.add_job(session_cleanup_job, IntervalTrigger(hours=6), id="session_cleanup")
    return scheduler
