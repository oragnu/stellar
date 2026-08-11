"""Shared FastAPI Depends() providers: DB session, current user, CSRF check."""

from collections.abc import AsyncGenerator

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.security import csrf_tokens_match, hash_session_token, unsign_session_cookie
from app.db import get_db
from app.models.session import Session as SessionModel
from app.models.user import User


async def get_current_settings() -> Settings:
    return get_settings()


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_current_settings),
) -> User:
    cookie_value = request.cookies.get(settings.session_cookie_name)
    if not cookie_value:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    token = unsign_session_cookie(cookie_value, settings)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")

    session_hash = hash_session_token(token)
    result = await db.execute(select(SessionModel).where(SessionModel.session_hash == session_hash))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session not found")

    user = await db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def require_csrf(
    request: Request,
    settings: Settings = Depends(get_current_settings),
    csrf_cookie: str | None = Cookie(default=None, alias=None),
) -> None:
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    header_token = request.headers.get("X-CSRF-Token")
    if not csrf_tokens_match(cookie_token, header_token):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF token missing or invalid")


async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db():
        yield session
