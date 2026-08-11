"""GitHub OAuth flow + session lifecycle.

Sequence (see docs/plan.md § API Design):
  1. GET /auth/github/login   -> redirect to GitHub with a random `state`
  2. GitHub redirects back to /auth/github/callback?code=...&state=...
  3. exchange code for a token, upsert User, encrypt+store token,
     create a Session row, set signed session + CSRF cookies
  4. GET /auth/me             -> hydrate the frontend's auth store
  5. POST /auth/logout        -> invalidate the session row
  6. DELETE /auth/account     -> revoke GitHub grant + cascade-delete everything
"""

import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.security import (
    hash_session_token,
    new_csrf_token,
    new_session_token,
    sign_session_cookie,
    unsign_session_cookie,
)
from app.db import get_db
from app.deps import get_current_user
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.user import UserRead
from app.services.crypto import encrypt_token
from app.services.github_client import GitHubClient

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

_OAUTH_STATE_COOKIE = "stellar_oauth_state"


@router.get("/github/login")
async def github_login(settings: Settings = Depends(get_settings)) -> Response:
    state = secrets.token_urlsafe(24)
    params = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": f"{settings.base_url}/api/v1/auth/github/callback",
            "scope": settings.github_oauth_scope,
            "state": state,
        }
    )
    response = Response(status_code=status.HTTP_302_FOUND)
    response.headers["Location"] = f"{GITHUB_AUTHORIZE_URL}?{params}"
    response.set_cookie(
        _OAUTH_STATE_COOKIE,
        state,
        max_age=600,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )
    return response


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    expected_state = request.cookies.get(_OAUTH_STATE_COOKIE)
    if not expected_state or not secrets.compare_digest(expected_state, state):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth state")

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": f"{settings.base_url}/api/v1/auth/github/callback",
            },
        )
        token_resp.raise_for_status()
        token_payload = token_resp.json()
        access_token = token_payload.get("access_token")
        if not access_token:
            log.error("github_oauth_token_exchange_failed", payload=token_payload)
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "GitHub OAuth exchange failed")

        user_resp = await client.get(
            GITHUB_USER_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        user_resp.raise_for_status()
        gh_user = user_resp.json()

    result = await db.execute(select(User).where(User.github_id == gh_user["id"]))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(github_id=gh_user["id"], github_login=gh_user["login"])
        db.add(user)

    user.github_login = gh_user["login"]
    user.avatar_url = gh_user.get("avatar_url")
    user.access_token_enc = encrypt_token(access_token, settings)
    user.token_scope = token_payload.get("scope", settings.github_oauth_scope)
    await db.flush()

    session_token = new_session_token()
    now = datetime.now(UTC)
    session_row = SessionModel(
        user_id=user.id,
        session_hash=hash_session_token(session_token),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=now + timedelta(days=settings.session_lifetime_days),
        last_seen_at=now,
    )
    db.add(session_row)
    await db.commit()

    response = Response(status_code=status.HTTP_302_FOUND)
    response.headers["Location"] = f"{settings.base_url}/dashboard"
    response.delete_cookie(_OAUTH_STATE_COOKIE)
    response.set_cookie(
        settings.session_cookie_name,
        sign_session_cookie(session_token, settings),
        max_age=settings.session_lifetime_days * 86400,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        domain=settings.session_cookie_domain,
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        new_csrf_token(),
        max_age=settings.session_lifetime_days * 86400,
        httponly=False,  # frontend JS must read this to echo it back as X-CSRF-Token
        secure=settings.session_cookie_secure,
        samesite="lax",
        domain=settings.session_cookie_domain,
    )
    return response


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    cookie_value = request.cookies.get(settings.session_cookie_name)
    if cookie_value:
        token = unsign_session_cookie(cookie_value, settings)
        if token:
            session_hash = hash_session_token(token)
            result = await db.execute(
                select(SessionModel).where(SessionModel.session_hash == session_hash)
            )
            session_row = result.scalar_one_or_none()
            if session_row:
                await db.delete(session_row)
                await db.commit()

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(settings.session_cookie_name)
    response.delete_cookie(settings.csrf_cookie_name)
    return response


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    if user.access_token_enc:
        from app.services.crypto import decrypt_token

        token = decrypt_token(user.access_token_enc, settings)
        client = GitHubClient(access_token=token)
        try:
            await client.revoke_grant(settings.github_client_id, settings.github_client_secret)
        finally:
            await client.aclose()

    await db.delete(user)  # cascades sessions/stars/tags/predicates/star_cache
    await db.commit()

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(settings.session_cookie_name)
    response.delete_cookie(settings.csrf_cookie_name)
    return response
