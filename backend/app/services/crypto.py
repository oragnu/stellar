"""Encrypt/decrypt the GitHub access token at rest.

Uses Fernet (authenticated symmetric encryption, handles IV + auth tag +
versioning for us) keyed by SECRET_ENCRYPTION_KEY. See
docs/SECURITY.md and .env.example for key-generation instructions.
"""

import base64
import hashlib

from cryptography.fernet import Fernet

from app.config import Settings


def _derive_fernet_key(raw_key: str) -> bytes:
    """Accept any string secret and derive a valid 32-byte urlsafe-base64
    Fernet key from it, so operators don't have to hand-generate a
    perfectly-shaped Fernet key themselves (though `.env.example` shows how
    to). SHA-256 + base64 gives a deterministic, correctly-sized key.
    """
    digest = hashlib.sha256(raw_key.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def get_fernet(settings: Settings) -> Fernet:
    return Fernet(_derive_fernet_key(settings.secret_encryption_key))


def encrypt_token(token: str, settings: Settings) -> bytes:
    return get_fernet(settings).encrypt(token.encode("utf-8"))


def decrypt_token(token_enc: bytes, settings: Settings) -> str:
    return get_fernet(settings).decrypt(token_enc).decode("utf-8")
