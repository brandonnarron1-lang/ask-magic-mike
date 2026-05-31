import { test, expect } from "@playwright/test";

// Dev-only smoke test — relies on changeme-local default and no Supabase configured.
// This test must NEVER run in production.
test("admin dashboard shows dev mock warning and expandable lead detail in local dev", async ({
  browser,
}) => {
  const context = await browser.newContext({
    httpCredentials: { username: "", password: "changeme-local" },
  });
  const page = await context.newPage();

  await page.goto("/admin");

  // Amber dev banner must be visible
  await expect(page.getByText("DEV MOCK DATA")).toBeVisible();

  // Wilson NC branding
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).toContain("Wilson, NC");
  expect(bodyText).toContain("Our Town Properties");

  // Lead table must have at least one row
  const rows = page.locator("tbody tr").first();
  await expect(rows).toBeVisible();

  // Click the first lead row to expand it
  await rows.click();

  // Expanded panel: factor log or score detail
  await expect(page.getByText("Score Breakdown")).toBeVisible();
  await expect(page.getByText("Factor Log")).toBeVisible();

  // Consent column
  await expect(page.getByText("Consent")).toBeVisible();

  // Attribution column
  await expect(page.getByText("Attribution")).toBeVisible();

  // Recommended action
  await expect(page.getByText("Recommended Action")).toBeVisible();

  await context.close();
});
