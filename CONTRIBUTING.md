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
- Run `npm run lint && npx tsc --noEmit` in `frontend/`.
- Run the relevant test suite (`uv run pytest` / `npm run test`) for anything you touched.
- Keep PRs scoped to one phase/feature from `docs/plan.md` where possible — it makes review much easier.
- If you're changing an architectural decision (framework, data model, auth model, packaging), add or update an ADR in `docs/adr/`.

## Reporting bugs / requesting features

Open a GitHub issue. For security issues, please follow
[`SECURITY.md`](SECURITY.md) instead of filing a public issue.

## Code style

- **Python**: `ruff` for linting + formatting, `mypy` for types, SQLAlchemy 2.0
  `Mapped[]`/`mapped_column()` style, Pydantic v2 schemas kept separate from
  ORM models.
- **TypeScript/React**: `eslint` + `tsc --noEmit`, functional components +
  hooks, TanStack Query for server state, Zustand for local UI state only —
  don't reach for global state for anything the API already owns.

## License

By contributing, you agree your contributions are licensed under the
project's [MIT License](LICENSE).
