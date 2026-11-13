import pytest

from app.config import Settings


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        # Driver-less URLs, as Render / Fly.io / Railway provide them.
        (
            "postgresql://user:pw@host:5432/db",
            "postgresql+asyncpg://user:pw@host:5432/db",
        ),
        (
            "postgres://user:pw@host/db",
            "postgresql+asyncpg://user:pw@host/db",
        ),
        # Explicit drivers are left alone.
        (
            "postgresql+asyncpg://user:pw@host/db",
            "postgresql+asyncpg://user:pw@host/db",
        ),
        ("sqlite+aiosqlite:///./stellar.db", "sqlite+aiosqlite:///./stellar.db"),
    ],
)
def test_database_url_uses_asyncpg(given: str, expected: str) -> None:
    assert Settings(database_url=given).database_url == expected


def test_database_url_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@host/db")
    assert Settings().database_url == "postgresql+asyncpg://user:pw@host/db"
