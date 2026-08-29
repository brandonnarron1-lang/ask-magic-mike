/**
 * Deployed visual acceptance for the protected Growth Command Center.
 *
 * This suite is intentionally read-only. It renders whichever canonical
 * persisted opportunities already exist in the configured Preview database;
 * it never seeds, imports, edits, or dismisses an opportunity.
 */
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { previewTestUse } from "./preview-test-config";

const adminSecret = process.env.ADMIN_SECRET || "changeme-local";

test.use({
  ...previewTestUse,
  httpCredentials: { username: "admin", password: adminSecret },
});

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const allowedPacketLinks = new Set([
  "/admin/growth",
  "/admin/growth/search-ingress",
  "/admin/growth/local-profile-ingress",
]);
const applicationOrigin = new URL(previewTestUse.baseURL).origin;

for (const viewport of viewports) {
  test(`growth economics and decision packets remain protected, contained, and read-only on ${viewport.name}`, async ({ page }) => {
    mkdirSync("artifacts", { recursive: true });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const mutationRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("request", (request) => {
      const target = new URL(request.url());
      if (
        target.origin === applicationOrigin &&
        !["GET", "HEAD", "OPTIONS"].includes(request.method())
      ) {
        mutationRequests.push(`${request.method()} ${target.pathname}`);
      }
    });

    const response = await page.goto("/admin/growth?window=90", {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        name: "Own the demand. Measure the money. Improve the machine.",
      }),
    ).toBeVisible();
    await expect(page.getByText("Recorded referral fees", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tracked contribution", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Cost / signed client", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Revenue / referral fees" })).toBeAttached();

    const economicsRegion = page.getByRole("region", {
      name: "Channel economics table",
    });
    await expect(economicsRegion).toBeVisible();
    await expect(
      page.getByText("Scroll horizontally or use the arrow keys to review every evidence column."),
    ).toBeVisible();
    const economicsDimensions = await economicsRegion.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(economicsDimensions.scrollWidth).toBeGreaterThan(economicsDimensions.clientWidth);
    await economicsRegion.focus();
    await expect(economicsRegion).toBeFocused();
    await economicsRegion.evaluate((element) => {
      element.scrollLeft = 0;
    });
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => economicsRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

    const packetHeading = page.getByRole("heading", {
      name: "Local-demand decision packets",
    });
    await expect(packetHeading).toBeVisible();
    const packetSection = packetHeading.locator("xpath=ancestor::section");
    await expect(packetSection).toBeVisible();

    const packetLinks = await packetSection.locator("a").evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
    );
    for (const href of packetLinks) expect(allowedPacketLinks.has(href)).toBe(true);

    const packetArticles = packetSection.locator("article");
    if ((await packetArticles.count()) === 0) {
      await expect(packetSection.getByText("No persisted opportunity rows.")).toBeVisible();
    } else {
      await expect(packetSection.getByText("Recommended next decision").first()).toBeVisible();
    }

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      errorOverlay: Boolean(
        document.querySelector(
          "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
        ),
      ),
      textLength: document.body.innerText.trim().length,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(dimensions.errorOverlay).toBe(false);
    expect(dimensions.textLength).toBeGreaterThan(500);
    expect(mutationRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    await page.screenshot({
      path: `artifacts/growth-channel-economics-${viewport.name}.png`,
      fullPage: true,
    });
  });
}
