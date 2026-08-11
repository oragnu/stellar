import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._types import created_at_col, updated_at_col, uuid_pk

if TYPE_CHECKING:
    from app.models.predicate import Predicate
    from app.models.session import Session
    from app.models.star import Star
    from app.models.tag import Tag


class User(Base):
    """A Stellar account. Always GitHub-authenticated — see
    docs/adr/0004-server-side-sessions-not-jwt.md and
    docs/adr/0005-single-user-no-multi-tenancy-v1.md.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    github_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True, nullable=False)
    github_login: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(1024))

    # Fernet-encrypted GitHub OAuth access token. Never exposed via any
    # response schema — see app/schemas/user.py and app/services/crypto.py.
    access_token_enc: Mapped[bytes | None] = mapped_column(LargeBinary)
    token_scope: Mapped[str | None] = mapped_column(String(255))

    autotag_topics: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    show_language_tags: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    autosave_notes: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    sessions: Mapped[list["Session"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    stars: Mapped[list["Star"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    predicates: Mapped[list["Predicate"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
