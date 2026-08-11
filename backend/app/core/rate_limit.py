"""Inbound API rate limiting via slowapi. In-memory storage by default
(fine for a single-instance self-host); set RATE_LIMIT_STORAGE_URI to a
redis:// URL for multi-instance deployments — see
docs/adr/0003-apscheduler-no-redis-by-default.md.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import Settings


def build_limiter(settings: Settings) -> Limiter:
    return Limiter(
        key_func=get_remote_address,
        storage_uri=settings.rate_limit_storage_uri,
        default_limits=["120/minute"],
    )
