import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("page title, meta, and JSON-LD are present", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Ask Magic Mike/);

    // JSON-LD structured data
    const ldJson = await page.locator('script[type="application/ld+json"]').textContent();
    expect(ldJson).toBeTruthy();
    const schema = JSON.parse(ldJson!);
    const graph = schema["@graph"] as Array<{ "@type": string }>;
    const types = graph.map((n) => n["@type"]);
    expect(types).toContain("RealEstateAgent");
    expect(types).toContain("LocalBusiness");
    expect(types).toContain("WebSite");
  });

  test("skip-to-main-content link is in the DOM and targets #main-content", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator('a[href="#main-content"]').first();
    await expect(skipLink).toBeAttached();
    const target = page.locator("#main-content");
    await expect(target).toBeAttached();
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

  test("nav call link has correct tel href", async ({ page }) => {
    await page.goto("/");
    const callLink = page.locator('[data-testid="nav-call-link"]');
    await expect(callLink).toBeAttached();
    const href = await callLink.getAttribute("href");
    expect(href).toMatch(/^tel:/);
  });
});
