import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db import Base
from app.models._types import created_at_col, updated_at_col, uuid_pk

if TYPE_CHECKING:
    from app.models.user import User


class Predicate(Base):
    """A saved smart filter: nested any/all/none rule groups.

    `body` shape (evaluated in app/services/predicate_engine.py, not via
    DB-side JSON operators — see docs/adr/0002-postgres-primary-sqlite-best-effort.md):

        {
          "logical_type": "all" | "any" | "none",
          "rules": [
            {"field": "language", "operator": "is", "value": "Python"},
            {"logical_type": "any", "rules": [...]}   # nested groups allowed
          ]
        }
    """

    __tablename__ = "predicates"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_predicates_user_name"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[dict] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    user: Mapped["User"] = relationship(back_populates="predicates")
