# syntax=docker/dockerfile:1
#
# Multi-stage build: Node builds the React SPA, uv installs Python deps,
# and the final slim runtime combines both into a single deployable image.
# Build context is the REPO ROOT (see docker-compose.yml's `build.context`)
# so this file can reference both backend/ and frontend/.
#
# Migrations run at container START (docker/entrypoint.sh), not at build
# time — see docs/adr/0002-postgres-primary-sqlite-best-effort.md and the
# packaging notes in docs/plan.md for why the original app's fork got this
# wrong.

FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS python-deps
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.12-slim-bookworm AS runtime
RUN useradd --create-home --uid 1000 stellar
WORKDIR /app

# Runtime OS deps: libpq for asyncpg's binary wheel deps, curl for the
# HEALTHCHECK.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=python-deps /app/backend/.venv /app/backend/.venv
COPY backend/ /app/backend/
COPY --from=frontend-build /app/frontend/dist /app/backend/static

ENV PATH="/app/backend/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && chown -R stellar:stellar /app

USER stellar
WORKDIR /app/backend
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "--workers", "1", "--bind", "0.0.0.0:8000"]
