# 5. Single-user model for v1, no teams/multi-tenancy

## Status
Accepted

## Context
The original app has no team/organization concept — every row is scoped to
exactly one `user_id`. The user considered whether Stellar should add shared
team/workspace support (shared tags/notes/predicates over a combined star
list) from day one, which would add real complexity (permissions, invites,
shared-vs-private notes) and delay v1.

## Decision
v1 stays single-user, matching the original exactly. The schema is designed
so this can be extended later without a redesign: every user-owned table
(`stars`, `tags`, `predicates`) already scopes by a single `user_id` FK with
uniqueness constraints scoped to `(user_id, natural_key)`. Adding team
support later is a column-add migration (either a nullable `team_id` on
`users` for shared-billing-only teams, or a nullable `team_id` alongside
`user_id` on the annotation tables for a shared-library model), not a
redesign — see `docs/plan.md` § Data Model for the specific extension path.

## Consequences
No multi-tenancy work ships in v1. If/when team support is prioritized, it
gets its own ADR superseding this one, plus its own phase in the roadmap.
