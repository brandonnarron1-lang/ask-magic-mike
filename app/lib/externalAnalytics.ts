"use client";

import {
  isApprovedPublicAnalyticsEvent,
  safeAnalyticsPath,
  safePublicAnalyticsProperties,
} from "@/lib/analytics/privacy";
import { isBrowserAutomation } from "./browserAutomation";
import { isApprovedOurTownGtmContainerId } from "./googleTagConfig";

export const EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY =
  "amm_external_analytics_consent_v1";
export const EXTERNAL_ANALYTICS_PREFERENCES_EVENT =
  "askmagicmike:open-analytics-preferences";
export const EXTERNAL_ANALYTICS_SCRIPT_ID = "amm-google-tag-manager";
export const EXTERNAL_ANALYTICS_DATA_LAYER_NAME = "ammDataLayer";
export const EXTERNAL_ANALYTICS_SCHEMA_VERSION = "amm_public_v1";

const ATTRIBUTION_STORAGE_KEY = "amm_attribution";
const TRAFFIC_CLASS_STORAGE_KEY = "amm_external_analytics_traffic_class";
const CANONICAL_HOSTS = new Set(["askmagicmike.com", "www.askmagicmike.com"]);
const EXCLUDED_PUBLIC_ROUTES = new Set([
  "/campaigns",
  "/distribution",
  "/embed/ask",
  "/integrations/ourtownproperties",
  "/social-preview",
  "/widget",
  "/widget-preview",
  "/widget/v1",
]);
const ANALYTICS_COOKIE_PREFIXES = ["_ga", "_gid", "_gat", "_gac_", "_gcl_"];

export type ExternalAnalyticsConsent = "granted" | "denied" | "unset";

type ExternalAnalyticsWindow = Window & {
  ammDataLayer?: unknown[];
  __ammExternalAnalyticsActive?: boolean;
  __ammExternalAnalyticsLoaded?: boolean;
  __ammExternalAnalyticsContainerId?: string;
};

export type ExternalAnalyticsContext = {
  hostname: string;
  pathname: string;
  search: string;
  webdriver: boolean;
  trafficClass?: string | null;
  storedAttribution?: unknown;
};

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isInternalQaSearch(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const source = normalized(params.get("utm_source") ?? params.get("source"));
  const medium = normalized(params.get("utm_medium") ?? params.get("medium"));
  const campaign = normalized(params.get("utm_campaign") ?? params.get("campaign"));
  const content = normalized(params.get("utm_content"));
  const gclid = normalized(params.get("gclid"));
  return source.startsWith("internal_qa") || source === "qa" || source === "test" ||
    medium === "qa" || medium === "test" || campaign.includes("internal_qa") ||
    content === "controlled_test" || gclid === "internal_qa" ||
    params.get("is_test") === "true";
}

function isQaTouch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.is_test === true) return true;
  const params = new URLSearchParams();
  const entries = [
    ["utm_source", record.utm_source ?? record.utmSource ?? record.source],
    ["utm_medium", record.utm_medium ?? record.utmMedium ?? record.medium],
    ["utm_campaign", record.utm_campaign ?? record.utmCampaign ?? record.campaign],
    ["utm_content", record.utm_content ?? record.utmContent ?? record.content],
    ["gclid", record.gclid],
  ] as const;
  for (const [key, candidate] of entries) {
    if (typeof candidate === "string") params.set(key, candidate);
  }
  return isInternalQaSearch(params.toString());
}

function isInternalQaAttribution(value: unknown) {
  if (isQaTouch(value)) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return isQaTouch(record.first_touch) || isQaTouch(record.last_touch);
}

function parseStoredAttribution(raw: string | null) {
  if (!raw || raw.length > 8_192) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function isExternalAnalyticsEligibleContext(
  context: ExternalAnalyticsContext,
) {
  if (!CANONICAL_HOSTS.has(context.hostname) || context.webdriver) return false;
  const route = safeAnalyticsPath(context.pathname);
  if (!route || EXCLUDED_PUBLIC_ROUTES.has(route)) return false;
  if (context.trafficClass === "internal_qa") return false;
  if (isInternalQaSearch(context.search)) return false;
  return !isInternalQaAttribution(context.storedAttribution);
}

export function isExternalAnalyticsEligibleBrowser() {
  if (typeof window === "undefined") return false;
  let trafficClass: string | null = null;
  let storedAttribution: unknown = null;
  try {
    trafficClass = window.sessionStorage.getItem(TRAFFIC_CLASS_STORAGE_KEY);
    storedAttribution = parseStoredAttribution(
      window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY),
    );
  } catch {
    // Storage may be unavailable. Host, route, query, and automation checks
    // still fail closed for known private and QA contexts.
  }

  const eligible = isExternalAnalyticsEligibleContext({
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    search: window.location.search,
    webdriver: isBrowserAutomation(),
    trafficClass,
    storedAttribution,
  });
  if (!eligible && (
    isInternalQaSearch(window.location.search) ||
    isInternalQaAttribution(storedAttribution)
  )) {
    try {
      window.sessionStorage.setItem(TRAFFIC_CLASS_STORAGE_KEY, "internal_qa");
    } catch {
      // Exclusion still applies to this page when storage is blocked.
    }
  }
  return eligible;
}

export function readExternalAnalyticsConsent(): ExternalAnalyticsConsent {
  if (typeof window === "undefined") return "unset";
  try {
    const value = window.localStorage.getItem(
      EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY,
    );
    return value === "granted" || value === "denied" ? value : "unset";
  } catch {
    return "unset";
  }
}

export function writeExternalAnalyticsConsent(
  consent: Exclude<ExternalAnalyticsConsent, "unset">,
) {
  try {
    window.localStorage.setItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY, consent);
    return true;
  } catch {
    return false;
  }
}

function queueGtag(
  analyticsWindow: ExternalAnalyticsWindow,
  ...parameters: unknown[]
) {
  analyticsWindow.ammDataLayer ??= [];
  const command = (function commandArguments(..._values: unknown[]) {
    // Google's gtag command queue requires the function's Arguments object.
    // eslint-disable-next-line prefer-rest-params
    return arguments;
  })(...parameters);
  analyticsWindow.ammDataLayer.push(command);
}

function queueDeniedConsent(analyticsWindow: ExternalAnalyticsWindow) {
  queueGtag(analyticsWindow, "consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
  queueGtag(analyticsWindow, "set", "ads_data_redaction", true);
  queueGtag(analyticsWindow, "set", "url_passthrough", false);
}

function queueAnalyticsGrant(analyticsWindow: ExternalAnalyticsWindow) {
  queueGtag(analyticsWindow, "consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
}

export function loadExternalAnalytics(containerId: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!isApprovedOurTownGtmContainerId(containerId)) return false;
  if (readExternalAnalyticsConsent() !== "granted") return false;
  if (!isExternalAnalyticsEligibleBrowser()) return false;

  const analyticsWindow = window as ExternalAnalyticsWindow;
  if (
    analyticsWindow.__ammExternalAnalyticsActive &&
    analyticsWindow.__ammExternalAnalyticsContainerId === containerId
  ) {
    return true;
  }

  analyticsWindow.ammDataLayer ??= [];
  queueDeniedConsent(analyticsWindow);
  queueAnalyticsGrant(analyticsWindow);
  analyticsWindow.ammDataLayer.push({
    amm_platform: "ask_magic_mike",
    amm_traffic_class: "public_production",
    amm_schema_version: EXTERNAL_ANALYTICS_SCHEMA_VERSION,
  });
  analyticsWindow.ammDataLayer.push({
    "gtm.start": Date.now(),
    event: "gtm.js",
  });
  analyticsWindow.__ammExternalAnalyticsActive = true;
  analyticsWindow.__ammExternalAnalyticsContainerId = containerId;

  if (document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)) {
    analyticsWindow.__ammExternalAnalyticsLoaded = true;
    return true;
  }

  const script = document.createElement("script");
  script.id = EXTERNAL_ANALYTICS_SCRIPT_ID;
  script.async = true;
  script.referrerPolicy = "strict-origin-when-cross-origin";
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}&l=${encodeURIComponent(EXTERNAL_ANALYTICS_DATA_LAYER_NAME)}`;
  script.addEventListener("load", () => {
    analyticsWindow.__ammExternalAnalyticsLoaded = true;
  });
  script.addEventListener("error", () => {
    analyticsWindow.__ammExternalAnalyticsActive = false;
    analyticsWindow.__ammExternalAnalyticsLoaded = false;
    analyticsWindow.ammDataLayer = [];
    script.remove();
  });
  document.head.appendChild(script);
  return true;
}

function clearAnalyticsCookies() {
  if (typeof document === "undefined") return;
  try {
    const cookieNames = document.cookie
      .split(";")
      .map((entry) => entry.split("=", 1)[0]?.trim())
      .filter((name): name is string => Boolean(name))
      .filter((name) => ANALYTICS_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)));
    for (const name of cookieNames) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.askmagicmike.com; SameSite=Lax`;
    }
  } catch {
    // Privacy controls must not break navigation when browser cookie access is
    // unavailable; consent is still denied and app event publication stops.
  }
}

export function deactivateExternalAnalytics(options: { clearCookies?: boolean } = {}) {
  if (typeof window === "undefined") return false;
  const analyticsWindow = window as ExternalAnalyticsWindow;
  const hadLoadedRuntime = analyticsWindow.__ammExternalAnalyticsLoaded === true;
  const ownsRuntime = Boolean(
    analyticsWindow.__ammExternalAnalyticsActive ||
    analyticsWindow.__ammExternalAnalyticsContainerId ||
    document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID),
  );
  if (ownsRuntime && analyticsWindow.ammDataLayer) {
    queueGtag(analyticsWindow, "consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  }
  analyticsWindow.__ammExternalAnalyticsActive = false;
  analyticsWindow.__ammExternalAnalyticsLoaded = false;
  analyticsWindow.__ammExternalAnalyticsContainerId = undefined;
  document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)?.remove();
  if (!hadLoadedRuntime && analyticsWindow.ammDataLayer) {
    analyticsWindow.ammDataLayer = [];
  }
  if (options.clearCookies) clearAnalyticsCookies();
  return hadLoadedRuntime;
}

export function publishExternalAnalyticsEvent(
  event: string,
  properties: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") return false;
  const analyticsWindow = window as ExternalAnalyticsWindow;
  if (!analyticsWindow.__ammExternalAnalyticsActive) return false;
  if (readExternalAnalyticsConsent() !== "granted") return false;
  if (!isApprovedOurTownGtmContainerId(
    analyticsWindow.__ammExternalAnalyticsContainerId,
  )) return false;
  if (!isExternalAnalyticsEligibleBrowser()) return false;
  if (!isApprovedPublicAnalyticsEvent(event)) return false;

  // Treat the GTM boundary as an independent privacy boundary. Callers already
  // sanitize public events, but a future direct caller must not be able to add
  // a contact field, unregistered dimension, or test event to the browser tag.
  const safeProperties = safePublicAnalyticsProperties(event, properties);
  if (safeProperties.is_test === true) return false;
  delete safeProperties.is_test;

  analyticsWindow.ammDataLayer ??= [];
  const payload = {
    ...safeProperties,
    event_source: "ask_magic_mike",
    event_schema_version: EXTERNAL_ANALYTICS_SCHEMA_VERSION,
    traffic_class: "public_production",
    event,
  };
  analyticsWindow.ammDataLayer.push(payload);
  return true;
}
