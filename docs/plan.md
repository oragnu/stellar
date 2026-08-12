# Stellar — Modern Python Rewrite of Astral

## Context

The user wants to recreate **Astral** (`astralapp/astral`) — an open-source Laravel 10 + Vue 2 app for organizing GitHub starred repositories (tags, private notes, saved "predicate" filters, autotagging by topic, GitHub OAuth login, JSON export) — as a ground-up modern Python application called **Stellar**, in a brand-new empty repo (`oragnu/stellar`). Goals: modern conventions across backend/frontend/db/auth/security, easy self-hosting (Docker and bare-metal), the original's UI/UX copied as a design starting point, and new branding + a landing page for the "Stellar" name. All plans/docs live in the repo itself, plus CI and hosting guidance.

Research (three parallel Explore agents against the real `astralapp/astral` source, plus the Docker-focused fork `sruckh/astral`) corrected an initial wrong assumption (this is **not** a URL shortener) and produced a full, verified spec of the original's data model, API surface, business logic, auth, design system, and container packaging — summarized below and used to drive this plan. A Plan agent then produced a detailed architecture; its frontend portion (originally Vue 3) has been adapted here to **React + TypeScript** per the user's explicit choice.

User decisions locked in via AskUserQuestion:
- **Backend**: FastAPI
- **Frontend**: React + TypeScript
- **Database**: PostgreSQL primary, SQLite best-effort/optional
- **Tenancy**: single-user only for v1 (schema designed for a low-cost future team/workspace add-on, not built now)

## What Astral actually does (verified ground truth)

Single-user, GitHub-OAuth-only app. On login it live-fetches the user's starred repos from GitHub's GraphQL API (paginated, cached ~2-8h — the star data itself is **not** relationally persisted, only cached). Locally persisted: per-repo `notes` + `tags` (m2m), `predicates` (saved JSON visual-filter definitions: nested any/all/none groups over fields like language/stars/dates/tags/notes), and user settings (autotag-by-topic, show-language-tags, autosave-notes). Features: tag CRUD + drag-reorder, bulk drag-to-tag, markdown notes with debounced autosave, autotagger (topics → tags), janitor (delete empty/unstarred local rows), predicate builder, README fetch+render, JSON export, fast client-side search ("Galileo"), keyboard shortcuts, virtualized list. No teams, no queue/scheduler, no 2FA, no dark mode, no public API in the original. Design tokens: brand teal/green `#21A179` scale, indigo `#5770E0` tag accent, "Karla" font, Bootstrap-like breakpoints, white wordmark on brand-green background, Feather icons — useful as a starting palette reference, not a hard constraint (see Branding section).

The Docker fork (`sruckh/astral`) revealed anti-patterns to fix in Stellar: migrations baked in at **image build time** (should run at container **start**), two inconsistent `.env` files with drifting variable names (should be one canonical file), manual-only backups, no healthchecks-driven resilience story documented, single-container-with-external-reverse-proxy pattern (worth keeping — it's a good simple self-host model).

## Recommended Stack

- **Backend**: Python 3.12, FastAPI, Pydantic v2 (schemas separate from ORM models), SQLAlchemy 2.0 async (`Mapped[]`/`mapped_column()` style) + `asyncpg`, Alembic migrations, `uv` for dependency management, httpx (async) for GitHub REST+GraphQL, structlog, APScheduler (in-process `AsyncIOScheduler`, no Redis required) for periodic star-sync + cache/session eviction.
- **Auth**: GitHub OAuth only. Server-side session table (`sessions`) + signed httpOnly `SameSite=Lax` cookie (via `itsdangerous`) — chosen over in-cookie JWT specifically because instant revocation (logout, delete-account) matters when a session guards an encrypted GitHub token. Double-submit-cookie CSRF on mutating routes. GitHub access token encrypted at rest with Fernet (`cryptography`).
- **Database**: PostgreSQL 16 primary (JSONB for `predicates.body`, proper indexing, room to grow). SQLite kept plausible (dialect-agnostic column types, no Postgres-only operators in app logic) but **not** CI-gated or docs-promised in v1 — documented as "may work, unsupported" so it doesn't slow down v1 without foreclosing it later.
- **Cache**: star-list cache stored in Postgres (`star_cache` table, JSONB payload + TTL) behind a small `CacheBackend` protocol with `memory`/`db`/`redis` implementations, `db` default — Redis is an explicit opt-in upgrade path (multi-instance cache sharing, multi-instance rate-limit storage), never required for a normal self-host.
- **Rate limiting**: `slowapi` for inbound API protection (stricter on `/auth/*`, `/stars/sync`); outbound GitHub calls respect rate-limit headers with per-user asyncio locks to prevent duplicate concurrent syncs.
- **Frontend**: React 18 + TypeScript + Vite, **TanStack Query** for server state (stars/tags/predicates — replaces most of the original's Vuex data-fetching role), **Zustand** for local UI state (selected sidebar view, modal open/closed, search query), **React Router v7** (data router, auth-guarded routes), **Tailwind CSS v4**, **shadcn/ui + Radix primitives** for accessible modals/dropdowns/toggles, **dnd-kit** for tag reorder + drag-star-onto-tag, **@tanstack/react-virtual** for the virtualized star list, **@uiw/react-codemirror** (CodeMirror 6) for the notes markdown editor, **lucide-react** icons, `markdown-it` + `dompurify` for note-preview rendering (GitHub already returns rendered HTML for READMEs — sanitize with `dompurify` before injecting).
- **Packaging**: single multi-stage Dockerfile (Node build stage → Python/uv deps stage → slim runtime), FastAPI serves the built React SPA as static files plus `/api/v1/*` — one process, one port, no nginx-in-image (external reverse proxy is documented, same simple model as the original). Migrations run at **container start** via `entrypoint.sh` (`alembic upgrade head`), not at build time. Non-root container user.
- **Hosting**: Docker self-host is primary (docker-compose: app + Postgres, optional Redis profile). PaaS: **Fly.io** primary recipe (first-class Postgres, persistent volumes, cheap small-VM pricing, trivial `fly deploy` from the GHCR image), **Railway** secondary/simpler-UX recipe. IaaS/VPS: same Docker recipe on a self-provisioned box, plus a documented non-Docker systemd + gunicorn/uvicorn + Caddy bare-metal path (explicitly requested by the user).
- **CI/CD**: GitHub Actions — `backend-ci.yml` (ruff, mypy, pytest+coverage against a Postgres service container), `frontend-ci.yml` (eslint, `tsc --noEmit`, vitest+React Testing Library), `e2e.yml` (Playwright against the full docker-compose stack), `docker-publish.yml` (build+push to GHCR on tag/release), `codeql.yml`, Dependabot, pre-commit hooks (ruff, eslint --fix, basic hygiene).

## Repo Layout

```
stellar/
├── .github/workflows/{backend-ci,frontend-ci,e2e,docker-publish,codeql}.yml, dependabot.yml
├── backend/
│   ├── pyproject.toml, uv.lock, alembic.ini, alembic/versions/
│   ├── app/
│   │   ├── main.py            # FastAPI app factory, lifespan (scheduler, httpx client, DB engine)
│   │   ├── config.py           # pydantic-settings
│   │   ├── db.py / deps.py
│   │   ├── models/             # user, session, star, tag, predicate, star_cache
│   │   ├── schemas/             # Pydantic v2 request/response models
│   │   ├── api/                 # auth, stars, tags, predicates, settings, export
│   │   ├── services/            # github_client, sync_service, autotagger, janitor,
│   │   │                        # predicate_engine, crypto, cache/{memory,db,redis}.py
│   │   ├── jobs/scheduler.py    # APScheduler registration
│   │   └── core/                # security (sessions/CSRF), logging, rate_limit
│   └── tests/{conftest.py, factories.py, api/, services/}
├── frontend/
│   ├── package.json, vite.config.ts, tsconfig.json
│   ├── src/
│   │   ├── main.tsx, App.tsx, routes/ (React Router config, auth guard)
│   │   ├── queries/              # TanStack Query hooks (useStars, useTags, usePredicates...)
│   │   ├── stores/                # Zustand: uiStore (selected view, modals, search)
│   │   ├── lib/api.ts             # typed fetch client (generated from OpenAPI or hand-written)
│   │   ├── components/
│   │   │   ├── layout/            # Header, SearchBar, UserMenu, Sidebar
│   │   │   ├── stars/             # StarList (virtualized), StarListItem, StarDetail, ReadmePane
│   │   │   ├── tags/               # TagList, TagChip, TagEditor
│   │   │   ├── predicates/         # PredicateBuilderModal, PredicateGroup, PredicateRule
│   │   │   ├── notes/               # NotesEditor (CodeMirror wrapper)
│   │   │   ├── settings/            # SettingsModal
│   │   │   └── landing/             # marketing page sections (Hero, Features, Footer, CTA)
│   │   └── views/                    # Landing.tsx, Dashboard.tsx, AuthCallback.tsx
│   └── tests/{unit/ (vitest+RTL), e2e/ (Playwright)}
├── docker/{Dockerfile, docker-compose.yml, docker-compose.override.yml.example, entrypoint.sh}
├── docs/
│   ├── plan.md                      # this plan, committed
│   ├── adr/0001-record-architecture-decisions.md, 0002-postgres-only-v1.md,
│   │        0003-apscheduler-over-celery.md, 0004-server-side-sessions.md, ...
│   ├── api-spec.md
│   ├── deployment/{docker.md, fly-io.md, railway.md, vps-bare-metal.md}
│   ├── development.md
│   └── branding/ (logo source, palette, landing copy)
├── .env.example                       # single canonical env file
├── .pre-commit-config.yaml
├── CONTRIBUTING.md, SECURITY.md, LICENSE, README.md
```

Landing page lives inside the single frontend SPA (`views/Landing.tsx` + `components/landing/*`) rather than a separate static site/build pipeline — one deploy artifact, simplest self-host story.

## Data Model (PostgreSQL)

UUID (v7/time-ordered) PKs, `timestamptz` `created_at`/`updated_at`, no soft-delete (real deletes; matches the original's full-cascade account deletion), FKs `ON DELETE CASCADE` from every child table to `users`.

- **`users`**: `github_id` (bigint, unique), `github_login`, `avatar_url`, `access_token_enc` (bytea, Fernet), `token_scope`, `autotag_topics`, `show_language_tags`, `autosave_notes` bools.
- **`sessions`**: `user_id` FK, `session_hash` (unique, sha256 of cookie token — never store the raw token), `user_agent`, `ip_address`, `expires_at`, `last_seen_at`.
- **`star_cache`**: `user_id` PK/FK, `payload jsonb`, `fetched_at`, `expires_at` — replaces the original's file-based cache blob.
- **`stars`** (local annotation row, not a GitHub mirror): `user_id` FK, `repo_id` (bigint, GitHub's `databaseId`), `notes`, `autotagged_by_topic`, unique `(user_id, repo_id)`.
- **`tags`**: `user_id` FK, `name`, `sort_order`, unique `(user_id, name)`.
- **`star_tag`**: pivot, PK `(star_id, tag_id)`, both cascade.
- **`predicates`**: `user_id` FK, `name`, `body jsonb` (nested any/all/none rule groups), `sort_order`, unique `(user_id, name)`.

Multi-tenancy escape hatch (not built): every table already scopes by a single `user_id` FK with `(user_id, natural_key)` uniqueness — adding a nullable `team_id` later (either on `users` for shared-billing teams, or alongside `user_id` on `stars`/`tags`/`predicates` for shared-library teams) is a column-add migration, not a redesign.

## API Design

REST under `/api/v1/`, snake_case JSON both directions, error envelope `{error: {code, message, details?}}`.

- **Auth**: `GET /auth/github/login` (redirect w/ `state`) → `GET /auth/github/callback` (exchange code, upsert user, encrypt+store token, create session, set cookies, redirect `/dashboard`) → `GET /auth/me` → `POST /auth/logout` → `DELETE /auth/account` (revokes GitHub grant, cascades all local data).
- **Stars**: `GET /stars` (merged cache+annotations, filters: `tag_id`, `predicate_id`, `untagged`, `q`, `language`), `POST /stars/sync`, `GET /stars/{repo_id}`, `PATCH /stars/{repo_id}` (notes), `GET /stars/{repo_id}/readme`, `POST /stars/bulk-tag`, `POST /stars/janitor/preview`, `POST /stars/janitor/run`.
- **Tags**: `GET/POST /tags`, `PATCH/DELETE /tags/{id}`, `PUT /tags/reorder`.
- **Predicates**: `GET/POST /predicates`, `PATCH/DELETE /predicates/{id}`, `PUT /predicates/reorder`, `POST /predicates/preview` (ad-hoc eval for the builder's live preview).
- **Settings**: `PATCH /settings`, `POST /settings/autotag/run`.
- **Export**: `GET /export` (streamed JSON).
- **Meta**: `GET /health` (Docker healthcheck target).

GitHub OAuth scope kept minimal by default (no extra scope beyond what's needed to read starred public repos) — document the security posture in `SECURITY.md`; broader `repo` scope only if/when private-repo starring support is added later.

## Background Jobs

APScheduler `AsyncIOScheduler` in the FastAPI lifespan, no Redis: `sync_all_users_job` (every 4h, per-user asyncio lock shared with the manual `/stars/sync` endpoint), `evict_expired_cache_job` (hourly), `session_cleanup_job` (every 6h). Single-instance assumption is documented (matches the self-host target audience); scaling beyond one replica is a documented future escape hatch (`SCHEDULER_ENABLED=false` on extra replicas, or move to `arq`+Redis), not built now.

## Docker Packaging

Single multi-stage `docker/Dockerfile`: Node stage builds the React SPA → Python/`uv` stage installs deps → slim runtime copies both, runs as non-root `stellar` user, `EXPOSE 8000`, `HEALTHCHECK` against `/api/v1/health`. `entrypoint.sh` waits for the DB then runs `alembic upgrade head` **before** `exec`'ing uvicorn — fixes the original fork's build-time-migration anti-pattern. `docker-compose.yml`: `app` + `db` (Postgres 16, healthcheck-gated `depends_on`) + a commented-out `redis` service under a `redis` profile (opt-in only). One canonical `.env.example` at repo root (fixes the original's drifting dual-file naming problem) covering core/app, database, GitHub OAuth, cache/rate-limit backend selection, cookie, and sync-tuning vars.

## CI/CD & Hosting

GitHub Actions workflows as listed under Recommended Stack. Hosting docs: `docs/deployment/docker.md` (primary, with a sample Caddyfile), `fly-io.md` (primary PaaS), `railway.md` (secondary PaaS), `vps-bare-metal.md` (systemd unit + gunicorn/uvicorn + Caddy, no Docker — satisfies the "or explicitly" self-host requirement). VPS-with-Docker is explicitly documented as "just the Docker recipe run on a VPS you provision," not a fourth redundant guide.

**Known CI gap, relevant to cutting `v0.1.0` (Phase 5):** there is currently no `main` branch in `oragnu/stellar` — all work has landed directly on `claude/stellar-modernization-plan-44ifg0`, which is the repo's default branch. `backend-ci.yml` and `codeql.yml` both gate their `push` trigger (and `codeql.yml`'s weekly schedule) on `branches: [main]`, so **neither has ever actually run** except via Dependabot's `pull_request` runs (path-filtered, so only frontend-ci fired for those since they touched `frontend/`/`docker/`). `e2e.yml`'s schedule *does* fire, because GitHub schedules run against the repo's default branch whatever it's named, not literally `main`. Before or as part of cutting `v0.1.0`: either (a) rename/merge this branch to `main` so the existing triggers activate as designed, or (b) update the workflow trigger branch lists to match whatever branch strategy is adopted — but backend-ci and CodeQL must be confirmed green at least once before tagging, since they're currently unverified in this repo (backend test suite has only ever been run locally via `pytest`, never in Actions).

## Testing Strategy

Backend: `pytest` + `pytest-asyncio` + `httpx.AsyncClient(ASGITransport)` against a real test Postgres (CI service container / `testcontainers` locally), `polyfactory` factories, `respx` to mock all GitHub HTTP calls (including pagination and rate-limit-header scenarios). Frontend: `vitest` + React Testing Library, heaviest coverage on predicate evaluation and search-filter logic. E2E: Playwright against the full compose stack. Currently landed: an API-health + landing-page smoke check (`frontend/tests/e2e/smoke.spec.ts`) — real GitHub OAuth can't be exercised headlessly without a live GitHub App and a throwaway account, so deeper authenticated flows (login, tag a star, build+apply a predicate, export, delete account) are aspirational until OAuth stubbing/mocking is designed; they're not yet implemented and would be a good next increment within Phase 5.

## Migration/Parity Mapping (highlights)

Same data shapes and business rules as the original (auth, stars/tags/predicates, autotagger, janitor, README fetch+sanitize, export, client-side search, keyboard shortcuts) reimplemented idiomatically — see full table produced during design (Vuex→TanStack Query+Zustand, vue-router→React Router v7, vue-virtual-scroller→@tanstack/react-virtual, vuedraggable→dnd-kit, EasyMDE→CodeMirror 6 via @uiw/react-codemirror, feather-icons→lucide-react). Two deliberate additions beyond the original: periodic background sync (APScheduler) and a janitor **preview** step before delete (original deleted immediately). Two deliberate non-goals for v1: teams/multi-tenancy and dark mode (schema/design-token choices leave both cheap to add later).

## Branding & Landing Page ("Stellar")

Direction: lean into the name pun — GitHub "stars" → **Stellar**, night-sky/orbit visual motif. Recommended palette: deep indigo/violet-blue gradient background (`#0B0F2B` → `#1A1B4B`-ish night-sky range) as the new primary identity, keeping the original's teal/emerald (`#21A179`-adjacent) as a warm accent color for primary CTAs/active states — a visual bridge for anyone who knows Astral, not a wholesale departure. Typography: a clean modern sans (e.g. Inter or Geist) for UI, optionally a slightly distinct display weight for the landing hero. Logo concept: a minimal star/orbit mark (e.g. a shooting-star or constellation-line forming an "S"), designed to work as both a favicon and a wordmark lockup. Landing page (`views/Landing.tsx`) structure: hero with tagline + "Sign in with GitHub" / "Self-host it" dual CTA, feature grid mirroring the original's value props (tags, notes, smart predicates, autotagging, fast search, self-hostable, open source), a simple architecture/screenshot section, footer with repo/docs/license links. This is a starting recommendation, cheap to iterate visually once a first landing page draft exists.

## Phased Roadmap

Status key: ✅ done · 🚧 in progress · ⬜ not started.

0. ✅ **Scaffolding** — repo skeleton, FastAPI health endpoint, Vite+React+TS+Tailwind skeleton w/ placeholder landing page, Postgres via compose, empty Alembic baseline, pre-commit, base CI green, ADR 0001.
1. ✅ **Auth + Sync** — `users`/`sessions`, GitHub OAuth end-to-end, `star_cache` + sync service, session/CSRF middleware, login/callback views, unstyled star list proving the pipe works. (Landed with a full dashboard, not just an unstyled list — see the Phase 1-2 commit.)
2. ✅ **Tags + Notes** — `stars`/`tags`/`star_tag`, tag CRUD/reorder/bulk-tag APIs + UI, notes editor + autosave, autotagger, janitor, README fetch+sanitize. List virtualization deferred (see below) — the plain-rendered list is fine at current scale but hasn't been exercised against a multi-thousand-star account yet.
3. ✅ **Predicates** — `predicates` model, `predicate_engine.py`, builder modal + recursive group/rule components, live preview, sidebar integration.
4. ✅ **Polish, Docs, Landing/Branding** — keyboard shortcuts (`/`, `j`/`k`, `t`, `Escape`), settings modal (export/revoke/delete wired), language facets, empty/loading states, landing page + branding applied, `docs/` filled out, accessibility pass (landmarks, `aria-hidden`/`aria-label`/`aria-live` sweep, contrast-checked palette, keyboard-navigable throughout).
5. 🚧 **Packaging, CI/CD, Release** — Dependabot already live and pruned (see repo PR history: merged the safe grouped/docker-runtime bumps, closed the ones with real breakage — a partial python3.14 docker bump with a mismatched builder stage, and react-dom/vite bumps with genuine peer-dep ERESOLVE conflicts). `e2e.yml` is now green end-to-end (commits `2b3bc9c`, `7d8b5a6`): fixed a `docker compose` `--env-file` bug that made the `db` service silently start with the wrong Postgres password (affected the workflow *and* every documented deploy command — see `docs/deployment/docker.md#troubleshooting`), and added a real `frontend/playwright.config.ts` + `tests/e2e/smoke.spec.ts` (API health check + landing page renders) since none existed and Playwright's default discovery was crashing on the Vitest unit specs. Remaining before `v0.1.0`: resolve the CI gap noted above (no `main` branch → `backend-ci.yml`/`codeql.yml` never verified), a real `docker-publish.yml` run pushing to GHCR (untested — only triggers on tag/release push, neither has happened yet), hosting docs (`docs/deployment/*.md`) validated against at least one real deploy (Fly.io/Railway/VPS, not just Docker Compose locally), decide whether the deferred items below block the tag or ship after it, then cut `v0.1.0`.

**Known gaps carried forward** (each called out at the point they were deferred, not silently dropped): list virtualization (`@tanstack/react-virtual`) for tags/predicates/star list at large scale; drag-and-drop reorder for tags and saved filters (rename/delete/create work today, manual reordering doesn't); a richer CodeMirror-based notes editor (currently a plain textarea with debounced autosave).

## Security Checklist

Secrets never committed (`.env.example` placeholders + generation commands); GitHub token encrypted at rest (Fernet) with a documented rotation procedure; CSRF double-submit + `SameSite=Lax`; server-side revocable sessions (hash stored, not raw token); inbound rate limiting via slowapi (stricter on auth/sync) + outbound GitHub rate-limit-aware backoff with per-user locks; Dependabot + CodeQL + `pip-audit`/`npm audit` (non-blocking initially); secure headers middleware (CSP, X-Frame-Options, HSTS gated on production+secure-cookie); README/notes HTML sanitized both server-side (`bleach`/`nh3`) and client-side (`dompurify`); minimal default OAuth scope; tested full account-deletion cascade including GitHub grant revocation; non-root container user; SQLAlchemy parameterized queries only (no raw string-interpolated SQL), guarded by a pre-commit grep check.

## Critical Files for Implementation

- `backend/app/main.py` — FastAPI app factory/lifespan; everything else hangs off it.
- `backend/app/models/user.py` — anchors the schema (encrypted token, links to sessions/stars/tags/predicates); first migration, unblocks Phase 1.
- `backend/app/services/github_client.py` — GraphQL star-fetch + REST README client; correctness here determines whether sync/cache/janitor/autotagger all work.
- `backend/app/services/predicate_engine.py` — most complex business logic (recursive any/all/none evaluation); design/test before building the UI against it.
- `docker/Dockerfile` + `docker/entrypoint.sh` — encodes the packaging fix (migrations-at-start, non-root, single image) underlying every hosting recipe.
- `.env.example` — the single canonical config surface every deployment target reads from.
- `docs/plan.md` — this plan, committed as the durable spec.

## Verification

Once implementation begins: `docker compose --env-file .env -f docker/docker-compose.yml up` should bring up a working app end-to-end (Postgres healthy → migrations applied → API up → SPA served) reachable at `localhost:8000`, with GitHub OAuth login working against a real GitHub OAuth App (dev credentials), a full tag/note/predicate/export/delete-account round trip exercised manually and by the Playwright e2e suite, `backend-ci.yml`/`frontend-ci.yml`/`e2e.yml` all green on the initial scaffold PR, and a `docker-publish.yml` run successfully pushing an image to GHCR on a tag. Each phase in the roadmap should end with its own passing test suite (pytest for backend, vitest+RTL for frontend) before moving to the next phase.
