import { defineConfig, devices } from "@playwright/test";

const PREVIEW_URL = process.env.PREVIEW_URL?.replace(/\/$/, "") ?? "";
const LOCAL_E2E_PORT = process.env.AMM_E2E_PORT ?? "3210";
const LOCAL_E2E_URL = `http://127.0.0.1:${LOCAL_E2E_PORT}`;
const BUILT_E2E = process.env.AMM_E2E_BUILT === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // The local Next.js development compiler can invalidate shared route chunks
  // while parallel browser workers compile different pages. Keep local runs
  // deterministic; deployed Preview runs remain free to use Playwright's
  // normal worker count because they exercise an immutable build.
  workers: PREVIEW_URL ? undefined : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: PREVIEW_URL || LOCAL_E2E_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // Only spin up the local dev server when no PREVIEW_URL is provided —
  // preview runs hit a deployed URL and don't need a local dev server.
  webServer: PREVIEW_URL
    ? undefined
    : {
        command: BUILT_E2E
          ? `./node_modules/.bin/next start --hostname 127.0.0.1 --port ${LOCAL_E2E_PORT}`
          : `NODE_ENV=development ./node_modules/.bin/next dev --hostname 127.0.0.1 --port ${LOCAL_E2E_PORT}`,
        url: LOCAL_E2E_URL,
        // Never attach Ask Magic Mike QA to an unrelated app that happens to
        // own the local port. A collision must fail visibly.
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
