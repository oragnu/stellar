#!/usr/bin/env bash
# Waits for the database, applies Alembic migrations, then execs the given
# command (gunicorn by default — see docker/Dockerfile's CMD). Running
# migrations here (at container START) rather than at image build time is
# a deliberate fix over the original app's Docker fork — see
# docs/adr/0002-postgres-primary-sqlite-best-effort.md.
set -euo pipefail

echo "[entrypoint] waiting for the database..."
python -m app.wait_for_db

echo "[entrypoint] running migrations..."
alembic upgrade head

echo "[entrypoint] starting: $*"
exec "$@"
