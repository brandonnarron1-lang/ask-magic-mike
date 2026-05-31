import { test, expect } from "@playwright/test";

// Admin smoke test — verifies live Supabase mode, branding, and lead table UX.
test("admin dashboard loads in live mode with correct branding", async ({
  browser,
}) => {
  const context = await browser.newContext({
    httpCredentials: { username: "", password: "changeme-local" },
  });
  const page = await context.newPage();

  await page.goto("/admin");

  // Must NOT show dev mock warning when Supabase is configured
  await expect(page.getByText("DEV MOCK DATA")).not.toBeVisible();

  // Wilson NC branding
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).toContain("Wilson, NC");
  expect(bodyText).toContain("Our Town Properties");

  // Lead table must be present (may have 0 or more rows)
  const table = page.locator("table");
  await expect(table).toBeVisible();

  // Real lead rows have cursor-pointer; the "No leads yet" placeholder row does not
  const leadRow = page.locator("tbody tr.cursor-pointer").first();
  const hasLeads = await leadRow.isVisible().catch(() => false);

  if (hasLeads) {
    await leadRow.click();
    await expect(page.getByText("Score Breakdown")).toBeVisible();
    await expect(page.getByText("Consent")).toBeVisible();
    await expect(page.getByText("Attribution")).toBeVisible();
    await expect(page.getByText("Recommended Action")).toBeVisible();
  }

  await context.close();
});
