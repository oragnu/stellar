"""SQLAlchemy 2.0 declarative models.

Import order matters for Alembic autogenerate to see every table — this
module re-exports everything so `from app.models import Base` (or any
model) always has the full metadata registered.
"""

from app.db import Base
from app.models.predicate import Predicate
from app.models.session import Session
from app.models.star import Star, star_tag
from app.models.star_cache import StarCache
from app.models.tag import Tag
from app.models.user import User

__all__ = [
    "Base",
    "User",
    "Session",
    "Star",
    "star_tag",
    "Tag",
    "Predicate",
    "StarCache",
]
