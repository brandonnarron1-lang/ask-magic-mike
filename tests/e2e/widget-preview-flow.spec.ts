/**
 * Browser-level widget flow.
 *
 * Drives the widget on /widget-preview from intent pick → contact submit
 * → success state, *intercepting* POST /api/leads so no DB write occurs.
 *
 * Runs against:
 *   - PREVIEW_URL if set (with optional Vercel protection bypass header)
 *   - otherwise the local dev server started by playwright.config.ts
 *
 * Supports protected previews by reading
 * VERCEL_AUTOMATION_BYPASS_SECRET / VERCEL_PROTECTION_BYPASS_TOKEN /
 * VERCEL_BYPASS_SECRET. The header is added via Playwright's
 * extraHTTPHeaders. The token is never logged.
 */
import { test, expect } from "@playwright/test";
import { previewTestUse } from "./preview-test-config";

test.use(previewTestUse);

test.describe("Widget preview flow (DB-mutation-free)", () => {
  test("happy path: intent → questions → contact → success (intercepted)", async ({
    page,
  }) => {
    let interceptedPayload: Record<string, unknown> | null = null;

    await page.route("**/api/leads", async (route) => {
      const req = route.request();
      try {
        interceptedPayload = req.postDataJSON() as Record<string, unknown>;
      } catch {
        interceptedPayload = {};
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          lead_id: "qa_intercepted_lead",
          status: "accepted",
          mock: true,
        }),
      });
    });

    await page.goto("/widget-preview");
    await expect(page.getByRole("heading", { name: /Wilson real estate/i })).toBeVisible();
    await page.getByRole("button", { name: "Open Ask Magic Mike" }).click();

    const widget = page.frameLocator('iframe[title="Ask Magic Mike widget"]');
    await expect(widget.getByRole("heading", { name: "Ask Magic Mike" })).toBeVisible();
    await widget.getByLabel("Property address").fill("123 Nash St NW, Wilson NC");
    await widget.getByRole("button", { name: "Continue" }).click();
    await widget.getByLabel("Your name").fill("INTERNAL QA DO NOT CONTACT");
    await widget.getByLabel("Email for your valuation follow-up").fill("jane+qa@example.com");
    await widget.getByLabel("Phone (optional)").fill("+12525550100");
    await widget.getByRole("button", { name: "Request Valuation" }).click();
    await expect(widget.getByText("Your request is in.")).toBeVisible();

    // Assert the intercepted payload includes the canonical fields.
    expect(interceptedPayload).not.toBeNull();
    const body = interceptedPayload as unknown as Record<string, unknown>;
    expect(typeof body.widget_session_id).toBe("string");
    expect(String(body.widget_session_id).length).toBeGreaterThan(8);
    expect(body.funnel_type).toBe("widget");
    expect(body.lead_source_surface).toBe("widget");
    expect(body.name).toBe("INTERNAL QA DO NOT CONTACT");
    expect(body.email).toBe("jane+qa@example.com");
    expect(body.phone).toBe("+12525550100");
    expect(body.address).toBe("123 Nash St NW, Wilson NC");
    expect(body.attribution).toMatchObject({
      source: "ourtownproperties",
      medium: "website",
      campaign: "parent-site-widget",
      placement: "sitewide-floating",
    });
  });

  test("error path: intercepted 500 surfaces widget-error", async ({ page }) => {
    await page.route("**/api/leads", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "intercepted_failure" }),
      });
    });

    await page.goto("/widget-preview");
    await page.getByRole("button", { name: "Open Ask Magic Mike" }).click();
    const widget = page.frameLocator('iframe[title="Ask Magic Mike widget"]');
    await widget.getByLabel("Property address").fill("123 Nash St NW, Wilson NC");
    await widget.getByRole("button", { name: "Continue" }).click();
    await widget.getByLabel("Your name").fill("INTERNAL QA DO NOT CONTACT");
    await widget.getByLabel("Email for your valuation follow-up").fill("jane+qa@example.com");
    await widget.getByLabel("Phone (optional)").fill("+12525550100");
    await widget.getByRole("button", { name: "Request Valuation" }).click();
    await expect(widget.getByText("intercepted_failure")).toBeVisible();
  });
});

test.describe("Public keyboard access (DB-mutation-free)", () => {
  test("skip link transfers focus to the shared main-content target", async ({ page }) => {
    for (const endpoint of [
      "**/api/analytics/event",
      "**/api/events",
      "**/api/experiments/event",
    ]) {
      await page.route(endpoint, async (route) => {
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, intercepted: true }),
        });
      });
    }

    await page.goto("/ask");
    await page.keyboard.press("Tab");

    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("#page-content")).toBeFocused();
  });
});
