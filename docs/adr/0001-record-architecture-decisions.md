# 1. Record architecture decisions

## Status
Accepted

## Context
Stellar is a ground-up rewrite with a lot of consequential, hard-to-reverse
choices made up front (framework, database, auth model, packaging). We want
a durable record of *why*, not just *what*, so future contributors (including
future us) don't accidentally re-litigate settled tradeoffs without the
original context — or don't realize a constraint has since changed and a
decision is worth revisiting.

## Decision
We will use Architecture Decision Records (ADRs), one per significant
decision, stored in `docs/adr/`, numbered sequentially, using this template:
`Status` / `Context` / `Decision` / `Consequences`. ADRs are immutable once
accepted — a changed decision gets a *new* ADR that supersedes the old one
(mark the old one's status as `Superseded by ADR-000X`), rather than editing
history in place.

## Consequences
Slight overhead per major decision. In exchange, `docs/plan.md` can stay a
living high-level document while ADRs hold the detailed rationale and can be
referenced from PRs that touch a given area.
