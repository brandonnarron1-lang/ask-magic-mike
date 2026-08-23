import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    // Keep browser QA deterministic and DB-mutation-free. The analytics API's
    // durable persistence contract is covered separately at the route layer.
    await page.route("**/api/events", async (route) => {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, persisted: true, test_intercepted: true }),
      });
    });
  });

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

  test("footer keeps consumer paths visible without internal preview links", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("navigation", { name: "Footer" })).toBeVisible();
    await expect(footer.locator('a[href="/home-value"]')).toBeAttached();
    await expect(footer.locator('a[href="/buy"]')).toBeAttached();
    await expect(footer.locator('a[href="/ask"]')).toBeAttached();
    await expect(footer.locator('a[href="/widget-preview"]')).toHaveCount(0);
    await expect(footer.locator('a[href="/integrations/ourtownproperties"]')).toHaveCount(0);
    await expect(footer.locator('a[href="/social-preview"]')).toHaveCount(0);
  });
});
