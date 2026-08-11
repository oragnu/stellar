import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    """Public shape of a User. Deliberately excludes access_token_enc /
    token_scope internals — the encrypted token must never appear in an
    API response.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    github_login: str
    avatar_url: str | None
    autotag_topics: bool
    show_language_tags: bool
    autosave_notes: bool
    created_at: datetime


class UserSettingsUpdate(BaseModel):
    autotag_topics: bool | None = None
    show_language_tags: bool | None = None
    autosave_notes: bool | None = None
