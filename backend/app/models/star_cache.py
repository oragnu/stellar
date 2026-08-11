import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db import Base
from app.models._types import GUID


class StarCache(Base):
    """Cached GitHub GraphQL star-list payload, one row per user.

    Replaces the original app's file-based Laravel cache blob — see
    app/services/sync_service.py and app/services/cache/.
    """

    __tablename__ = "star_cache"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    payload: Mapped[list] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
