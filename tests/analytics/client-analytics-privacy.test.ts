import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { trackEvent } from "../../app/lib/analytics";
import { analyticsEvents } from "../../app/lib/constants";
import { recordExperimentEvent } from "../../app/lib/growth/public-experiment-client";
import { EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY } from "../../app/lib/externalAnalytics";
import { OUR_TOWN_GTM_CONTAINER_ID } from "../../app/lib/googleTagConfig";
import {
  isApprovedPublicAnalyticsEvent,
  safePublicAnalyticsProperties,
} from "../../src/lib/analytics/privacy";

type TestAnalyticsWindow = Window & {
  ammDataLayer?: unknown[];
  __ammExternalAnalyticsActive?: boolean;
  __ammExternalAnalyticsContainerId?: string;
};

function installLocalStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    },
  });
}

function setCanonicalPage(path = "/") {
  const url = new URL(path, "https://www.askmagicmike.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      href: url.href,
      origin: url.origin,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      toString: () => url.href,
    } as Location,
  });
}

beforeEach(() => {
  installLocalStorage();
  window.localStorage.clear();
  setCanonicalPage();
  window.sessionStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query }),
  });
  Object.defineProperty(navigator, "webdriver", {
    configurable: true,
    value: false,
  });
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 Chrome/140",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  const browser = window as TestAnalyticsWindow;
  delete browser.ammDataLayer;
  delete browser.__ammExternalAnalyticsActive;
  delete browser.__ammExternalAnalyticsContainerId;
  window.localStorage.clear();
  window.sessionStorage.clear();
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
      lead_source_surface: "buyer_page",
      experiment_key: "home_value_path",
      variant_key: "broker_review",
    })).toEqual({
      funnel_name: "renter",
      lead_source_surface: "buyer_page",
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
  });

  it("publishes only approved dimensions to browser analytics and the server ledger", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const browser = window as TestAnalyticsWindow;
    browser.ammDataLayer = [];
    browser.__ammExternalAnalyticsActive = true;
    browser.__ammExternalAnalyticsContainerId = OUR_TOWN_GTM_CONTAINER_ID;
    window.localStorage.setItem(
      EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY,
      "granted",
    );

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

    expect(browser.ammDataLayer).toEqual([
      {
        funnel_name: "seller",
        current_path: "/",
        device_category: "desktop",
        placement: "homepage",
        placement_id: "homepage-hero",
        utm_source: "facebook",
        utm_medium: "social_organic",
        utm_campaign: "home_value",
        event_source: "ask_magic_mike",
        event_schema_version: "amm_public_v1",
        traffic_class: "public_production",
        event: "page_view",
      },
    ]);
    const browserProperties = browser.ammDataLayer[0] as Record<string, unknown>;
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

  it("does not emit first-party KPI writes from an automated browser", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "webdriver", {
      configurable: true,
      value: false,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 HeadlessChrome/140",
    });

    trackEvent("page_view", {}, { funnel_name: "home_value" });
    const experimentOutcome = await recordExperimentEvent(
      {
        experimentKey: "home_value_trust_promise_v1",
        subjectKey: "a".repeat(64),
        variantKey: "control",
      },
      "exposure",
    );

    expect(experimentOutcome).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
