import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  deactivateExternalAnalytics,
  EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY,
  EXTERNAL_ANALYTICS_DATA_LAYER_NAME,
  EXTERNAL_ANALYTICS_SCRIPT_ID,
  isExternalAnalyticsEligibleBrowser,
  isExternalAnalyticsEligibleContext,
  loadExternalAnalytics,
  publishExternalAnalyticsEvent,
  readExternalAnalyticsConsent,
  writeExternalAnalyticsConsent,
} from "../../app/lib/externalAnalytics";
import {
  OUR_TOWN_GTM_CONTAINER_ID,
  resolveProductionGtmContainerId,
} from "../../app/lib/googleTagConfig";

type TestAnalyticsWindow = Window & {
  ammDataLayer?: unknown[];
  __ammExternalAnalyticsActive?: boolean;
  __ammExternalAnalyticsLoaded?: boolean;
  __ammExternalAnalyticsContainerId?: string;
};

function setPage(path: string, hostname = "www.askmagicmike.com") {
  const url = new URL(path, `https://${hostname}`);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      reload: () => {},
      toString: () => url.href,
    } as Location,
  });
}

function resetRuntime() {
  const analyticsWindow = window as TestAnalyticsWindow;
  delete analyticsWindow.ammDataLayer;
  delete (analyticsWindow as TestAnalyticsWindow & { dataLayer?: unknown[] }).dataLayer;
  delete analyticsWindow.__ammExternalAnalyticsActive;
  delete analyticsWindow.__ammExternalAnalyticsLoaded;
  delete analyticsWindow.__ammExternalAnalyticsContainerId;
  document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)?.remove();
}

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

beforeEach(() => {
  installLocalStorage();
  window.localStorage.clear();
  window.sessionStorage.clear();
  setPage("/home-value");
  Object.defineProperty(navigator, "webdriver", {
    configurable: true,
    value: false,
  });
  resetRuntime();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetRuntime();
});

describe("Production GTM identity isolation", () => {
  it("accepts only the verified Our Town container in Production", () => {
    expect(resolveProductionGtmContainerId({
      VERCEL_ENV: "production",
      NEXT_PUBLIC_GTM_CONTAINER_ID: OUR_TOWN_GTM_CONTAINER_ID,
    })).toBe(OUR_TOWN_GTM_CONTAINER_ID);
    expect(resolveProductionGtmContainerId({
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_GTM_CONTAINER_ID: OUR_TOWN_GTM_CONTAINER_ID,
    })).toBeNull();
    expect(resolveProductionGtmContainerId({
      VERCEL_ENV: "production",
      NEXT_PUBLIC_GTM_CONTAINER_ID: "GTM-NELLY1",
    })).toBeNull();
    expect(resolveProductionGtmContainerId({ VERCEL_ENV: "production" })).toBeNull();
  });

  it("allows only canonical consumer routes and excludes QA, automation, private, and embed contexts", () => {
    const base = {
      hostname: "www.askmagicmike.com",
      pathname: "/home-value",
      search: "",
      webdriver: false,
    };
    expect(isExternalAnalyticsEligibleContext(base)).toBe(true);
    expect(isExternalAnalyticsEligibleContext({ ...base, hostname: "preview.vercel.app" })).toBe(false);
    expect(isExternalAnalyticsEligibleContext({ ...base, pathname: "/admin/leads" })).toBe(false);
    expect(isExternalAnalyticsEligibleContext({ ...base, pathname: "/widget/v1" })).toBe(false);
    expect(isExternalAnalyticsEligibleContext({ ...base, pathname: "/embed/ask" })).toBe(false);
    expect(isExternalAnalyticsEligibleContext({ ...base, search: "?utm_source=internal_qa&utm_medium=qa" })).toBe(false);
    expect(isExternalAnalyticsEligibleContext({ ...base, webdriver: true })).toBe(false);
    expect(isExternalAnalyticsEligibleContext({
      ...base,
      storedAttribution: { first_touch: { source: "internal_qa_wordpress_bridge" } },
    })).toBe(false);
  });
});

describe("basic-consent external analytics runtime", () => {
  it("sends nothing and creates no tag before explicit consent", () => {
    expect(readExternalAnalyticsConsent()).toBe("unset");
    expect(loadExternalAnalytics(OUR_TOWN_GTM_CONTAINER_ID)).toBe(false);
    expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeNull();
    expect((window as TestAnalyticsWindow).ammDataLayer).toBeUndefined();
  });

  it("rejects an unrelated container even after consent", () => {
    writeExternalAnalyticsConsent("granted");
    expect(loadExternalAnalytics("GTM-NELLY1")).toBe(false);
    expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeNull();
    expect((window as TestAnalyticsWindow).ammDataLayer).toBeUndefined();
  });

  it("queues denied defaults, grants analytics only, and then loads the approved container", () => {
    expect(writeExternalAnalyticsConsent("granted")).toBe(true);
    expect(loadExternalAnalytics(OUR_TOWN_GTM_CONTAINER_ID)).toBe(true);

    const analyticsWindow = window as TestAnalyticsWindow;
    const script = document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID) as HTMLScriptElement;
    expect(script.src).toBe(
      `https://www.googletagmanager.com/gtm.js?id=${OUR_TOWN_GTM_CONTAINER_ID}&l=${EXTERNAL_ANALYTICS_DATA_LAYER_NAME}`,
    );
    expect(script.referrerPolicy).toBe("strict-origin-when-cross-origin");
    expect(analyticsWindow.__ammExternalAnalyticsActive).toBe(true);
    const commands = (analyticsWindow.ammDataLayer ?? [])
      .filter((entry) => Object.prototype.toString.call(entry) === "[object Arguments]")
      .map((entry) => Array.from(entry as IArguments));
    expect(commands[0]).toEqual([
      "consent",
      "default",
      expect.objectContaining({
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      }),
    ]);
    expect(commands).toContainEqual([
      "consent",
      "update",
      {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    ]);
    expect(analyticsWindow.ammDataLayer).toContainEqual(expect.objectContaining({
      amm_platform: "ask_magic_mike",
      amm_traffic_class: "public_production",
    }));
  });

  it("publishes a flat, controlled GTM event only while the consented runtime is active", () => {
    writeExternalAnalyticsConsent("granted");
    loadExternalAnalytics(OUR_TOWN_GTM_CONTAINER_ID);
    const analyticsWindow = window as TestAnalyticsWindow;
    const before = analyticsWindow.ammDataLayer?.length ?? 0;

    expect(publishExternalAnalyticsEvent("lead_created", {
      funnel_name: "seller",
      current_path: "/home-value",
    })).toBe(true);
    expect(analyticsWindow.ammDataLayer?.slice(before)).toEqual([{
      funnel_name: "seller",
      current_path: "/home-value",
      event_source: "ask_magic_mike",
      event_schema_version: "amm_public_v1",
      traffic_class: "public_production",
      event: "lead_created",
    }]);

    deactivateExternalAnalytics();
    expect(publishExternalAnalyticsEvent("lead_created", {
      funnel_name: "seller",
    })).toBe(false);
  });

  it("revalidates consent, event registration, privacy, and test exclusion at the GTM boundary", () => {
    writeExternalAnalyticsConsent("granted");
    loadExternalAnalytics(OUR_TOWN_GTM_CONTAINER_ID);
    const analyticsWindow = window as TestAnalyticsWindow;
    const before = analyticsWindow.ammDataLayer?.length ?? 0;

    expect(publishExternalAnalyticsEvent("unregistered_event", {
      funnel_name: "seller",
    })).toBe(false);
    expect(publishExternalAnalyticsEvent("page_view", {
      funnel_name: "seller",
      is_test: true,
    })).toBe(false);
    expect(analyticsWindow.ammDataLayer).toHaveLength(before);

    expect(publishExternalAnalyticsEvent("page_view", {
      funnel_name: "seller",
      arbitrary_contact_field: "person@example.com",
      is_test: false,
    })).toBe(true);
    expect(analyticsWindow.ammDataLayer?.slice(before)).toEqual([{
      funnel_name: "seller",
      event_source: "ask_magic_mike",
      event_schema_version: "amm_public_v1",
      traffic_class: "public_production",
      event: "page_view",
    }]);

    window.localStorage.setItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY, "denied");
    expect(publishExternalAnalyticsEvent("page_view", {
      funnel_name: "seller",
    })).toBe(false);
  });

  it("remembers QA classification for the session and refuses a later untagged page", () => {
    setPage("/home-value?utm_source=internal_qa&utm_medium=qa");
    expect(isExternalAnalyticsEligibleBrowser()).toBe(false);
    setPage("/buy");
    expect(isExternalAnalyticsEligibleBrowser()).toBe(false);
  });

  it("isolates its data layer and clears an unloaded queue on revocation", () => {
    const browser = window as TestAnalyticsWindow & { dataLayer?: unknown[] };
    browser.dataLayer = [{ owner: "unrelated-runtime" }];
    writeExternalAnalyticsConsent("granted");
    loadExternalAnalytics(OUR_TOWN_GTM_CONTAINER_ID);

    expect(browser.dataLayer).toEqual([{ owner: "unrelated-runtime" }]);
    expect(browser.ammDataLayer?.length).toBeGreaterThan(0);
    expect(deactivateExternalAnalytics()).toBe(false);
    expect(browser.ammDataLayer).toEqual([]);
    expect(browser.dataLayer).toEqual([{ owner: "unrelated-runtime" }]);
  });

  it("stores an explicit denial without loading Google", () => {
    expect(writeExternalAnalyticsConsent("denied")).toBe(true);
    expect(readExternalAnalyticsConsent()).toBe("denied");
    expect(window.localStorage.getItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY)).toBe("denied");
    expect(loadExternalAnalytics(OUR_TOWN_GTM_CONTAINER_ID)).toBe(false);
    expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeNull();
  });
});
