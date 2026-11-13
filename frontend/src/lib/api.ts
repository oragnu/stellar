/**
 * Typed fetch client for the Stellar API (/api/v1). Cookie-based session
 * auth (`credentials: "include"`) + double-submit CSRF token echoed back
 * from the non-httpOnly csrf cookie — see docs/plan.md § API Design and
 * app/core/security.py on the backend.
 */

const API_BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ParsedError = { message: string; code?: string; details?: unknown };

/**
 * Pull a human-readable message out of an error response body. The backend
 * emits several shapes (see docs/api-spec.md § Conventions):
 * - FastAPI HTTPException: `{"detail": "Tag not found"}`
 * - FastAPI validation (422): `{"detail": [{"loc": [...], "msg": "...", ...}]}`
 * - slowapi rate limit (429): `{"error": "Rate limit exceeded: 120 per 1 minute"}`
 * - structured envelope: `{"error": {"code", "message", "details"}}`
 * Anything else (proxy HTML pages, empty bodies) falls back to a generic
 * message rather than stringifying the body.
 */
function parseErrorBody(payload: unknown, status: number): ParsedError {
  const fallback = { message: `Request failed (HTTP ${status})` };

  if (typeof payload === "string") {
    const text = payload.trim();
    // Short plain-text bodies are meaningful; HTML error pages are not.
    return text && text.length <= 200 && !text.startsWith("<") ? { message: text } : fallback;
  }
  if (!payload || typeof payload !== "object") return fallback;

  const body = payload as Record<string, unknown>;

  if (typeof body.error === "string") return { message: body.error };
  if (body.error && typeof body.error === "object") {
    const err = body.error as Record<string, unknown>;
    return {
      message: typeof err.message === "string" && err.message ? err.message : fallback.message,
      code: typeof err.code === "string" ? err.code : undefined,
      details: err.details,
    };
  }

  if (typeof body.detail === "string" && body.detail) return { message: body.detail };
  if (Array.isArray(body.detail)) {
    const messages = body.detail
      .map((item) =>
        item && typeof item === "object" && typeof (item as { msg?: unknown }).msg === "string"
          ? (item as { msg: string }).msg
          : null,
      )
      .filter((msg): msg is string => Boolean(msg));
    return {
      message: messages.length ? messages.join("; ") : fallback.message,
      code: "validation_error",
      details: body.detail,
    };
  }

  return fallback;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = readCookie("stellar_csrf");
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = parseErrorBody(payload, response.status);
    throw new ApiError(response.status, error.message, error.code, error.details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
