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

function resolveBypassSecret(): string | null {
  return (
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    process.env.VERCEL_PROTECTION_BYPASS_TOKEN ||
    process.env.VERCEL_BYPASS_SECRET ||
    null
  );
}

function bypassHeaders(): Record<string, string> {
  const secret = resolveBypassSecret();
  if (!secret) return {};
  const headers: Record<string, string> = {
    "x-vercel-protection-bypass": secret,
  };
  if ((process.env.SET_VERCEL_BYPASS_COOKIE ?? "false").toLowerCase() === "true") {
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  return headers;
}

const PREVIEW_URL = process.env.PREVIEW_URL?.replace(/\/$/, "") ?? "";
const LOCAL_E2E_PORT = process.env.AMM_E2E_PORT ?? "3210";
const BASE_URL = PREVIEW_URL || `http://127.0.0.1:${LOCAL_E2E_PORT}`;
test.use({
  baseURL: BASE_URL,
  extraHTTPHeaders: bypassHeaders(),
});

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
        applicationWrites.push(`${method} ${requestUrl.pathname}`);
        await route.fulfill({
          status: 204,
          body: "",
        });
        return;
      }

      // The Vercel bypass header is same-origin infrastructure authority. Do
      // not forward it to any unrelated host if the page adds a new resource.
      const headers = { ...request.headers() };
      if (requestUrl.origin !== new URL(BASE_URL).origin) {
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
    await widget.getByRole("button", { name: "Continue" }).click();
    await widget.getByLabel("Phone").fill("+12525550100");
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
    await widget.getByRole("button", { name: "Continue" }).click();
    await widget.getByLabel("Phone").fill("+12525550100");
    await widget.getByRole("button", { name: "Request Valuation" }).click();
    await expect(widget.getByText("intercepted_failure")).toBeVisible();
  });
});
