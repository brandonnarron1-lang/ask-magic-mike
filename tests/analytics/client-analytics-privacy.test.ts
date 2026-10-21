import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { trackEvent } from "../../app/lib/analytics";
import { analyticsEvents } from "../../app/lib/constants";
import { recordExperimentEvent } from "../../app/lib/growth/public-experiment-client";
import { EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY } from "../../app/lib/externalAnalytics";
import { OUR_TOWN_GTM_CONTAINER_ID } from "../../app/lib/googleTagConfig";
import { resolveOwnedDemandPlacement } from "../../app/lib/growth/owned-demand";
import {
  isApprovedPublicAnalyticsEvent,
  safePublicAnalyticsProperties,
  safeRegisteredPublicAnalyticsDimension,
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
  it("registers intake_started with exactly two controlled first-input dimensions",()=>{
    expect(isApprovedPublicAnalyticsEvent("intake_started")).toBe(true);
    expect(safePublicAnalyticsProperties("intake_started",{
      funnel_name:"home_value",lead_source_surface:"home_value_page",
      step_name:"address",experiment_key:"home_value_path",variant_key:"broker_review",
      current_path:"/home-value",device_category:"mobile",utm_source:"facebook",utm_medium:"social_organic",utm_campaign:"amm_owned_demand_2026",
      placement:"homepage",placement_id:"homepage-hero",is_test:true,
      email:"person@example.test",phone:"2525550100",address:"3106 Quinn Drive",name:"Sarah Johnson",question:"Private property question",
    })).toEqual({funnel_name:"home_value",lead_source_surface:"home_value_page"});
    expect(safePublicAnalyticsProperties("intake_started",{
      funnel_name:"SarahJohnson",lead_source_surface:"3106-quinn-drive",
    })).toEqual({});
    expect(safePublicAnalyticsProperties("intake_started",{
      funnel_name:"person@example.test",lead_source_surface:"2525550100",
    })).toEqual({});
  });

  it("preserves the existing funnel_started submission-time field contract",()=>{
    expect(safePublicAnalyticsProperties("funnel_started",{
      funnel_name:"home_value",lead_source_surface:"home_value_page",step_name:"address",
      experiment_key:"home_value_path",variant_key:"broker_review",utm_source:"facebook",is_test:true,
    })).toEqual({funnel_name:"home_value",lead_source_surface:"home_value_page",step_name:"address",
      experiment_key:"home_value_path",variant_key:"broker_review",utm_source:"facebook",is_test:true});
  });

  it("allows only the registered property_search value for the Browse Homes hero CTA",()=>{
    expect(safePublicAnalyticsProperties("hero_cta_click",{
      funnel_name:"property_search",surface:"homepage",address:"3106 Quinn Drive",email:"person@example.test",
    })).toEqual({funnel_name:"property_search",surface:"homepage"});
    expect(safePublicAnalyticsProperties("hero_cta_click",{
      funnel_name:"property_search_3106_quinn_drive",surface:"homepage",
    })).toEqual({surface:"homepage"});
  });

  it.each(["facebook","instagram"])("comparison %s links reuse only existing registered PII-free public dimensions",channel=>{
    const url=new URL(resolveOwnedDemandPlacement(channel,"compare_selling_options")!.trackedUrl);
    for(const key of ["utm_source","utm_medium","utm_campaign"] as const){
      expect(safeRegisteredPublicAnalyticsDimension(key,url.searchParams.get(key))).toBe(url.searchParams.get(key));
      expect(safeRegisteredPublicAnalyticsDimension(key,"SarahJohnson-3106-quinn-drive")).toBeNull();
    }
    // Offer content stays in canonical attribution, not a new arbitrary public dimension.
    expect(safePublicAnalyticsProperties("page_view",{utm_content:url.searchParams.get("utm_content"),email:"private@example.test",seller_option:"compare"})).toEqual({});
  });
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
    expect(safePublicAnalyticsProperties("appointment_requested", {
      funnel_name: "renter",
      request_surface: "renter_page",
    })).toEqual({
      funnel_name: "renter",
      request_surface: "renter_page",
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
    expect(safePublicAnalyticsProperties("referral_share_handoff", {
      surface: "homepage",
      share_method: "native",
      email: "person@example.com",
      destination: "2525550100",
    })).toEqual({
      surface: "homepage",
      share_method: "native",
    });
    expect(
      safeRegisteredPublicAnalyticsDimension("utm_source", "consumer_share"),
    ).toBe("consumer_share");
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
    const browser = window as TestAnalyticsWindow;
    browser.ammDataLayer = [];
    browser.__ammExternalAnalyticsActive = true;
    browser.__ammExternalAnalyticsContainerId = OUR_TOWN_GTM_CONTAINER_ID;
    window.localStorage.setItem(
      EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY,
      "granted",
    );

    trackEvent(
      "lead_created",
      { source: "direct" },
      { funnel_name: "seller", lead_source_surface: "seller_page" },
      { sessionId: "11111111-1111-4111-8111-111111111111" },
    );

    expect(browser.ammDataLayer).toEqual([
      expect.objectContaining({ event: "lead_created" }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps widget conversion visible to browser analytics without duplicating the server ledger", () => {
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
      "widget_lead_created",
      { source: "ourtownproperties" },
      { funnel_name: "home_value" },
      { sessionId: "11111111-1111-4111-8111-111111111111" },
    );

    expect(browser.ammDataLayer).toEqual([
      expect.objectContaining({ event: "widget_lead_created" }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps appointment conversion visible externally without accepting a browser-authored ledger row", () => {
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
      "appointment_requested",
      { source: "direct" },
      { funnel_name: "renter", request_surface: "renter_page" },
      { sessionId: "11111111-1111-4111-8111-111111111111" },
    );

    expect(browser.ammDataLayer).toEqual([
      expect.objectContaining({
        event: "appointment_requested",
        funnel_name: "renter",
        request_surface: "renter_page",
      }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not emit first-party KPI writes from an automated browser", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const browserEvents: unknown[] = [];
    const listener = (event: Event) => {
      browserEvents.push((event as CustomEvent).detail);
    };
    window.addEventListener("askmagicmike:event", listener);
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
    window.removeEventListener("askmagicmike:event", listener);

    expect(experimentOutcome).toBeNull();
    expect(browserEvents).toEqual([
      expect.objectContaining({
        event: "page_view",
        properties: expect.objectContaining({ funnel_name: "home_value" }),
      }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
