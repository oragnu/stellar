"""FastAPI app factory — the backbone every other backend module hangs off.

Wires: config, structured logging, DB engine (via app.db), the APScheduler
background jobs, inbound rate limiting, CSRF-aware routers, and (in
production) serving the built React SPA as static files alongside the
/api/v1 routes.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import Scope

from app.api import auth, export, health, predicates, stars, tags
from app.api import settings as settings_router
from app.config import get_settings
from app.core.logging import configure_logging
from app.core.rate_limit import build_limiter
from app.jobs.scheduler import create_scheduler

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


class SPAStaticFiles(StaticFiles):
    """Serves the built React SPA, falling back to index.html for unknown
    paths so React Router's client-side routes (e.g. /dashboard) resolve on
    a hard refresh or a full-page redirect landing (e.g. the GitHub OAuth
    callback), instead of surfacing StaticFiles' bare 404 for a path that
    isn't a real static asset. Confirmed missing by the Railway deploy
    validation in docs/plan.md Phase 5 — hard-refreshing /dashboard 404'd
    until this was added.

    Only falls back for genuinely unknown paths, not API ones: a typo'd or
    retired /api/v1/* route should still 404 as JSON, not silently serve
    the SPA's index.html (this mount only ever sees /api/v1/* paths that
    every registered router already declined to match).
    """

    async def get_response(self, path: str, scope: Scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            # `path` is an OS-normalized filesystem path (backslashes on
            # Windows) — check the actual URL path instead, which is
            # always forward-slash regardless of host OS.
            is_api_path = scope["path"].lstrip("/").startswith("api/")
            if exc.status_code == 404 and not is_api_path:
                return await super().get_response("index.html", scope)
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    scheduler = None
    if settings.scheduler_enabled and settings.app_env != "test":
        scheduler = create_scheduler(settings)
        scheduler.start()
    yield
    if scheduler is not None:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title="Stellar API",
        description="Organize your GitHub stars — tags, notes, and smart filters.",
        version="0.1.0",
        lifespan=lifespan,
    )

    limiter = build_limiter(settings)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    if settings.app_env == "local":
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    api_prefix = "/api/v1"
    app.include_router(health.router, prefix=api_prefix)
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(stars.router, prefix=api_prefix)
    app.include_router(tags.router, prefix=api_prefix)
    app.include_router(predicates.router, prefix=api_prefix)
    app.include_router(settings_router.router, prefix=api_prefix)
    app.include_router(export.router, prefix=api_prefix)

    # In production the built React SPA lives at /app/static (see
    # docker/Dockerfile) and is served for every non-API route so
    # client-side routing (React Router) works on a hard refresh.
    if STATIC_DIR.is_dir():
        app.mount("/", SPAStaticFiles(directory=STATIC_DIR, html=True), name="spa")

    return app


app = create_app()
