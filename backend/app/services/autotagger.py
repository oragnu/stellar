"""Auto-create/apply tags from a starred repo's GitHub topics — mirrors the
original app's Autotagger. Only touches stars not already
`autotagged_by_topic`, so re-running doesn't clobber manual tag edits.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.star import Star
from app.models.tag import Tag


async def _get_or_create_tag(db: AsyncSession, user_id: uuid.UUID, name: str) -> Tag:
    result = await db.execute(select(Tag).where(Tag.user_id == user_id, Tag.name == name))
    tag = result.scalar_one_or_none()
    if tag is None:
        count_result = await db.execute(select(Tag).where(Tag.user_id == user_id))
        sort_order = len(count_result.scalars().all())
        tag = Tag(user_id=user_id, name=name, sort_order=sort_order)
        db.add(tag)
        await db.flush()
    return tag


async def _get_or_create_star(db: AsyncSession, user_id: uuid.UUID, repo_id: int) -> Star:
    result = await db.execute(
        select(Star)
        .where(Star.user_id == user_id, Star.repo_id == repo_id)
        .options(selectinload(Star.tags))
    )
    star = result.scalar_one_or_none()
    if star is None:
        star = Star(user_id=user_id, repo_id=repo_id)
        db.add(star)
        await db.flush()
    return star


async def tag_by_topic(db: AsyncSession, user_id: uuid.UUID, cached_stars: list[dict]) -> int:
    """Apply topic-derived tags across the cached star list. Returns the
    number of stars newly autotagged.
    """
    applied = 0
    for record in cached_stars:
        topics = record.get("topics") or []
        if not topics:
            continue
        star = await _get_or_create_star(db, user_id, record["repo_id"])
        if star.autotagged_by_topic:
            continue
        for topic_name in topics:
            tag = await _get_or_create_tag(db, user_id, topic_name)
            if tag not in star.tags:
                star.tags.append(tag)
        star.autotagged_by_topic = True
        applied += 1
    await db.flush()
    return applied
