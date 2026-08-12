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
