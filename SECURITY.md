# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Stellar, please **do not** open
a public GitHub issue. Instead, report it privately via GitHub's
[Security Advisories](../../security/advisories/new) for this repository,
or email the maintainers listed in the repository metadata. We'll
acknowledge reports within a few days and aim to ship a fix or mitigation
before any public disclosure.

## Supported Versions

Stellar is pre-1.0 and moving quickly. Until a `v1.0.0` release, only the
latest `main` branch / most recent tagged release receives security fixes.

## Security Design Notes

A few things worth knowing if you're auditing or self-hosting Stellar:

- **Auth**: GitHub OAuth only. No local password auth exists, so there's no
  password database to leak.
- **Sessions**: server-side session table, signed httpOnly `SameSite=Lax`
  cookie holding an opaque session id. Only a *hash* of the session id is
  stored server-side — a database read alone cannot forge a valid session.
  Sessions are instantly revocable (logout, delete-account).
- **GitHub access token**: encrypted at rest (Fernet, `cryptography`) using
  `SECRET_ENCRYPTION_KEY`. Never logged, never returned by any API response
  (excluded from all response schemas).
- **CSRF**: double-submit cookie pattern on all state-changing requests,
  reinforced by `SameSite=Lax` cookies.
- **OAuth scope**: Stellar requests the minimum GitHub OAuth scope needed to
  read your starred repositories. It does not request write/`repo` scope
  unless a future feature (e.g. private-repo starring) explicitly requires
  it and you re-consent.
- **Rate limiting**: inbound API requests are limited to 120/minute per
  client IP (`slowapi`, in-memory). There are no stricter per-endpoint
  limits yet, and outbound GitHub API calls don't back off on GitHub's
  rate-limit responses. Concurrent star syncs for the same user are
  serialized by a per-user lock. Behind a reverse proxy, set
  `FORWARDED_ALLOW_IPS` (see `.env.example`) so the limit applies per real
  client rather than to the proxy's IP.
- **HTTP security headers**: the app doesn't set CSP, `X-Frame-Options` or
  HSTS headers itself. Add them at your reverse proxy if you need them.
- **HTML sanitization**: notes are cleaned server-side with `bleach`;
  GitHub-rendered README HTML is sanitized server-side with `bleach` and
  again client-side with DOMPurify before rendering.
- **Dependencies**: Dependabot checks weekly and opens security-update PRs
  as advisories appear; CodeQL runs on every push and PR to `main` plus
  weekly. Please
  don't rely solely on this — pin and review dependency updates for
  security-sensitive services (`services/crypto.py`, `services/github_client.py`,
  `core/security.py`) with extra care.

## Secrets Checklist for Self-Hosters

When deploying Stellar yourself:

- Generate a unique `SECRET_KEY` and `SECRET_ENCRYPTION_KEY` per instance
  (see `.env.example` for generation commands) — never reuse the examples.
- Keep `.env` out of version control (already covered by `.gitignore`).
- Run behind TLS (see `docs/deployment/`) — session cookies are marked
  `Secure` in production and will not be sent over plain HTTP.
- Rotate your GitHub OAuth app's client secret if you suspect it leaked, and
  update `GITHUB_CLIENT_SECRET` accordingly.
- Treat `SECRET_ENCRYPTION_KEY` as permanent. There's no key-rotation
  tooling yet: changing it makes every stored GitHub token undecryptable.
  Existing sessions stay valid, but star syncs and README fetches fail with
  server errors until each user signs out and back in, which stores their
  token again under the new key.
