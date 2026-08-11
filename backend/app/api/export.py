import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services import sync_service

router = APIRouter(prefix="/export", tags=["export"])


@router.get("")
async def export_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    cached = await sync_service.get_cached_stars(user, db)
    if cached is None:
        cached = await sync_service.refresh_star_cache(user, db, settings)

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.models.star import Star

    result = await db.execute(
        select(Star).where(Star.user_id == user.id).options(selectinload(Star.tags))
    )
    local_by_repo_id = {s.repo_id: s for s in result.scalars().all()}

    export_records = []
    for record in cached:
        local = local_by_repo_id.get(record["repo_id"])
        export_records.append(
            {
                **record,
                "notes": local.notes if local else None,
                "tags": [t.name for t in local.tags] if local else [],
            }
        )

    payload = {
        "exported_at": datetime.now(UTC).isoformat(),
        "user": user.github_login,
        "stars": export_records,
    }

    def _stream():
        yield json.dumps(payload, indent=2)

    filename = f"{user.github_login}_stellar_export.json"
    return StreamingResponse(
        _stream(),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
