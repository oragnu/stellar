# Deploying to Railway (secondary PaaS option)

Railway is a good alternative to Fly.io if you want the simplest possible
click-through setup and don't mind usage-based pricing (which can be less
predictable than Fly's small fixed-VM pricing — that's why Fly is the
primary recommendation; Railway is documented here as a solid secondary
option, not a lesser one).

Validated end-to-end for Phase 5's `v0.1.0` cut: a real Railway project,
Postgres plugin, GitHub OAuth App, and deploy of this repo's `main` branch,
confirmed with a real GitHub login and a real (788-repo) star sync. Two
non-obvious steps below (the `railway.json` builder pin and the explicit
domain target port) come directly from that run, not from Railway's docs —
skipping either one produces a confusing failure with no obvious fix in the
Railway dashboard.

## Steps

1. Create a new Railway project, "Deploy from GitHub repo," pick your fork
   of `oragnu/stellar`.
2. Add a **PostgreSQL** plugin to the project — Railway provisions it and
   exposes `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` (among others)
   automatically.
3. **Pin the build to `docker/Dockerfile`.** This repo ships a
   `railway.json` at the repo root for exactly this reason — Railway's
   Railpack auto-builder can't sensibly build a combined Python-backend +
   Node-frontend repo like this one on its own, and will silently build
   *something* (a broken one) instead of erroring, which is a confusing
   thing to debug after the fact. As long as `railway.json` is present at
   the repo root, Railway picks it up automatically; no dashboard build
   setting to change. If you're deploying a fork with a different layout,
   the file's `build.dockerfilePath` is the one setting that matters.
4. In the Stellar service's **Variables**, set:
   - `DATABASE_URL` — reference the Postgres plugin's individual vars and
     rewrite the scheme to `postgresql+asyncpg://` (Railway's own
     `DATABASE_URL` reference defaults to plain `postgresql://`, which
     `asyncpg` will reject):
     ```
     postgresql+asyncpg://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
     ```
   - `SECRET_KEY` (generate: `openssl rand -hex 32`)
   - `SECRET_ENCRYPTION_KEY` (generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — see step 6 below for the
     callback URL these need to match
   - `BASE_URL` — your Railway-provided domain (or custom domain)
   - `SESSION_COOKIE_SECURE=true`
   - `PORT=8000` — **required**. Without it, Railway can't determine which
     port to route traffic (or its own healthcheck) to, and the deploy
     fails its healthcheck and gets rolled back even though the container
     is actually running and healthy — the container logs show a normal
     startup with no error, which makes this one easy to misdiagnose as an
     app bug. The app itself always listens on 8000 (`docker/entrypoint.sh`
     hardcodes `--bind 0.0.0.0:8000`, same as every other deployment
     target); this variable only tells Railway's proxy/healthchecker where
     to find it.
5. Generate a public domain for the service (**Settings → Networking →
   Generate Domain**), then set its **target port to 8000** — same
   reasoning as the `PORT` variable above; the CLI equivalent is
   `railway domain update <domain> --port 8000`.
6. Create the GitHub OAuth App (`https://github.com/settings/applications/new`)
   with:
   - **Homepage URL**: `https://<your-domain>`
   - **Authorization callback URL**: `https://<your-domain>/api/v1/auth/github/callback`
   - **Enable Device Flow**: leave unchecked (that's for CLI-style
     device-code auth; Stellar uses the standard web Authorization Code
     flow)
7. Deploy (or redeploy after setting the variables above). Railway
   auto-redeploys on every push to your connected branch once the service
   source is connected — migrations run automatically at container start,
   same as every other recipe. If a push doesn't trigger a redeploy on its
   own, `railway service source connect --repo <owner>/<repo> --branch main --service <name>`
   re-establishes the trigger.
8. Attach a custom domain under the service's **Settings → Domains** if
   desired; Railway handles TLS for both its generated and custom domains.

## Notes

- Keep the service at a single instance/replica for the same reason as the
  Fly.io recipe — APScheduler's background jobs assume one running process.
- First login for an account with a large number of stars takes a while —
  the initial `GET /stars` blocks on a full paginated GitHub GraphQL sync
  before the star cache is populated (confirmed live: ~788 stars took
  roughly 90 seconds end to end). This isn't Railway-specific, but it's
  easy to mistake for a stuck deploy the first time you see it; subsequent
  loads are fast until the cache TTL (`STAR_CACHE_TTL_HOURS`) expires.
- Railway's usage-based pricing means an idle Stellar instance costs very
  little, but a busy one (e.g. very large star lists, frequent syncs across
  many users) can cost more than a fixed small Fly VM — worth checking
  Railway's current pricing page before committing to it for a long-running
  instance.
