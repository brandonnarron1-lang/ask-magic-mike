/**
 * Deployed visual acceptance for the aggregate local-profile workbench.
 * Preview remains read-only: validation is deterministic and intercepted;
 * every commit stays blocked before the protected API.
 */
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  parseLocalProfilePerformanceCsv,
  SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV,
} from "../../app/lib/growth/local-profile-performance-ingress";
import { previewTestUse } from "./preview-test-config";

const adminSecret = process.env.ADMIN_SECRET || "changeme-local";

test.use({
  ...previewTestUse,
  httpCredentials: { username: "admin", password: adminSecret },
});

const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`synthetic local-profile evidence stays sealed and contained on ${viewport.name}`, async ({ page }) => {
    mkdirSync("artifacts", { recursive: true });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const preview = parseLocalProfilePerformanceCsv(SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV, {
      now: new Date("2026-08-24T20:00:00.000Z"),
    });
    expect(preview.ok).toBe(true);
    expect(preview.synthetic).toBe(true);

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    let previewRequests = 0;
    let commitRequests = 0;

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    await page.route("**/api/admin/growth/local-profile-ingress/preview", async (route) => {
      previewRequests += 1;
      const payload = route.request().postDataJSON() as { csv?: unknown };
      expect(payload.csv).toBe(SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, preview }),
      });
    });
    await page.route("**/api/admin/growth/local-profile-ingress/commit", async (route) => {
      commitRequests += 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "preview_commit_blocked" }),
      });
    });

    const response = await page.goto("/admin/growth/local-profile-ingress");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Local profile opportunity radar" })).toBeVisible();
    await expect(page.getByText("Validation is available; mutation remains sealed.")).toBeVisible();

    const commit = page.getByRole("button", { name: "Commit reviewed aggregate report" });
    await expect(commit).toBeDisabled();
    await page.getByRole("button", { name: "Load synthetic example" }).click();
    await page.getByRole("button", { name: "Validate without writing" }).click();

    await expect(page.getByText("Local-profile performance contract passed.")).toBeVisible();
    await expect(page.getByText("This is unmistakably synthetic and cannot be committed.")).toBeVisible();
    await expect(page.getByText("Normalized aggregate metrics")).toBeVisible();
    await expect(page.getByText("Raw CSV / search terms / location IDs retained:")).toBeVisible();
    await expect(commit).toBeDisabled();

    const mobileMetrics = page.getByTestId("local-profile-mobile-metrics");
    if (viewport.name === "mobile") {
      await expect(mobileMetrics).toBeVisible();
      await expect(
        page.getByTestId("local-profile-mobile-metric-business_impressions_mobile_search"),
      ).toContainText("900");
      await expect(
        page.getByTestId("local-profile-mobile-metric-business_impressions_mobile_search"),
      ).toContainText("59 / 85%");
    } else {
      await expect(mobileMetrics).toBeHidden();
    }

    const textarea = page.getByRole("textbox", {
      name: "Reviewed Business Profile performance CSV",
      exact: true,
    });
    const fileButton = page.getByRole("button", {
      name: "Select CSV file",
      exact: true,
    });
    await textarea.focus();
    await page.keyboard.press("Tab");
    await expect(fileButton).toBeFocused();

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      unlabeledInputs: Array.from(document.querySelectorAll("input,textarea")).filter((element) => {
        const id = element.id;
        return !(
          element.getAttribute("aria-label") ||
          element.getAttribute("aria-labelledby") ||
          (id && document.querySelector(`label[for="${CSS.escape(id)}"]`))
        );
      }).length,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(dimensions.unlabeledInputs).toBe(0);
    expect(previewRequests).toBe(1);
    expect(commitRequests).toBe(0);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    await page.screenshot({
      path: `artifacts/local-profile-performance-ingress-${viewport.name}.png`,
      fullPage: true,
    });
  });
}
