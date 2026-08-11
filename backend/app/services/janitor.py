"""Cleanup for local `Star` annotation rows — mirrors the original app's
StarsJanitor. Two independent sweeps:

  1. "Empty" rows: no tags and no notes — pointless local rows that add
     nothing over the live GitHub cache.
  2. "Unstarred" rows: repos no longer present in the user's current GitHub
     star list.

Unlike the original (which deleted immediately), Stellar's API exposes a
`/janitor/preview` step before `/janitor/run` — see docs/plan.md's
migration/parity table for the rationale.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.star import Star


async def _all_stars_with_tags(db: AsyncSession, user_id: uuid.UUID) -> list[Star]:
    # Eager-load tags: accessing a lazy relationship after the query has
    # returned isn't safe under AsyncSession (no greenlet context), so we
    # load everything we need up front.
    result = await db.execute(
        select(Star).where(Star.user_id == user_id).options(selectinload(Star.tags))
    )
    return list(result.scalars().all())


async def find_empty_stars(db: AsyncSession, user_id: uuid.UUID) -> list[Star]:
    stars = await _all_stars_with_tags(db, user_id)
    return [s for s in stars if not s.tags and not (s.notes and s.notes.strip())]


async def find_unstarred_stars(
    db: AsyncSession, user_id: uuid.UUID, current_repo_ids: set[int]
) -> list[Star]:
    """Only meaningful when `current_repo_ids` reflects a *complete* fetch of
    the user's GitHub stars (i.e. the cache isn't a partial/in-progress
    page walk) — callers should confirm the cache is fully populated before
    invoking this.
    """
    stars = await _all_stars_with_tags(db, user_id)
    return [s for s in stars if s.repo_id not in current_repo_ids]


async def preview(db: AsyncSession, user_id: uuid.UUID, current_repo_ids: set[int] | None) -> dict:
    empty = await find_empty_stars(db, user_id)
    unstarred = (
        await find_unstarred_stars(db, user_id, current_repo_ids) if current_repo_ids else []
    )
    to_delete_ids = {s.id for s in empty} | {s.id for s in unstarred}
    return {
        "empty_count": len(empty),
        "unstarred_count": len(unstarred),
        "total_to_delete": len(to_delete_ids),
        "star_ids": [str(sid) for sid in to_delete_ids],
    }


async def run(db: AsyncSession, user_id: uuid.UUID, current_repo_ids: set[int] | None) -> int:
    empty = await find_empty_stars(db, user_id)
    unstarred = (
        await find_unstarred_stars(db, user_id, current_repo_ids) if current_repo_ids else []
    )
    to_delete = {s.id: s for s in [*empty, *unstarred]}
    for star in to_delete.values():
        await db.delete(star)
    await db.flush()
    return len(to_delete)
