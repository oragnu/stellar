# 4. Server-side sessions, not client-held JWTs

## Status
Accepted

## Context
Stellar's only auth method is GitHub OAuth, and every authenticated session
guards a stored, encrypted GitHub access token. That raises the value of
being able to instantly kill a session — on logout, on account deletion, or
if a token is later found to be compromised — which a self-contained JWT
(valid until its own expiry, unrevocable without an extra denylist mechanism
that reintroduces server-side state anyway) doesn't give us for free.

## Decision
Sessions are stored server-side (a `sessions` table: user id, a *hash* of
the session token, user agent, IP, expiry, last-seen). The client holds only
a signed, httpOnly, `SameSite=Lax`, `Secure`-in-production cookie containing
an opaque session id (signed via `itsdangerous` so tampering is detected
without a DB round trip). Only the hash is stored server-side, so a database
read alone cannot forge a valid session. A short-lived `RefreshToken`/JWT
middleware pattern seen (unused, undependency'd) in the original codebase is
explicitly not carried forward.

## Consequences
Every authenticated request costs one extra indexed lookup (`sessions` by
hash) compared to a stateless JWT — negligible at this app's scale and worth
it for instant revocation. `SameSite=Lax` (not `Strict`) is required because
the GitHub OAuth callback is a cross-site top-level GET navigation back into
the app; `Strict` would silently drop the cookie on that redirect.
