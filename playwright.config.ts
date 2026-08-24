import { defineConfig, devices } from "@playwright/test";

const PREVIEW_URL = process.env.PREVIEW_URL?.replace(/\/$/, "") ?? "";
const LOCAL_E2E_PORT = process.env.AMM_E2E_PORT ?? "3210";
const LOCAL_E2E_URL = `http://127.0.0.1:${LOCAL_E2E_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
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
        command: `NODE_ENV=development ./node_modules/.bin/next dev --hostname 127.0.0.1 --port ${LOCAL_E2E_PORT}`,
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
