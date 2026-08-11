"""Fetches the user's starred repos from GitHub (paginated) and merges pages
into the star cache — same page-by-page merge spirit as the original app's
Laravel cache blob, but backed by app/services/cache/db.py by default.
"""

import asyncio
from datetime import UTC, datetime

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.user import User
from app.services.cache.db import DbCacheBackend
from app.services.crypto import decrypt_token
from app.services.github_client import GitHubClient, InvalidAccessTokenException

log = structlog.get_logger(__name__)

# Per-user locks so a manual "Refresh" click and the periodic background
# sync job never walk GitHub's paginated API concurrently for the same user.
_user_locks: dict[str, asyncio.Lock] = {}


def _lock_for(user_id: str) -> asyncio.Lock:
    return _user_locks.setdefault(user_id, asyncio.Lock())


def _normalize_edge(edge: dict) -> dict:
    node = edge["node"]
    releases = node.get("releases", {}).get("nodes") or []
    topics = [t["topic"]["name"] for t in node.get("repositoryTopics", {}).get("nodes", [])]
    return {
        "repo_id": node["databaseId"],
        "name_with_owner": node["nameWithOwner"],
        "description": node.get("description"),
        "url": node["url"],
        "is_archived": node["isArchived"],
        "pushed_at": node.get("pushedAt"),
        "default_branch": (node.get("defaultBranchRef") or {}).get("name"),
        "language": (node.get("primaryLanguage") or {}).get("name"),
        "stargazer_count": node["stargazerCount"],
        "fork_count": node["forkCount"],
        "topics": topics,
        "latest_release_tag": releases[0]["tagName"] if releases else None,
        "starred_at": edge.get("starredAt"),
    }


async def refresh_star_cache(
    user: User, db: AsyncSession, settings: Settings, *, force: bool = False
) -> list[dict]:
    """Fetch all pages of the user's starred repos and store the merged
    result in the star cache. Returns the merged list of normalized star
    records.
    """
    cache = DbCacheBackend(db)
    cache_key = str(user.id)

    if not force:
        cached = await cache.get(cache_key)
        if cached is not None:
            return cached

    async with _lock_for(cache_key):
        # Re-check after acquiring the lock — another request may have just
        # populated the cache while we were waiting.
        if not force:
            cached = await cache.get(cache_key)
            if cached is not None:
                return cached

        if not user.access_token_enc:
            raise InvalidAccessTokenException("No GitHub access token stored for this user")

        token = decrypt_token(user.access_token_enc, settings)
        client = GitHubClient(access_token=token)
        try:
            all_edges: list[dict] = []
            cursor: str | None = None
            has_next = True
            while has_next:
                page = await client.fetch_stars(cursor=cursor)
                all_edges.extend(_normalize_edge(e) for e in page.edges)
                cursor = page.end_cursor
                has_next = page.has_next_page
        finally:
            await client.aclose()

        await cache.set(cache_key, all_edges, ttl_seconds=settings.star_cache_ttl_hours * 3600)
        log.info("star_sync_complete", user_id=cache_key, count=len(all_edges))
        return all_edges


async def get_cached_stars(user: User, db: AsyncSession) -> list[dict] | None:
    cache = DbCacheBackend(db)
    return await cache.get(str(user.id))


def now_utc() -> datetime:
    return datetime.now(UTC)
