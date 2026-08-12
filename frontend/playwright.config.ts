import { defineConfig, devices } from "@playwright/test";

/** Playwright config for the e2e workflow (docs/plan.md § Phase 5). Only
 * `tests/e2e/**` is in scope here — `tests/unit/**` is Vitest's, and the
 * two runners are not interchangeable (Vitest's `describe`/`it` rely on
 * Vitest's own runtime and throw when a different test runner imports
 * them directly). Without an explicit `testDir`, Playwright's default
 * file discovery would also pick up `tests/unit/*.test.ts` and crash on
 * them the same way. See .github/workflows/e2e.yml for how this is wired
 * to the docker-compose stack it runs against.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
