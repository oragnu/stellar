# Deploying to Railway (secondary PaaS option)

Railway is a good alternative to Fly.io if you want the simplest possible
click-through setup and don't mind usage-based pricing (which can be less
predictable than Fly's small fixed-VM pricing — that's why Fly is the
primary recommendation; Railway is documented here as a solid secondary
option, not a lesser one).

## Steps

1. Create a new Railway project, "Deploy from GitHub repo," pick your fork
   of `oragnu/stellar`.
2. Add a **PostgreSQL** plugin to the project — Railway provisions it and
   exposes a `DATABASE_URL` reference variable automatically.
3. In the Stellar service's settings:
   - **Build**: point at `docker/Dockerfile` (Railway auto-detects
     Dockerfiles; set the Dockerfile path explicitly if it doesn't).
   - **Variables**: reference the Postgres plugin's `DATABASE_URL` (rewrite
     the scheme to `postgresql+asyncpg://` if Railway's default differs —
     check the generated value), and set:
     - `SECRET_KEY` (generate: `openssl rand -hex 32`)
     - `SECRET_ENCRYPTION_KEY` (generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
     - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
     - `BASE_URL` — your Railway-provided domain (or custom domain)
     - `SESSION_COOKIE_SECURE=true`
4. Deploy. Railway auto-redeploys on every push to your connected branch;
   migrations run automatically at container start, same as every other
   recipe.
5. Attach a custom domain under the service's **Settings → Domains** if
   desired; Railway handles TLS for both its generated and custom domains.

## Notes

- Keep the service at a single instance/replica for the same reason as the
  Fly.io recipe — APScheduler's background jobs assume one running process.
- Railway's usage-based pricing means an idle Stellar instance costs very
  little, but a busy one (e.g. very large star lists, frequent syncs across
  many users) can cost more than a fixed small Fly VM — worth checking
  Railway's current pricing page before committing to it for a long-running
  instance.
