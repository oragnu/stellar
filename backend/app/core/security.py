"""Session cookie signing + CSRF double-submit helpers.

Sessions are server-side (see app/models/session.py and
docs/adr/0004-server-side-sessions-not-jwt.md): the cookie holds a signed,
opaque, random token; only a SHA-256 hash of that token is ever stored in
the database, so a DB read alone can't forge a session.
"""

import hashlib
import secrets

from itsdangerous import BadSignature, URLSafeTimedSerializer

from app.config import Settings


def _serializer(settings: Settings) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.secret_key, salt="stellar-session")


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def sign_session_cookie(token: str, settings: Settings) -> str:
    return _serializer(settings).dumps(token)


def unsign_session_cookie(cookie_value: str, settings: Settings) -> str | None:
    try:
        return _serializer(settings).loads(
            cookie_value, max_age=settings.session_lifetime_days * 86400
        )
    except BadSignature:
        return None


def new_csrf_token() -> str:
    return secrets.token_urlsafe(24)


def csrf_tokens_match(cookie_token: str | None, header_token: str | None) -> bool:
    if not cookie_token or not header_token:
        return False
    return secrets.compare_digest(cookie_token, header_token)
