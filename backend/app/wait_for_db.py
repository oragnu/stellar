"""Small startup helper: block until the database accepts connections, with
backoff, before Alembic/uvicorn try to use it. Run as `python -m
app.wait_for_db` from docker/entrypoint.sh.
"""

import asyncio
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings

MAX_ATTEMPTS = 30
DELAY_SECONDS = 2


async def wait_for_db() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    try:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
                print(f"[wait_for_db] database is ready (attempt {attempt})")
                return
            except Exception as exc:  # noqa: BLE001 — retry on any connection failure
                print(f"[wait_for_db] attempt {attempt}/{MAX_ATTEMPTS} failed: {exc}")
                if attempt == MAX_ATTEMPTS:
                    print("[wait_for_db] giving up", file=sys.stderr)
                    sys.exit(1)
                await asyncio.sleep(DELAY_SECONDS)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(wait_for_db())
