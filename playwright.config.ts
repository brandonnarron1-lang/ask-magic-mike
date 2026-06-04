import { defineConfig, devices } from "@playwright/test";

const PREVIEW_URL = process.env.PREVIEW_URL?.replace(/\/$/, "") ?? "";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: PREVIEW_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // Only spin up the local dev server when no PREVIEW_URL is provided —
  // preview runs hit a deployed URL and don't need a local dev server.
  webServer: PREVIEW_URL
    ? undefined
    : {
        command: "NODE_ENV=development ./node_modules/.bin/next dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
