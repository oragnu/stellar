# Deploying with Docker (primary, recommended)

Stellar ships a single container image (FastAPI serving both the API and
the built React SPA) plus a Postgres service, orchestrated via
`docker/docker-compose.yml`. This is the primary, most-tested deployment
path.

## 1. Prerequisites

- Docker Engine + the Compose plugin (`docker compose version`)
- A [GitHub OAuth App](https://github.com/settings/developers):
  - Homepage URL: `https://your-domain.example.com`
  - Authorization callback URL: `https://your-domain.example.com/api/v1/auth/github/callback`
- A reverse proxy in front of Stellar for TLS termination — Stellar's
  container does not terminate TLS itself (same simple model the original
  app used). Any of Caddy, Traefik, nginx, or Nginx Proxy Manager works; a
  minimal Caddy example is below.

## 2. Configure

```bash
git clone https://github.com/oragnu/stellar.git
cd stellar
cp .env.example .env
```

Edit `.env`:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — from your OAuth App
- `SECRET_KEY` — generate with `openssl rand -hex 32`
- `SECRET_ENCRYPTION_KEY` — generate with
  `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- `POSTGRES_PASSWORD` — any strong password; must match the value baked into `DATABASE_URL`
- `BASE_URL` — your public URL, e.g. `https://stellar.example.com`
- `SESSION_COOKIE_SECURE=true` (default) — requires HTTPS; only set to
  `false` for local HTTP-only testing

## 3. Run

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

This builds the image, starts Postgres (with a healthcheck gate so the app
waits for the DB), and runs Alembic migrations automatically at container
**start** (via `docker/entrypoint.sh`) — no manual migration step needed on
first boot or on upgrades.

Check it's healthy:

```bash
docker compose --env-file .env -f docker/docker-compose.yml ps
curl http://localhost:8000/api/v1/health
```

## 4. Put a reverse proxy in front (example: Caddy)

```caddyfile
stellar.example.com {
    reverse_proxy localhost:8000
}
```

Caddy handles TLS (Let's Encrypt) automatically. Equivalent nginx/Traefik/
Nginx Proxy Manager configs just need to forward to `localhost:8000` (or the
`app` service on the Docker network, if your proxy is itself containerized
and attached to the same network).

## 5. Updating

```bash
git pull
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

Migrations run automatically on the new container's start, same as first
boot.

Alternatively, pull a published release image instead of building from
source:

```bash
docker pull ghcr.io/oragnu/stellar:latest
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

## 6. Backups

Postgres data lives in the named volume `stellar_db_data`. A simple manual
backup:

```bash
docker compose --env-file .env -f docker/docker-compose.yml exec db \
  pg_dump -U stellar stellar > backup-$(date +%Y%m%d).sql
```

Automate this with a cron job or systemd timer calling the same command,
rotating old backups as you see fit. (A fully managed backup story is not
built into Stellar itself — this is intentionally left to your existing
infra, same as most self-hosted apps.)

## 7. Optional: Redis

Stellar does not require Redis. If you're running multiple app replicas and
want a shared star-cache / rate-limit store, uncomment the `redis` service
in `docker/docker-compose.yml` (under the `redis` Compose profile) and set
`CACHE_BACKEND=redis` / `RATE_LIMIT_STORAGE_URI=redis://redis:6379/0` in
`.env`.

## Troubleshooting

- **OAuth callback mismatch**: double check the callback URL registered on
  GitHub exactly matches `${BASE_URL}/api/v1/auth/github/callback`.
- **App can't reach the DB / "password authentication failed for user
  stellar"**: `docker compose --env-file .env -f docker/docker-compose.yml
  logs db`. The usual cause is running `docker compose` **without**
  `--env-file .env`: because the compose file lives in `docker/`, Compose
  treats `docker/` as the project directory and looks for `docker/.env` for
  its own variable substitution (`${POSTGRES_PASSWORD:-changeme}`) — not the
  repo-root `.env` these docs have you create. Without the flag, `db` silently
  falls back to the `changeme` default while `app` (via `env_file: ../.env`)
  connects with your real password, and every request fails auth. Always
  invoke `docker compose` with `--env-file .env` from the repo root, as shown
  throughout this doc.
- **Stale frontend after an update**: rebuild with `--build` (not just `up
  -d`) — the SPA is baked into the image at build time.
