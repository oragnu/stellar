import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, Table, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._types import GUID, created_at_col, updated_at_col, uuid_pk

if TYPE_CHECKING:
    from app.models.tag import Tag
    from app.models.user import User

# m2m pivot: stars <-> tags
star_tag = Table(
    "star_tag",
    Base.metadata,
    Column("star_id", GUID(), ForeignKey("stars.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", GUID(), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Star(Base):
    """A LOCAL annotation row — one per starred repo the user has tagged or
    noted. This does NOT mirror GitHub's star graph; the live star list is
    fetched + cached separately (see app/models/star_cache.py and
    app/services/sync_service.py). `repo_id` is GitHub's own numeric
    `databaseId`, used as a natural key rather than wrapped in a surrogate.
    """

    __tablename__ = "stars"
    __table_args__ = (UniqueConstraint("user_id", "repo_id", name="uq_stars_user_repo"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    repo_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    autotagged_by_topic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    user: Mapped["User"] = relationship(back_populates="stars")
    tags: Mapped[list["Tag"]] = relationship(secondary=star_tag, back_populates="stars")
