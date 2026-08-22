import { describe, expect, it } from "vitest";

import {
  coarseWebVitalUserAgent,
  isCanonicalProductionWebVitalRequest,
  isKnownInternalQaSearch,
  normalizePublicExperienceRoute,
  normalizeWebVitalEventProperties,
  toWebVitalAnalyticsProperties,
} from "../../app/lib/experience/web-vitals";
import { safeAnalyticsProperties } from "../../src/lib/persistence/neon/analytics-event-repository";

function validProperties(overrides: Record<string, unknown> = {}) {
  return {
    metric_name: "LCP",
    metric_id: "v5-1787346000000-123456789",
    metric_value: 1834.567,
    rating: "good",
    navigation_type: "navigate",
    route: "/home-value",
    device_category: "mobile",
    traffic_class: "public_production",
    ...overrides,
  };
}

describe("privacy-minimized Web Vitals contract", () => {
  it("reduces raw user-agent data to a coarse browser or automation class", () => {
    expect(coarseWebVitalUserAgent("Mozilla/5.0 Chrome/140", "desktop")).toBe("browser/desktop");
    expect(coarseWebVitalUserAgent("Mozilla/5.0 HeadlessChrome/140", "mobile")).toBe("automation/mobile");
    expect(coarseWebVitalUserAgent(null, "desktop")).toBe("automation/desktop");
  });

  it("normalizes only public canonical routes and collapses open-house identifiers", () => {
    expect(normalizePublicExperienceRoute("/home-value/")).toBe("/home-value");
    expect(normalizePublicExperienceRoute("/open-house/3106-quinn-dr")).toBe("/open-house/[property-or-id]");
    expect(normalizePublicExperienceRoute("/admin/leads")).toBeNull();
    expect(normalizePublicExperienceRoute("/api/leads")).toBeNull();
  });

  it("excludes known internal QA and controlled-test attribution", () => {
    expect(isKnownInternalQaSearch("?utm_source=internal_qa&utm_medium=qa")).toBe(true);
    expect(isKnownInternalQaSearch("?gclid=INTERNAL_QA")).toBe(true);
    expect(isKnownInternalQaSearch("?utm_content=controlled_test")).toBe(true);
    expect(isKnownInternalQaSearch("?utm_source=google&utm_medium=organic")).toBe(false);
  });

  it("accepts only LCP, INP, and CLS with bounded values and exact safe dimensions", () => {
    expect(normalizeWebVitalEventProperties(validProperties())).toEqual({
      metric_name: "LCP",
      metric_id: "v5-1787346000000-123456789",
      metric_value: 1834.57,
      rating: "good",
      navigation_type: "navigate",
      route: "/home-value",
      device_category: "mobile",
      traffic_class: "public_production",
    });
    expect(normalizeWebVitalEventProperties(validProperties({ metric_name: "TTFB" }))).toBeNull();
    expect(normalizeWebVitalEventProperties(validProperties({ metric_value: 700_000 }))).toBeNull();
    expect(normalizeWebVitalEventProperties(validProperties({ route: "/home-value?email=hidden" }))).toBeNull();
    expect(normalizeWebVitalEventProperties(validProperties({ device_category: "tablet" }))).toBeNull();
  });

  it("derives the stored rating from the bounded metric value", () => {
    expect(normalizeWebVitalEventProperties(validProperties({ metric_value: 4_001, rating: "good" }))?.rating)
      .toBe("poor");
    expect(normalizeWebVitalEventProperties(validProperties({ metric_name: "CLS", metric_value: 0.2, rating: "good" }))?.rating)
      .toBe("needs-improvement");
  });

  it("rejects client attempts to relabel Preview or test observations", () => {
    expect(normalizeWebVitalEventProperties(validProperties({ traffic_class: "preview" }))).toBeNull();
    expect(normalizeWebVitalEventProperties(validProperties({ traffic_class: "internal_qa" }))).toBeNull();
  });

  it("accepts telemetry only on the exact canonical Production origin", () => {
    const request = new Request("https://www.askmagicmike.com/api/events", {
      headers: { origin: "https://www.askmagicmike.com" },
    });
    expect(isCanonicalProductionWebVitalRequest(request, { VERCEL_ENV: "production" })).toBe(true);
    expect(isCanonicalProductionWebVitalRequest(request, { VERCEL_ENV: "preview" })).toBe(false);
    expect(isCanonicalProductionWebVitalRequest(new Request("https://preview.vercel.app/api/events", {
      headers: { origin: "https://preview.vercel.app" },
    }), { VERCEL_ENV: "production" })).toBe(false);
  });

  it("uses a sanitizer-safe metric code in the durable analytics record", () => {
    const normalized = normalizeWebVitalEventProperties(validProperties());
    expect(normalized).not.toBeNull();
    const stored = safeAnalyticsProperties(toWebVitalAnalyticsProperties(normalized!));
    expect(stored.metric_code).toBe("LCP");
    expect(stored).not.toHaveProperty("metric_name");
  });
});
