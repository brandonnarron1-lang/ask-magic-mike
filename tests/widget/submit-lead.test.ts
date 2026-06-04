/**
 * Tests for the widget → /api/leads payload builder.
 *
 * `submitWidgetLead` runs in the browser and uses `fetch`. We stub
 * fetch + sessionStorage so we can assert the exact shape posted to
 * the canonical endpoint without spinning up Next.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { submitWidgetLead } from "@/lib/widget/submit-lead";

const ORIGINAL_FETCH = globalThis.fetch;

interface CapturedCall {
  url: string;
  init: RequestInit;
  body: Record<string, unknown>;
}

function setupFetch(response: { ok: boolean; status: number; json: unknown }) {
  const captured: CapturedCall[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const body =
      init?.body && typeof init.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : {};
    captured.push({ url: String(input), init: init ?? {}, body });
    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.json,
    } as Response;
  }) as unknown as typeof fetch;
  return captured;
}

function seedAttribution() {
  // Mirror the shape captureAttribution() writes — see
  // src/lib/attribution/client-storage.ts.
  window.sessionStorage.setItem(
    "amm_attribution",
    JSON.stringify({
      utmSource: "facebook",
      utmMedium: "paid_social",
      utmCampaign: "seller_options_wilson_2026_q3",
      utmContent: "feed_video_a",
      utmTerm: null,
      referrerUrl: "https://example.com/wp",
      referrerType: "paid",
      landingPath: "/value",
      landingUrl: "https://example.com/value?utm_source=facebook",
      firstSeenAt: "2026-06-04T12:00:00.000Z",
    })
  );
}

describe("submitWidgetLead", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "https://example.com/value?utm_source=facebook" },
    });
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://google.com/",
    });
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    window.sessionStorage.clear();
  });

  it("builds a canonical payload with attribution + widget_session_id", async () => {
    seedAttribution();
    const captured = setupFetch({
      ok: true,
      status: 201,
      json: { ok: true, lead_id: "lead-1", next_step: "Mike's team will follow up." },
    });

    const r = await submitWidgetLead({
      leadType: "seller_cash_offer",
      intent: "Need to sell fast",
      firstName: "Jane",
      email: "jane@example.com",
      phone: "+12525551212",
      propertyAddress: "123 Nash St NW, Wilson, NC",
      timeline: "0_30_days",
      consent: { sms: true, email: true },
      formStartedAtMs: Date.now() - 5_000,
    });

    expect(r.ok).toBe(true);
    expect(captured).toHaveLength(1);
    const c = captured[0];

    expect(c.url).toBe("/api/leads");
    expect(c.init.method).toBe("POST");

    const body = c.body;
    expect(body.lead_type).toBe("seller_cash_offer");
    expect(body.source).toBe("widget");
    expect(body.email).toBe("jane@example.com");
    expect(body.phone).toBe("+12525551212");
    expect(body.property_address).toBe("123 Nash St NW, Wilson, NC");
    expect(body.timeline).toBe("0_30_days");
    expect(body.page_url).toBe(
      "https://example.com/value?utm_source=facebook"
    );
    expect(typeof body.widget_session_id).toBe("string");
    expect(String(body.widget_session_id).length).toBeGreaterThan(8);

    // Attribution forwarded.
    expect(body.utm_source).toBe("facebook");
    expect(body.utm_medium).toBe("paid_social");
    expect(body.utm_campaign).toBe("seller_options_wilson_2026_q3");
    expect(body.utm_content).toBe("feed_video_a");
    expect(body.referrer).toBe("https://example.com/wp");
    expect(body.landing_page).toBe("/value");

    // Consent shape.
    const consent = body.consent as Record<string, unknown>;
    expect(consent.sms).toBe(true);
    expect(consent.email).toBe(true);
    expect(String(consent.language)).toContain("Reply STOP");
  });

  it("reuses the same widget_session_id across calls", async () => {
    seedAttribution();
    const captured = setupFetch({
      ok: true,
      status: 201,
      json: { ok: true, lead_id: "lead-2" },
    });
    await submitWidgetLead({
      leadType: "buyer",
      email: "jane@example.com",
      consent: { sms: false, email: true },
    });
    await submitWidgetLead({
      leadType: "buyer",
      email: "jane@example.com",
      consent: { sms: false, email: true },
    });
    expect(captured).toHaveLength(2);
    expect(captured[0].body.widget_session_id).toBe(
      captured[1].body.widget_session_id
    );
  });

  it("returns ok=false when the API reports an error", async () => {
    seedAttribution();
    setupFetch({
      ok: false,
      status: 422,
      json: { ok: false, error: "spam_rejected" },
    });
    const r = await submitWidgetLead({
      leadType: "buyer",
      email: "jane@example.com",
      consent: { sms: false, email: false },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("spam_rejected");
  });
});
