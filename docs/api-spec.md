# API Spec

Stellar's REST API lives under `/api/v1/`. FastAPI auto-generates a full
OpenAPI schema from the route definitions and Pydantic schemas — once the
backend is running, the authoritative, always-up-to-date spec is available
at:

- Interactive docs: `${BASE_URL}/docs` (Swagger UI)
- Raw schema: `${BASE_URL}/openapi.json`

This file is a stable, human-readable summary for quick reference; treat
`/openapi.json` as the source of truth if the two ever disagree.

## Conventions

- JSON in, JSON out, `snake_case` field names on both sides.
- List responses: `{"items": [...], "meta": {...}}`.
- Errors: `{"error": {"code": "...", "message": "...", "details": {...}}}` with
  the appropriate HTTP status (422 for validation, 401/403 for auth, 404,
  409 for conflicts like duplicate tag names, 429 for rate limits).
- All routes except `/auth/github/login`, `/auth/github/callback`, and
  `/health` require an authenticated session cookie.
- All mutating routes (`POST`/`PATCH`/`PUT`/`DELETE`) require the
  `X-CSRF-Token` header to match the `csrf_token` cookie.

## Resources

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/github/login` | Redirect to GitHub OAuth authorize URL |
| GET | `/auth/github/callback` | OAuth callback: create/update user + session, redirect to `/dashboard` |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/logout` | Invalidate current session |
| DELETE | `/auth/account` | Revoke GitHub grant + cascade-delete all local data |
| GET | `/stars` | Merged star list (GitHub cache + local annotations). Filters: `tag_id`, `predicate_id`, `untagged`, `q`, `language` |
| POST | `/stars/sync` | Force a fresh GitHub fetch, bypassing cache TTL |
| GET | `/stars/{repo_id}` | Single star detail incl. notes |
| PATCH | `/stars/{repo_id}` | Update notes |
| GET | `/stars/{repo_id}/readme` | Sanitized rendered README HTML |
| POST | `/stars/bulk-tag` | `{repo_ids, add_tag_ids, remove_tag_ids}` |
| POST | `/stars/janitor/preview` | Preview which local rows the janitor would delete |
| POST | `/stars/janitor/run` | Execute the cleanup |
| GET | `/tags` | List tags with star counts |
| POST | `/tags` | Create a tag |
| PATCH | `/tags/{id}` | Rename a tag |
| DELETE | `/tags/{id}` | Delete a tag |
| PUT | `/tags/reorder` | `{ordered_ids: [...]}` |
| GET | `/predicates` | List saved smart filters |
| POST | `/predicates` | Create `{name, body}` |
| PATCH | `/predicates/{id}` | Update |
| DELETE | `/predicates/{id}` | Delete |
| PUT | `/predicates/reorder` | `{ordered_ids: [...]}` |
| POST | `/predicates/preview` | Evaluate an unsaved `{body}` against current stars, for the builder's live preview |
| PATCH | `/settings` | `{autotag_topics?, show_language_tags?, autosave_notes?}` |
| POST | `/settings/autotag/run` | Apply the autotagger now |
| GET | `/export` | Streamed JSON export of stars + tags + notes + predicates |
| GET | `/health` | Liveness/readiness check |

See `docs/plan.md` § API Design for the full auth-flow sequence and the
rationale behind these shapes.
