import uuid
from typing import Any

from pydantic import BaseModel


class StarRecord(BaseModel):
    """Merged view: cached GitHub fields + local annotation fields."""

    repo_id: int
    name_with_owner: str
    description: str | None = None
    url: str
    is_archived: bool = False
    pushed_at: str | None = None
    default_branch: str | None = None
    language: str | None = None
    stargazer_count: int = 0
    fork_count: int = 0
    topics: list[str] = []
    latest_release_tag: str | None = None
    starred_at: str | None = None

    # local annotations
    notes: str | None = None
    tag_names: list[str] = []
    tag_ids: list[uuid.UUID] = []


class StarListResponse(BaseModel):
    items: list[StarRecord]
    meta: dict[str, Any]


class StarNotesUpdate(BaseModel):
    notes: str | None = None


class BulkTagRequest(BaseModel):
    repo_ids: list[int]
    add_tag_ids: list[uuid.UUID] = []
    remove_tag_ids: list[uuid.UUID] = []


class JanitorRequest(BaseModel):
    """Body is intentionally empty for now — janitor operates over the
    currently authenticated user's full star set. Kept as a distinct model
    so query-scoping options (e.g. dry-run flags) can be added later
    without changing the route signature.
    """
