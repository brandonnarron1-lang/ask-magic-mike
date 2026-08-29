/**
 * Deployed visual acceptance for the organic-search opportunity workbench.
 * Preview remains read-only: validation is deterministic and intercepted;
 * every commit is blocked before the protected API.
 */
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  parseOrganicSearchCsv,
  SYNTHETIC_ORGANIC_SEARCH_CSV,
} from "../../app/lib/growth/organic-search-ingress";
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
  test(`synthetic organic-search evidence stays sealed and contained on ${viewport.name}`, async ({ page }) => {
    mkdirSync("artifacts", { recursive: true });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const preview = parseOrganicSearchCsv(SYNTHETIC_ORGANIC_SEARCH_CSV, {
      now: new Date("2026-08-24T12:00:00.000Z"),
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

    await page.route("**/api/admin/growth/search-ingress/preview", async (route) => {
      previewRequests += 1;
      const payload = route.request().postDataJSON() as { csv?: unknown };
      expect(payload.csv).toBe(SYNTHETIC_ORGANIC_SEARCH_CSV);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, preview }),
      });
    });
    await page.route("**/api/admin/growth/search-ingress/commit", async (route) => {
      commitRequests += 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "preview_commit_blocked" }),
      });
    });

    const response = await page.goto("/admin/growth/search-ingress");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Organic opportunity radar" })).toBeVisible();
    await expect(page.getByText("Validation is available; mutation remains sealed.")).toBeVisible();

    const commit = page.getByRole("button", { name: "Commit reviewed page report" });
    await expect(commit).toBeDisabled();
    await page.getByRole("button", { name: "Load synthetic example" }).click();
    await page.getByRole("button", { name: "Validate without writing" }).click();

    await expect(page.getByText("Page-performance contract passed.")).toBeVisible();
    await expect(page.getByText("This is unmistakably synthetic and cannot be committed.")).toBeVisible();
    await expect(page.getByText("Normalized owned pages")).toBeVisible();
    await expect(page.getByText("Raw CSV / queries retained:")).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "Turn evidence into one bounded page experiment",
    })).toBeVisible();
    await expect(page.getByText(/Internal review only · organic click capture gap/i)).toBeVisible();
    await page.getByText(/Internal review only · organic click capture gap/i).click();
    await expect(page.getByText("Reader task to verify")).toBeVisible();
    await expect(page.getByText("Single-change scope")).toBeVisible();
    await expect(page.getByText("Primary decision metric")).toBeVisible();
    await expect(page.getByText("Authority boundary")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy internal brief" })).toBeVisible();
    await expect(page.getByRole("link", {
      name: "Google · Helpful, reliable, people-first content",
    })).toHaveAttribute("rel", "noopener noreferrer");
    await expect(commit).toBeDisabled();

    const textarea = page.getByRole("textbox", {
      name: "Canonical Search Console page CSV",
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
      path: `artifacts/organic-search-ingress-${viewport.name}.png`,
      fullPage: true,
    });
  });
}
