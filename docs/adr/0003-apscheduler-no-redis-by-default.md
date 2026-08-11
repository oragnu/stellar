# 3. In-process APScheduler for background jobs, no Redis by default

## Status
Accepted

## Context
The original app has no queue and no scheduler at all — every operation
(star sync, autotagging, cleanup) runs synchronously inside the HTTP
request. Stellar wants to add periodic background sync (a real UX
improvement) and periodic cache/session eviction, without imposing a second
infrastructure dependency (Redis + a worker process) on self-hosters running
a single-user app at a small scale.

Options considered:
- **FastAPI `BackgroundTasks`**: fire-and-forget, tied to the request
  lifecycle, no scheduling primitive — can't do "every 4 hours," ruled out
  alone.
- **Celery + Redis**: full-featured, but a second broker service and worker
  process for what is, at this app's scale, a handful of lightweight
  per-user jobs. Heavy for the payoff.
- **arq**: lighter than Celery, but still requires Redis.
- **APScheduler** (`AsyncIOScheduler`, in-process): runs inside the same
  FastAPI process on asyncio, no extra service, supports interval/cron
  triggers.

## Decision
Use APScheduler's `AsyncIOScheduler`, started in the FastAPI lifespan
context, registering three jobs: periodic star sync (per-user, lock-guarded
to avoid colliding with a manual "Refresh" click), hourly star-cache
eviction, and periodic session cleanup. Redis stays fully optional: the
star-cache and rate-limiter are both written against a small backend
interface (`memory` / `db` / `redis`), selected by an env var, with `db`
(Postgres-backed) as the default. Redis is an explicit opt-in upgrade for
users running multiple app instances who need a shared cache or shared
rate-limit storage — never required for a normal single-instance self-host.

## Consequences
APScheduler jobs are in-process and assume a single running replica; if
Stellar is ever horizontally scaled, jobs would double-fire unless one
replica disables its scheduler (`SCHEDULER_ENABLED=false`) or the project
migrates to `arq`+Redis at that point. This is an accepted, documented
limitation matched to the target audience (self-hosters, not a scaled SaaS).
