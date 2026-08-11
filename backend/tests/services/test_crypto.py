import pytest
from cryptography.fernet import InvalidToken

from app.config import Settings
from app.services.crypto import decrypt_token, encrypt_token


def test_encrypt_decrypt_roundtrip():
    settings = Settings(secret_encryption_key="a-test-key-that-is-not-32-bytes")
    token = "gho_supersecrettoken123"
    encrypted = encrypt_token(token, settings)
    assert encrypted != token.encode()
    assert decrypt_token(encrypted, settings) == token


def test_different_keys_cannot_decrypt():
    settings_a = Settings(secret_encryption_key="key-a")
    settings_b = Settings(secret_encryption_key="key-b")
    encrypted = encrypt_token("secret", settings_a)
    with pytest.raises(InvalidToken):
        decrypt_token(encrypted, settings_b)
