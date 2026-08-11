import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.deps import get_current_user, require_csrf
from app.models.predicate import Predicate
from app.models.user import User
from app.schemas.predicate import (
    PredicateCreate,
    PredicatePreviewRequest,
    PredicateRead,
    PredicateReorder,
    PredicateUpdate,
)
from app.schemas.star import StarRecord
from app.services import predicate_engine, sync_service

router = APIRouter(prefix="/predicates", tags=["predicates"], dependencies=[Depends(require_csrf)])


@router.get("", response_model=list[PredicateRead])
async def list_predicates(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[Predicate]:
    result = await db.execute(
        select(Predicate).where(Predicate.user_id == user.id).order_by(Predicate.sort_order)
    )
    return list(result.scalars().all())


@router.post("", response_model=PredicateRead, status_code=status.HTTP_201_CREATED)
async def create_predicate(
    payload: PredicateCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Predicate:
    existing = await db.execute(
        select(Predicate).where(Predicate.user_id == user.id, Predicate.name == payload.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "A predicate with this name already exists")

    count_result = await db.execute(
        select(func.count()).select_from(Predicate).where(Predicate.user_id == user.id)
    )
    sort_order = count_result.scalar_one()

    predicate = Predicate(
        user_id=user.id, name=payload.name, body=payload.body, sort_order=sort_order
    )
    db.add(predicate)
    await db.commit()
    await db.refresh(predicate)
    return predicate


@router.patch("/{predicate_id}", response_model=PredicateRead)
async def update_predicate(
    predicate_id: uuid.UUID,
    payload: PredicateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Predicate:
    predicate = await db.get(Predicate, predicate_id)
    if predicate is None or predicate.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Predicate not found")
    if payload.name is not None:
        predicate.name = payload.name
    if payload.body is not None:
        predicate.body = payload.body
    await db.commit()
    await db.refresh(predicate)
    return predicate


@router.delete("/{predicate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_predicate(
    predicate_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    predicate = await db.get(Predicate, predicate_id)
    if predicate is None or predicate.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Predicate not found")
    await db.delete(predicate)
    await db.commit()


@router.put("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_predicates(
    payload: PredicateReorder,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Predicate).where(Predicate.user_id == user.id))
    by_id = {p.id: p for p in result.scalars().all()}
    for index, predicate_id in enumerate(payload.ordered_ids):
        predicate = by_id.get(predicate_id)
        if predicate is not None:
            predicate.sort_order = index
    await db.commit()


@router.post("/preview", response_model=list[StarRecord])
async def preview_predicate(
    payload: PredicatePreviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Evaluate an unsaved predicate body against the user's current cached
    stars, for the builder modal's live preview.
    """
    cached = await sync_service.get_cached_stars(user, db)
    if cached is None:
        settings = get_settings()
        cached = await sync_service.refresh_star_cache(user, db, settings)
    return predicate_engine.evaluate(payload.body, cached)
