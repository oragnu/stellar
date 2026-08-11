from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import get_current_user, require_csrf
from app.models.user import User
from app.schemas.user import UserRead, UserSettingsUpdate
from app.services import autotagger, sync_service

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(require_csrf)])


@router.patch("", response_model=UserRead)
async def update_settings(
    payload: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/autotag/run")
async def run_autotag(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    cached = await sync_service.get_cached_stars(user, db)
    if cached is None:
        cached = await sync_service.refresh_star_cache(user, db, settings)
    applied = await autotagger.tag_by_topic(db, user.id, cached)
    await db.commit()
    return {"applied_count": applied}
