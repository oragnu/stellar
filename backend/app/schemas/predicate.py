import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PredicateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    body: dict[str, Any]
    sort_order: int
    created_at: datetime


class PredicateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    body: dict[str, Any]


class PredicateUpdate(BaseModel):
    name: str | None = None
    body: dict[str, Any] | None = None


class PredicateReorder(BaseModel):
    ordered_ids: list[uuid.UUID]


class PredicatePreviewRequest(BaseModel):
    body: dict[str, Any]
