"""Application configuration, loaded from environment variables / .env.

Single canonical settings surface for every deployment target (Docker,
Fly.io, Railway, bare-metal) — see ../../.env.example for the full list
with generation instructions for the secret values.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Core ---
    app_env: Literal["local", "production", "test"] = "local"
    base_url: str = "http://localhost:8000"
    secret_key: str = Field(default="dev-only-insecure-secret-key-change-me")
    secret_encryption_key: str = Field(default="dev-only-insecure-encryption-key-change-me-32b-")

    # --- Database ---
    database_url: str = "postgresql+asyncpg://stellar:stellar@localhost:5432/stellar"
    db_echo: bool = False

    # --- GitHub OAuth ---
    github_client_id: str = ""
    github_client_secret: str = ""
    github_oauth_scope: str = "read:user"

    # --- Cache / rate limiting ---
    cache_backend: Literal["memory", "db", "redis"] = "db"
    rate_limit_storage_uri: str = "memory://"
    redis_url: str | None = None

    # --- Cookies ---
    session_cookie_name: str = "stellar_session"
    csrf_cookie_name: str = "stellar_csrf"
    session_cookie_secure: bool = True
    session_cookie_domain: str | None = None
    session_lifetime_days: int = 30

    # --- Sync tuning ---
    star_cache_ttl_hours: int = 4
    scheduler_enabled: bool = True

    # --- CORS (dev only; prod serves SPA same-origin) ---
    cors_allow_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
