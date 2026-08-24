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
const APPLICATION_ORIGIN = new URL(previewTestUse.baseURL).origin;

test.describe("Preview external-analytics isolation (mutation-free)", () => {
  test("loads no Google measurement runtime and attempts no application write", async ({
    page,
  }) => {
    const applicationWrites: string[] = [];
    const externalAnalyticsRequests: string[] = [];
    const analyticsHosts = new Set([
      "www.googletagmanager.com",
      "www.google-analytics.com",
      "analytics.google.com",
      "stats.g.doubleclick.net",
      "googleads.g.doubleclick.net",
    ]);

    await page.route("**/*", async (route) => {
      const request = route.request();
      const requestUrl = new URL(request.url());
      const method = request.method().toUpperCase();

      if (analyticsHosts.has(requestUrl.hostname)) {
        externalAnalyticsRequests.push(request.url());
        await route.abort("blockedbyclient");
        return;
      }

      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        if (requestUrl.origin === APPLICATION_ORIGIN) {
          applicationWrites.push(`${method} ${requestUrl.pathname}`);
        }
        // Block every mutating request from leaving the runner, including
        // deployment-protection/platform validation outside the app origin.
        await route.fulfill({
          status: 204,
          body: "",
        });
        return;
      }

      // The Vercel bypass header is same-origin infrastructure authority. Do
      // not forward it to any unrelated host if the page adds a new resource.
      const headers = { ...request.headers() };
      if (requestUrl.origin !== APPLICATION_ORIGIN) {
        delete headers["x-vercel-protection-bypass"];
        delete headers["x-vercel-set-bypass-cookie"];
      }
      await route.fallback({ headers });
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(750);

    await expect(page.getByTestId("external-analytics-consent")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Analytics preferences" })).toHaveCount(0);

    const runtime = await page.evaluate(() => ({
      scriptPresent: Boolean(
        document.querySelector('script[src*="googletagmanager.com/gtm.js"]'),
      ),
      dataLayerPresent: Object.prototype.hasOwnProperty.call(window, "ammDataLayer"),
      runtimeMarker: document.documentElement.dataset.ammExternalAnalytics ?? null,
      storedConsent: window.localStorage.getItem("amm_external_analytics_consent_v1"),
    }));

    expect(runtime).toEqual({
      scriptPresent: false,
      dataLayerPresent: false,
      runtimeMarker: null,
      storedConsent: null,
    });
    expect(externalAnalyticsRequests).toEqual([]);
    expect(applicationWrites).toEqual([]);
  });
});

test.describe("Widget preview flow (DB-mutation-free)", () => {
  test("happy path: intent → questions → contact → success (intercepted)", async ({
    page,
  }) => {
    const capture = await installNoWriteInterception(page, {
      simulatePublicBrowser: true,
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
      simulatePublicBrowser: true,
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
    const capture = await installNoWriteInterception(page, {
      simulatePublicBrowser: true,
    });

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
