/**
 * Browser-level widget flow.
 *
 * Drives the widget on /widget-preview from intent pick → contact submit
 * → success state, intercepting every mutating first-party API request before
 * navigation so no lead, analytics row, provider call, or queue write occurs.
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
import { installNoWriteInterception } from "./no-write-preview-interception";
import { previewTestUse } from "./preview-test-config";

test.use(previewTestUse);

test.describe("Widget preview flow (DB-mutation-free)", () => {
  test("happy path: intent → questions → contact → success (intercepted)", async ({
    page,
  }) => {
    const capture = await installNoWriteInterception(page);

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
    await expect.poll(() => capture.events.length).toBeGreaterThan(0);
    expect(capture.leads).toHaveLength(1);
    const body = capture.leads[0];
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
    expect(capture.unexpectedMutations).toEqual([]);
  });

  test("error path: intercepted 500 surfaces widget-error", async ({ page }) => {
    const capture = await installNoWriteInterception(page, {
      leadFailure: { status: 500, error: "intercepted_failure" },
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
    await expect.poll(() => capture.events.length).toBeGreaterThan(0);
    expect(capture.leads).toHaveLength(1);
    expect(capture.unexpectedMutations).toEqual([]);
  });
});

test.describe("Public keyboard access (DB-mutation-free)", () => {
  test("skip link transfers focus to the shared main-content target", async ({ page }) => {
    const capture = await installNoWriteInterception(page);

    await page.goto("/ask");
    await page.keyboard.press("Tab");

    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("#page-content")).toBeFocused();
    await expect.poll(() => capture.events.length).toBeGreaterThan(0);
    expect(capture.leads).toHaveLength(0);
    expect(capture.unexpectedMutations).toEqual([]);
  });
});
