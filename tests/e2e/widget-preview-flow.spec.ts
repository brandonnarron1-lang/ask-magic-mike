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
test.use({
  baseURL: PREVIEW_URL || "http://localhost:3000",
  extraHTTPHeaders: bypassHeaders(),
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
    await expect(page.getByTestId("widget-live-demo")).toBeVisible();

    // Pick the "home value" intent — shortest deterministic path:
    // address (text) → timeline (select) → contact.
    await page.getByTestId("widget-intent-option-home_value").click();

    // Q1 — address (text input).
    await page.getByTestId("widget-question-input").fill("123 Nash St NW, Wilson NC");
    await page.getByTestId("widget-answer-submit").click();

    // Q2 — timeline (select). Click the first available option button.
    const timelineSelect = page.getByTestId("widget-question-select");
    await expect(timelineSelect).toBeVisible();
    await timelineSelect.locator("button").first().click();

    // Contact form appears.
    await expect(page.getByTestId("widget-contact-form")).toBeVisible();
    await page.getByTestId("widget-contact-name").fill("Jane");
    await page.getByTestId("widget-contact-email").fill("jane+qa@example.com");
    await page.getByTestId("widget-contact-phone").fill("+12525550100");

    // Consent inputs visible.
    await expect(page.getByTestId("widget-consent-sms")).toBeVisible();
    await expect(page.getByTestId("widget-consent-email")).toBeVisible();

    // Submit. The route handler above intercepts; no real /api/leads call is made.
    await page.getByTestId("widget-submit").click();

    // Success state.
    await expect(page.getByTestId("widget-success")).toBeVisible();

    // Assert the intercepted payload includes the canonical fields.
    expect(interceptedPayload).not.toBeNull();
    const body = interceptedPayload as unknown as Record<string, unknown>;
    expect(typeof body.widget_session_id).toBe("string");
    expect(String(body.widget_session_id).length).toBeGreaterThan(8);
    expect(body.source).toBe("widget");
    expect(body.lead_type).toBe("home_value");
    expect(body.email).toBe("jane+qa@example.com");
    expect(body.phone).toBe("+12525550100");
    const consent = (body.consent ?? {}) as Record<string, unknown>;
    expect(typeof consent.sms).toBe("boolean");
    expect(typeof consent.email).toBe("boolean");
    expect(String(consent.language ?? "")).toContain("Reply STOP");
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
    await page.getByTestId("widget-intent-option-home_value").click();

    await page
      .getByTestId("widget-question-input")
      .fill("123 Nash St NW, Wilson NC");
    await page.getByTestId("widget-answer-submit").click();

    await page
      .getByTestId("widget-question-select")
      .locator("button")
      .first()
      .click();

    await page.getByTestId("widget-contact-email").fill("jane+qa@example.com");
    await page.getByTestId("widget-contact-phone").fill("+12525550100");
    await page.getByTestId("widget-submit").click();

    await expect(page.getByTestId("widget-error")).toBeVisible();
  });
});
