# Deploying to Fly.io (recommended PaaS)

Fly.io is the recommended managed-hosting option for Stellar: first-class
Postgres, persistent volumes, straightforward mapping from our single
container image to a `fly.toml`, and small-VM pricing that suits a
lightweight self-hosted OSS app.

## 1. Prerequisites

- [`flyctl`](https://fly.io/docs/flyctl/install/) installed and authenticated (`fly auth login`)
- A GitHub OAuth App with its callback URL set to your eventual Fly app URL:
  `https://<your-app-name>.fly.dev/api/v1/auth/github/callback` (or a
  custom domain if you attach one)

## 2. Launch

From the repo root:

```bash
fly launch --no-deploy --dockerfile docker/Dockerfile
```

This generates a `fly.toml`. Set (or confirm) it exposes port `8000`
internally and defines an HTTP service on `443`/`80` forwarding to it.

## 3. Provision Postgres

```bash
fly postgres create --name stellar-db
fly postgres attach stellar-db -a <your-app-name>
```

`fly postgres attach` injects a `DATABASE_URL` secret automatically — make
sure it uses the `postgresql+asyncpg://` scheme Stellar expects (Fly's
default is `postgres://`; update the secret if needed:
`fly secrets set DATABASE_URL=postgresql+asyncpg://...`).

## 4. Set secrets

```bash
fly secrets set \
  SECRET_KEY=$(openssl rand -hex 32) \
  SECRET_ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())") \
  GITHUB_CLIENT_ID=... \
  GITHUB_CLIENT_SECRET=... \
  BASE_URL=https://<your-app-name>.fly.dev \
  SESSION_COOKIE_SECURE=true
```

## 5. Deploy

```bash
fly deploy
```

Migrations run automatically at container start (`docker/entrypoint.sh`),
same as the Docker recipe — nothing extra to run manually.

## 6. Persistent volume (only needed for future SQLite mode)

Not required for the recommended Postgres setup — Fly Postgres already
persists its own data. A `fly volumes create` step is only relevant if you
later run Stellar in its best-effort SQLite mode; skip this for the default,
Postgres-backed deployment.

## 7. Custom domain / scaling

- Attach a custom domain: `fly certs add stellar.example.com`, then point
  your DNS `CNAME`/`A` records per Fly's instructions.
- **Keep replicas at 1** unless you've also moved background jobs off
  APScheduler (see `docs/adr/0003-apscheduler-no-redis-by-default.md`) — the
  in-process scheduler assumes a single instance.

## Updating

CI publishes images to `ghcr.io/oragnu/stellar` on tagged releases
(`docker-publish.yml`). Point `fly.toml`'s `image` at a specific tag and run
`fly deploy` to roll out, or keep building from source with `fly deploy`
directly from the Dockerfile.
