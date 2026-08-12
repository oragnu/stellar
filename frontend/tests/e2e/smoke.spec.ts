import { test, expect } from "@playwright/test";

/** Minimal smoke coverage for the deployed stack (docs/plan.md § Phase 5).
 * Real GitHub OAuth can't be exercised headlessly in CI without a live
 * GitHub App and a throwaway account, so this checks the two things a
 * broken deploy most often gets wrong: the API is actually reachable, and
 * the SPA actually renders and offers a way to sign in. Deeper flows
 * (tag/note/predicate CRUD) need an authenticated session and are
 * exercised by the backend's own integration tests instead.
 */
test("API health check responds ok", async ({ request }) => {
  const res = await request.get("/api/v1/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toEqual({ status: "ok" });
});

test("landing page renders and offers GitHub sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Stellar/);
  await expect(page.getByRole("button", { name: /sign in with github/i })).toBeVisible();
});
