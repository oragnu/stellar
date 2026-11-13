# Contributing to Stellar

Thanks for your interest in improving Stellar! This project is young and
under active initial development — see [`docs/plan.md`](docs/plan.md) for
the full architecture and roadmap before diving in.

## Development setup

See [`docs/development.md`](docs/development.md) for the full local setup
(backend + frontend + Postgres). Quick version:

```bash
# Backend
cd backend
uv sync
cp ../.env.example ../.env   # edit with your own GitHub OAuth app credentials
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Before opening a PR

- Run `uv run ruff check . && uv run ruff format --check .` and `uv run mypy app` in `backend/`.
- Run `npm run lint && npx tsc -b` in `frontend/`. (Use `tsc -b`, not `tsc --noEmit`: the root `tsconfig.json` only references `tsconfig.app.json` and `tsconfig.node.json`, so `--noEmit` against it type-checks nothing. `tsc -b` is also what `frontend-ci` and `npm run build` run.)
- Run the relevant test suite (`uv run pytest` / `npm run test`) for anything you touched.
- Keep PRs scoped to one phase/feature from `docs/plan.md` where possible — it makes review much easier.
- If you're changing an architectural decision (framework, data model, auth model, packaging), add or update an ADR in `docs/adr/`.

## Reporting bugs / requesting features

Open a GitHub issue. For security issues, please follow
[`SECURITY.md`](SECURITY.md) instead of filing a public issue.

## Branch protection & merging

`main` is protected: no direct pushes (including from admins/owners — this
is enforced, not just a convention), and every change lands via a PR.
Required status checks before a PR can merge: `backend-ci`, `frontend-ci`,
`e2e` (branch must also be up to date with `main` — GitHub will prompt to
update if it's behind). `codeql` runs on every PR too but is report-only,
not merge-blocking, since findings need triage rather than an instant fix.

There's intentionally no enforced reviewer-approval count — for a
single-maintainer project that's not a meaningful gate (GitHub never lets
an author approve their own PR, and a bot/agent working under the
maintainer's own account has no separate identity to review from anyway).
The real gate is simpler: **only the repo owner merges.** Open a PR, let
the required checks run, and either merge it yourself once you're happy
with the diff, or ask for review in the PR before merging.

## Cutting a release

Releases go out as a **draft first, published deliberately**. A draft
release doesn't create its git tag or fire `docker-publish.yml` until it's
actually published, so nothing goes out to GHCR by accident.
`docker-publish.yml` runs only on `release: published`, so pushing a `v*`
tag by hand doesn't publish an image either.

```bash
gh release create vX.Y.Z --draft --notes-file notes.md   # no tag yet, nothing public
# review the draft (GitHub UI, or ask whoever's driving to summarize it)
gh release edit vX.Y.Z --draft=false                      # tag is created now;
                                                            # this is what triggers docker-publish.yml
```

Before cutting the release, land a PR that bumps the version in both
packages and their lockfiles; `docker-publish.yml` doesn't check this for
you:

```bash
cd frontend && npm version X.Y.Z --no-git-tag-version   # package.json + package-lock.json
cd ../backend && uv lock                                # after editing version in pyproject.toml
```

If your local `uv` is older than the one that last wrote `uv.lock`, `uv lock`
may also rewrite the `revision = …` line near the top; keep the existing
value so the diff is only the version.

## Code style

- **Python**: `ruff` for linting + formatting, `mypy` for types, SQLAlchemy 2.0
  `Mapped[]`/`mapped_column()` style, Pydantic v2 schemas kept separate from
  ORM models.
- **TypeScript/React**: `eslint` + `tsc -b`, functional components +
  hooks, TanStack Query for server state, Zustand for local UI state only —
  don't reach for global state for anything the API already owns.

## License

By contributing, you agree your contributions are licensed under the
project's [MIT License](LICENSE).
