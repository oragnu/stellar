import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { api, apiFetch, ApiError } from "@/lib/api";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({}),
    ...response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiFetch", () => {
  beforeEach(() => {
    document.cookie = "stellar_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not attach an X-CSRF-Token header on GET requests", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ ok: true }) });
    document.cookie = "stellar_csrf=some-token";

    await apiFetch("/stars");

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.has("X-CSRF-Token")).toBe(false);
  });

  it("echoes the csrf cookie as X-CSRF-Token on mutating requests", async () => {
    const fetchMock = mockFetchOnce({ status: 204, json: undefined as never });
    document.cookie = "stellar_csrf=abc123";

    await api.post("/tags", { name: "cli" });

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBe("abc123");
  });

  it("always sends credentials so the session cookie is included", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({}) });

    await apiFetch("/auth/me");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
  });

  it("throws an ApiError with the server's error envelope on non-2xx responses", async () => {
    mockFetchOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: "duplicate_tag", message: "Tag already exists" } }),
    });

    await expect(apiFetch("/tags")).rejects.toMatchObject({
      status: 409,
      code: "duplicate_tag",
      message: "Tag already exists",
    });
  });

  it("uses FastAPI's string `detail` as the message (HTTPException)", async () => {
    mockFetchOnce({
      ok: false,
      status: 409,
      json: async () => ({ detail: "A tag with this name already exists" }),
    });

    await expect(apiFetch("/tags", { method: "POST" })).rejects.toMatchObject({
      status: 409,
      message: "A tag with this name already exists",
    });
  });

  it("joins FastAPI validation errors from a `detail` list (422)", async () => {
    const detail = [
      { loc: ["body", "name"], msg: "Field required", type: "missing" },
      { loc: ["body", "sort_order"], msg: "Input should be a valid integer", type: "int_parsing" },
    ];
    mockFetchOnce({ ok: false, status: 422, json: async () => ({ detail }) });

    await expect(apiFetch("/tags", { method: "POST" })).rejects.toMatchObject({
      status: 422,
      code: "validation_error",
      message: "Field required; Input should be a valid integer",
      details: detail,
    });
  });

  it("uses slowapi's string `error` as the message (429)", async () => {
    mockFetchOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Rate limit exceeded: 120 per 1 minute" }),
    });

    await expect(apiFetch("/stars")).rejects.toMatchObject({
      status: 429,
      message: "Rate limit exceeded: 120 per 1 minute",
    });
  });

  it("never surfaces '[object Object]' for an unrecognized JSON error body", async () => {
    mockFetchOnce({ ok: false, status: 500, json: async () => ({ unexpected: true }) });

    const error = await apiFetch("/stars").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("Request failed (HTTP 500)");
  });

  it("uses a short plain-text body but not an HTML error page", async () => {
    mockFetchOnce({
      ok: false,
      status: 502,
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => "Bad Gateway",
    });
    await expect(apiFetch("/stars")).rejects.toMatchObject({ message: "Bad Gateway" });

    mockFetchOnce({
      ok: false,
      status: 502,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => "<html><body><h1>502 Bad Gateway</h1></body></html>",
    });
    await expect(apiFetch("/stars")).rejects.toMatchObject({
      message: "Request failed (HTTP 502)",
    });
  });

  it("returns undefined for 204 No Content responses without parsing a body", async () => {
    const fetchMock = mockFetchOnce({ status: 204 });
    // If apiFetch tried to parse JSON here, this would throw.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    const result = await apiFetch("/auth/logout", { method: "POST" });
    expect(result).toBeUndefined();
  });
});

describe("ApiError", () => {
  it("carries status/code/details", () => {
    const err = new ApiError(422, "Invalid", "validation_error", { field: "name" });
    expect(err.status).toBe(422);
    expect(err.code).toBe("validation_error");
    expect(err.details).toEqual({ field: "name" });
  });
});
