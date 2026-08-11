# 2. PostgreSQL as the primary database, SQLite best-effort only

## Status
Accepted

## Context
The original app (Astral) defaulted to MySQL for local dev and SQLite for
its Docker fork — an accidental split, not a deliberate choice. For Stellar
we need one primary, CI-tested database target, chosen deliberately.
Candidates considered: PostgreSQL only, SQLite only, or PostgreSQL-primary
with SQLite as a supported secondary mode.

`predicates.body` (the saved smart-filter definition) and `star_cache.payload`
(the cached GitHub star list) are both JSON documents. Postgres's `JSONB`
gives real indexing and operator support if we ever need server-side
predicate querying; SQLite's `JSON` is TEXT-affinity with a much smaller
function surface. SQLite also lacks most `ALTER TABLE` support (Alembic
autogenerate against it requires the `batch_alembic` table-rebuild mode — a
second, less-battle-tested migration code path), lacks native `UUID`/`ENUM`
types, and has sharper concurrency edges than Postgres if background jobs
(APScheduler) ever write concurrently with request handlers.

Against a Postgres-only decision: the original's lightest self-host mode
(SQLite, no separate DB service) is genuinely appealing for a single-user
tool, and the user explicitly asked for "PostgreSQL primary, SQLite optional."

## Decision
PostgreSQL 16 is the only database target that is CI-tested, migration-
tested, and documented in the hosting recipes. We write application code
against SQLAlchemy's dialect-agnostic column types wherever it's low-cost to
do so (avoid Postgres-only operators/`JSONB`-specific queries in v1 business
logic — evaluate predicates in the service layer instead of via raw JSONB
containment queries), which keeps a future SQLite mode plausible without
contorting the schema. SQLite is documented as "may work, unsupported" — not
promised, not gated in CI — until/unless it becomes a scoped project of its
own (dedicated migration-path testing, a `docker-compose.sqlite.yml`
variant).

## Consequences
Self-hosters who want the absolute lightest footprint must run a Postgres
container/service even for a single-user instance — slightly heavier than
the original's SQLite default. In exchange, we get one well-tested code
path, real JSONB for future predicate-querying performance, and no
migration-portability risk. If demand for a true zero-dependency SQLite mode
turns out to be strong, revisit with a superseding ADR.
