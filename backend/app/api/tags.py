import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_csrf
from app.models.star import star_tag
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagRead, TagReorder, TagUpdate

router = APIRouter(prefix="/tags", tags=["tags"], dependencies=[Depends(require_csrf)])


@router.get("", response_model=list[TagRead])
async def list_tags(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[TagRead]:
    result = await db.execute(
        select(Tag, func.count(star_tag.c.star_id))
        .outerjoin(star_tag, star_tag.c.tag_id == Tag.id)
        .where(Tag.user_id == user.id)
        .group_by(Tag.id)
        .order_by(Tag.sort_order)
    )
    return [
        TagRead.model_validate(tag).model_copy(update={"star_count": count})
        for tag, count in result.all()
    ]


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
async def create_tag(
    payload: TagCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Tag:
    existing = await db.execute(select(Tag).where(Tag.user_id == user.id, Tag.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "A tag with this name already exists")

    count_result = await db.execute(
        select(func.count()).select_from(Tag).where(Tag.user_id == user.id)
    )
    sort_order = count_result.scalar_one()

    tag = Tag(user_id=user.id, name=payload.name, sort_order=sort_order)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.patch("/{tag_id}", response_model=TagRead)
async def update_tag(
    tag_id: uuid.UUID,
    payload: TagUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Tag:
    tag = await db.get(Tag, tag_id)
    if tag is None or tag.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tag not found")
    tag.name = payload.name
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    tag = await db.get(Tag, tag_id)
    if tag is None or tag.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tag not found")
    await db.delete(tag)
    await db.commit()


@router.put("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_tags(
    payload: TagReorder,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Tag).where(Tag.user_id == user.id))
    tags_by_id = {t.id: t for t in result.scalars().all()}
    for index, tag_id in enumerate(payload.ordered_ids):
        tag = tags_by_id.get(tag_id)
        if tag is not None:
            tag.sort_order = index
    await db.commit()
