import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { trackEvent } from "../../app/lib/analytics";
import { analyticsEvents } from "../../app/lib/constants";
import {
  isApprovedPublicAnalyticsEvent,
  safePublicAnalyticsProperties,
} from "../../src/lib/analytics/privacy";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
});

describe("client analytics privacy boundary", () => {
  it("keeps every browser funnel event public except trusted notification lifecycle events", () => {
    const trustedOnly = new Set([
      "notification_queued",
      "notification_delivered",
      "notification_failed",
    ]);
    expect(
      analyticsEvents.filter((eventName) => !isApprovedPublicAnalyticsEvent(eventName)),
    ).toEqual([...trustedOnly]);
  });

  it("preserves the controlled dimensions used by the live funnels", () => {
    expect(safePublicAnalyticsProperties("seller_form_submit", {
      funnel_name: "seller",
      step_name: "seller_intent",
      lead_source_surface: "seller_page",
    })).toEqual({
      funnel_name: "seller",
      step_name: "seller_intent",
      lead_source_surface: "seller_page",
    });
    expect(safePublicAnalyticsProperties("funnel_started", {
      funnel_name: "renter",
      lead_source_surface: "renter_page",
      experiment_key: "home_value_path",
      variant_key: "broker_review",
    })).toEqual({
      funnel_name: "renter",
      lead_source_surface: "renter_page",
      experiment_key: "home_value_path",
      variant_key: "broker_review",
    });
    expect(safePublicAnalyticsProperties("review_plan_task_completed", {
      goal: "seller",
      horizon: "90_days",
      focus: "preparation",
      task_id: "verify-property-facts",
    })).toEqual({
      goal: "seller",
      horizon: "90_days",
      focus: "preparation",
      task_id: "verify-property-facts",
    });
    expect(safePublicAnalyticsProperties("lead_submit_failed", {
      funnel_name: "home_value",
      lead_source_surface: "home_value_page",
      step_name: "contact",
      error: "person@example.com",
    })).toEqual({
      funnel_name: "home_value",
      lead_source_surface: "home_value_page",
      step_name: "contact",
    });
  });

  it("publishes only approved dimensions to browser analytics and the server ledger", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const browser = window as Window & { dataLayer?: unknown[] };
    browser.dataLayer = [];

    trackEvent(
      "page_view",
      {
        source: "facebook",
        medium: "social_organic",
        campaign: "home_value",
        referrer: "https://example.com/?email=person@example.com",
        gclid: "raw-click-id",
        placement: "homepage",
        placement_id: "homepage-hero",
      },
      {
        funnel_name: "seller",
        arbitrary: "person@example.com",
      },
    );

    expect(browser.dataLayer).toEqual([
      {
        event: "page_view",
        properties: expect.objectContaining({
          funnel_name: "seller",
          current_path: "/",
          device_category: "desktop",
          placement: "homepage",
          placement_id: "homepage-hero",
          utm_source: "facebook",
          utm_medium: "social_organic",
          utm_campaign: "home_value",
        }),
      },
    ]);
    const browserProperties = (browser.dataLayer[0] as { properties: Record<string, unknown> }).properties;
    expect(browserProperties).not.toHaveProperty("arbitrary");
    expect(browserProperties).not.toHaveProperty("referrer");
    expect(browserProperties).not.toHaveProperty("gclid");

    const serverBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      properties: Record<string, unknown>;
      attribution: Record<string, unknown>;
    };
    expect(serverBody.properties).toEqual(
      expect.objectContaining({
        funnel_name: "seller",
        current_path: "/",
        device_category: "desktop",
        placement: "homepage",
        placement_id: "homepage-hero",
        utm_source: "facebook",
        utm_medium: "social_organic",
        utm_campaign: "home_value",
      }),
    );
    expect(serverBody.properties).not.toHaveProperty("arbitrary");
    expect(serverBody.properties).not.toHaveProperty("referrer");
    expect(serverBody.properties).not.toHaveProperty("gclid");
    expect(serverBody.attribution).toEqual({
      source: "facebook",
      medium: "social_organic",
      campaign: "home_value",
    });
  });

  it("links first-party funnel events with a valid anonymous submission UUID", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const sessionId = "11111111-1111-4111-8111-111111111111";

    trackEvent(
      "contact_submitted",
      { source: "direct" },
      {
        funnel_name: "buyer",
        lead_source_surface: "buyer_page",
        step_name: "contact",
      },
      { sessionId },
    );

    const serverBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      session_id?: string;
      properties: Record<string, unknown>;
    };
    expect(serverBody.session_id).toBe(sessionId);
    expect(serverBody.properties).not.toHaveProperty("session_id");
  });

  it("drops a malformed session identifier instead of treating it as analytics data", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    trackEvent(
      "funnel_started",
      { source: "direct" },
      { funnel_name: "seller", lead_source_surface: "seller_page" },
      { sessionId: "person@example.com" },
    );

    const serverBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      session_id?: string;
    };
    expect(serverBody).not.toHaveProperty("session_id");
  });

  it("keeps lead-created visible to browser analytics without duplicating the server ledger", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const browser = window as Window & { dataLayer?: unknown[] };
    browser.dataLayer = [];

    trackEvent(
      "lead_created",
      { source: "direct" },
      { funnel_name: "seller", lead_source_surface: "seller_page" },
      { sessionId: "11111111-1111-4111-8111-111111111111" },
    );

    expect(browser.dataLayer).toEqual([
      expect.objectContaining({ event: "lead_created" }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps widget conversion visible to browser analytics without duplicating the server ledger", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const browser = window as Window & { dataLayer?: unknown[] };
    browser.dataLayer = [];

    trackEvent(
      "widget_lead_created",
      { source: "ourtownproperties" },
      { funnel_name: "home_value" },
      { sessionId: "11111111-1111-4111-8111-111111111111" },
    );

    expect(browser.dataLayer).toEqual([
      expect.objectContaining({ event: "widget_lead_created" }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
