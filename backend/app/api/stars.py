import uuid

import bleach
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import get_current_user, require_csrf
from app.models.star import Star
from app.models.tag import Tag
from app.models.user import User
from app.schemas.star import (
    BulkTagRequest,
    JanitorRequest,
    StarListResponse,
    StarNotesUpdate,
    StarRecord,
)
from app.services import janitor, predicate_engine, sync_service
from app.services.crypto import decrypt_token
from app.services.github_client import GitHubClient

router = APIRouter(prefix="/stars", tags=["stars"], dependencies=[Depends(require_csrf)])


async def _merged_stars(user: User, db: AsyncSession, settings: Settings) -> list[dict]:
    cached = await sync_service.get_cached_stars(user, db)
    if cached is None:
        cached = await sync_service.refresh_star_cache(user, db, settings)

    result = await db.execute(
        select(Star).where(Star.user_id == user.id).options(selectinload(Star.tags))
    )
    local_by_repo_id = {s.repo_id: s for s in result.scalars().all()}

    merged = []
    for record in cached:
        local = local_by_repo_id.get(record["repo_id"])
        merged.append(
            {
                **record,
                "notes": local.notes if local else None,
                "tag_names": [t.name for t in local.tags] if local else [],
                "tag_ids": [t.id for t in local.tags] if local else [],
            }
        )
    return merged


@router.get("", response_model=StarListResponse)
async def list_stars(
    tag_id: uuid.UUID | None = None,
    predicate_id: uuid.UUID | None = None,
    untagged: bool = False,
    q: str | None = None,
    language: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    stars = await _merged_stars(user, db, settings)

    if tag_id is not None:
        stars = [s for s in stars if tag_id in s["tag_ids"]]
    if untagged:
        stars = [s for s in stars if not s["tag_ids"]]
    if language:
        stars = [s for s in stars if (s.get("language") or "").lower() == language.lower()]
    if q:
        needle = q.lower()
        stars = [
            s
            for s in stars
            if needle in (s.get("name_with_owner") or "").lower()
            or needle in (s.get("description") or "").lower()
            or needle in (s.get("notes") or "").lower()
        ]
    if predicate_id is not None:
        from app.models.predicate import Predicate

        predicate = await db.get(Predicate, predicate_id)
        if predicate is None or predicate.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Predicate not found")
        stars = predicate_engine.evaluate(predicate.body, stars)

    return {"items": stars, "meta": {"total": len(stars)}}


@router.post("/sync", response_model=StarListResponse)
async def sync_stars(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    await sync_service.refresh_star_cache(user, db, settings, force=True)
    await db.commit()
    stars = await _merged_stars(user, db, settings)
    return {"items": stars, "meta": {"total": len(stars)}}


@router.get("/{repo_id}", response_model=StarRecord)
async def get_star(
    repo_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    stars = await _merged_stars(user, db, settings)
    for record in stars:
        if record["repo_id"] == repo_id:
            return record
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Star not found in your GitHub stars")


@router.patch("/{repo_id}", response_model=StarRecord)
async def update_star_notes(
    repo_id: int,
    payload: StarNotesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    result = await db.execute(select(Star).where(Star.user_id == user.id, Star.repo_id == repo_id))
    star = result.scalar_one_or_none()
    if star is None:
        star = Star(user_id=user.id, repo_id=repo_id)
        db.add(star)
    star.notes = bleach.clean(payload.notes) if payload.notes else payload.notes
    await db.commit()

    stars = await _merged_stars(user, db, settings)
    for record in stars:
        if record["repo_id"] == repo_id:
            return record
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Star not found in your GitHub stars")


@router.get("/{repo_id}/readme")
async def get_readme(
    repo_id: int,
    name_with_owner: str = Query(..., description="owner/repo, from the star record"),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> dict:
    if not user.access_token_enc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No GitHub access token stored")
    token = decrypt_token(user.access_token_enc, settings)
    client = GitHubClient(access_token=token)
    try:
        html = await client.fetch_readme_html(name_with_owner)
    finally:
        await client.aclose()
    if html is None:
        return {"html": None}
    return {
        "html": bleach.clean(
            html,
            tags=bleach.sanitizer.ALLOWED_TAGS
            | {
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "p",
                "pre",
                "img",
                "table",
                "thead",
                "tbody",
                "tr",
                "th",
                "td",
                "span",
                "div",
                "br",
                "hr",
            },
            attributes={
                "*": ["class", "id"],
                "a": ["href", "name", "target"],
                "img": ["src", "alt", "width", "height"],
            },
        )
    }


@router.post("/bulk-tag", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_tag(
    payload: BulkTagRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    tags_result = await db.execute(
        select(Tag).where(
            Tag.user_id == user.id, Tag.id.in_(payload.add_tag_ids + payload.remove_tag_ids)
        )
    )
    tags_by_id = {t.id: t for t in tags_result.scalars().all()}

    for repo_id in payload.repo_ids:
        result = await db.execute(
            select(Star)
            .where(Star.user_id == user.id, Star.repo_id == repo_id)
            .options(selectinload(Star.tags))
        )
        star = result.scalar_one_or_none()
        if star is None:
            star = Star(user_id=user.id, repo_id=repo_id)
            db.add(star)
            await db.flush()

        for tag_id in payload.add_tag_ids:
            tag = tags_by_id.get(tag_id)
            if tag and tag not in star.tags:
                star.tags.append(tag)
        for tag_id in payload.remove_tag_ids:
            tag = tags_by_id.get(tag_id)
            if tag and tag in star.tags:
                star.tags.remove(tag)

    await db.commit()


@router.post("/janitor/preview")
async def janitor_preview(
    _: JanitorRequest = JanitorRequest(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    cached = await sync_service.get_cached_stars(user, db)
    repo_ids = {r["repo_id"] for r in cached} if cached is not None else None
    return await janitor.preview(db, user.id, repo_ids)


@router.post("/janitor/run")
async def janitor_run(
    _: JanitorRequest = JanitorRequest(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    cached = await sync_service.get_cached_stars(user, db)
    repo_ids = {r["repo_id"] for r in cached} if cached is not None else None
    deleted = await janitor.run(db, user.id, repo_ids)
    await db.commit()
    return {"deleted_count": deleted}
