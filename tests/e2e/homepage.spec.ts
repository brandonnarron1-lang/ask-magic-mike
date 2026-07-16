import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("page title and canonical metadata are present", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Ask Magic Mike/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Wilson, North Carolina/,
    );
  });

  test("canonical root renders one primary main landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main")).toContainText("Choose your path");
  });

  test("hero section renders Mike's name and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Mike Eatmon", { exact: false }).first()).toBeVisible();
    const askCta = page.locator('[data-testid="nav-call-link"], a[href="/ask"], button').filter({ hasText: /ask|get started|call mike/i }).first();
    await expect(askCta).toBeAttached();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    // Brief wait to catch deferred errors
    await page.waitForTimeout(1000);
    const significant = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("__nextjs") &&
        !e.includes("hydration") // hydration warnings covered separately
    );
    expect(significant, `Console errors: ${significant.join("\n")}`).toHaveLength(0);
  });

  test("no broken images", async ({ page }) => {
    const broken: string[] = [];
    page.on("response", (resp) => {
      const url = resp.url();
      if (resp.status() >= 400 && /\.(webp|png|jpg|jpeg|svg)/.test(url)) {
        broken.push(`${resp.status()} ${url}`);
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(broken, `Broken images: ${broken.join("\n")}`).toHaveLength(0);
  });

  test("footer links point to active root integration routes", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/widget-preview"]')).toBeAttached();
    await expect(page.locator('a[href="/integrations/ourtownproperties"]')).toBeAttached();
    await expect(page.locator('a[href="/social-preview"]').first()).toBeAttached();
  });
});
