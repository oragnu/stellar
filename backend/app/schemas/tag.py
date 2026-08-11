import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sort_order: int
    star_count: int = 0
    created_at: datetime


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class TagUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class TagReorder(BaseModel):
    ordered_ids: list[uuid.UUID]
