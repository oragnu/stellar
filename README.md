# ✨ Stellar

> Organize your GitHub stars like a pro — tags, notes, and smart filters for
> the repos you've starred. Self-hostable, open source, built with modern
> Python + React.

Stellar is a from-scratch, modern rewrite of [Astral](https://github.com/astralapp/astral)
(Laravel + Vue 2) with equivalent functionality: sign in with GitHub, browse
your starred repos, organize them with custom tags and private notes, build
reusable smart filters ("predicates"), auto-tag by topic, and export
everything to JSON whenever you want. See [`docs/plan.md`](docs/plan.md) for
the full architecture, rationale, and roadmap.

## Status

✅ **`v0.1.0` [released](https://github.com/oragnu/stellar/releases/tag/v0.1.0)**,
image published to [`ghcr.io/oragnu/stellar`](https://github.com/oragnu/stellar/pkgs/container/stellar).
All 6 roadmap phases are done: auth + GitHub star sync, tags, notes,
smart-filter ("predicate") builder, keyboard shortcuts, accessibility pass,
and packaging/CI/release. `backend-ci`, `frontend-ci`, `e2e`, and `codeql`
are all green on `main`; hosting was validated with a real Railway deploy
(Postgres, a real GitHub OAuth App, a full login round trip syncing 788
real starred repos — see `docs/plan.md` § Phased Roadmap for what that
found and fixed). Known gaps carried forward, none blocking: list
virtualization for very large star accounts, drag-and-drop reorder for
tags/filters, a richer notes editor, and Fly.io/VPS recipes not yet
exercised against a real deploy the way Railway was (full detail in
`docs/plan.md` § Phased Roadmap).

## Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL |
| Frontend | React 18 + TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS v4 |
| Auth | GitHub OAuth only, server-side sessions |
| Background jobs | APScheduler (in-process, no Redis required) |
| Packaging | Single multi-stage Docker image; also documented for bare-metal |

Full rationale for every choice above lives in [`docs/plan.md`](docs/plan.md)
and [`docs/adr/`](docs/adr/).

## Quick start (Docker)

```bash
git clone https://github.com/oragnu/stellar.git
cd stellar
cp .env.example .env   # fill in GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET, generate the two secret keys
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

Visit `http://localhost:8000`. See [`docs/deployment/docker.md`](docs/deployment/docker.md)
for reverse-proxy/TLS setup, and [`docs/deployment/`](docs/deployment/) for
Fly.io, Railway, and bare-metal (no Docker) recipes.

## Local development

See [`docs/development.md`](docs/development.md).

## Documentation

- [`docs/plan.md`](docs/plan.md) — full architecture, data model, API design, roadmap
- [`docs/adr/`](docs/adr/) — architecture decision records
- [`docs/deployment/`](docs/deployment/) — hosting recipes (Docker, Fly.io, Railway, bare-metal)
- [`CONTRIBUTING.md`](CONTRIBUTING.md) · [`SECURITY.md`](SECURITY.md)

## Why "Stellar"?

GitHub calls them "stars." This organizes them. The pun was too good to pass up.

## License

[MIT](LICENSE)
