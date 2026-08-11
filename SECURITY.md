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
- **Rate limiting**: inbound API rate limiting (stricter on auth/sync
  endpoints) and outbound GitHub API rate-limit-aware backoff.
- **Dependencies**: scanned via Dependabot and CodeQL on every push; please
  don't rely solely on this — pin and review dependency updates for
  security-sensitive services (`services/crypto.py`, `services/github_client.py`,
  `core/security.py`) with extra care.

## Secrets Checklist for Self-Hosters

When deploying Stellar yourself:

- Generate a unique `SECRET_KEY` and `SECRET_ENCRYPTION_KEY` per instance
  (see `.env.example` for generation commands) — never reuse the examples.
- Keep `.env` / `.env.docker` out of version control (already covered by
  `.gitignore`).
- Run behind TLS (see `docs/deployment/`) — session cookies are marked
  `Secure` in production and will not be sent over plain HTTP.
- Rotate your GitHub OAuth app's client secret if you suspect it leaked, and
  update `GITHUB_CLIENT_SECRET` accordingly.
