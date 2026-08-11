# Stellar branding

Source of truth for the Stellar identity. The applied version lives in the
frontend (`frontend/src/index.css` design tokens, `frontend/public/` icon
assets, `frontend/src/components/landing/`) — this doc explains the
direction and rationale so it can be iterated on consistently.

## Concept

The name is a deliberate pun: GitHub calls them "stars," Stellar organizes
them. The identity leans into a night-sky/orbit motif rather than copying
Astral's daytime brand-green, while keeping a nod to it as an accent so the
lineage is recognizable.

## Palette

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0B0F2B` | App/landing background (deep night-sky navy) |
| `--color-bg-elevated` | `#141838` | Cards, panels, sidebar |
| `--color-primary` | `#6D5EF5` | Primary actions, links, focus rings (indigo/violet) |
| `--color-primary-hover` | `#5747E8` | Primary hover state |
| `--color-accent` | `#2DD4A7` | CTA highlights, active tag chips, success states — the nod to Astral's original teal/green |
| `--color-text` | `#F4F5FA` | Primary text on dark surfaces |
| `--color-text-muted` | `#9CA3C2` | Secondary text |
| `--color-border` | `#262B52` | Hairlines, dividers |
| `--color-danger` | `#F0596B` | Destructive actions |

Full light-mode tokens (for the eventual dark/light toggle noted as a cheap
future add in `docs/plan.md`) are defined alongside these in
`frontend/src/index.css`.

## Typography

- UI + body: **Inter** (variable font), loaded self-hosted (no external
  font CDN — keeps the app fully self-contained for offline/self-hosted
  deployments).
- Landing hero display text: Inter at heavier weights (700–800) — no second
  display typeface introduced, to keep the type system simple.

## Logo

A minimal constellation mark: three connected points forming a stylized
shooting star / "S" gesture, used as both the standalone mark (favicon, app
icon) and paired with the "Stellar" wordmark (Inter, 700 weight) for the
full lockup. See `frontend/public/` for the SVG source and generated
favicons.

## Voice

Plain, a little playful (the "Gaze through your telescope" search-bar
placeholder from the original is exactly the right register — happy to keep
that kind of touch), never corporate. Landing copy leads with the concrete
problem (you starred it, now you can't find it) before the feature list.
