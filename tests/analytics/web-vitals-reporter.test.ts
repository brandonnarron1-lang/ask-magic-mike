import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  isKnownInternalQaAttribution,
  isKnownInternalQaSearch,
  normalizePublicExperienceRoute,
  normalizeWebVitalEventProperties,
  toWebVitalAnalyticsProperties,
} from "../../app/lib/experience/web-vitals";
import {
  coarseWebVitalUserAgent,
  isCanonicalProductionWebVitalRequest,
} from "../../app/lib/experience/web-vitals-server";
import { safePublicAnalyticsProperties } from "../../src/lib/analytics/privacy";

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

  it("normalizes only registered public routes and collapses open-house identifiers", () => {
    expect(normalizePublicExperienceRoute("/home-value/")).toBe("/home-value");
    expect(normalizePublicExperienceRoute("/open-house/3106-quinn-dr")).toBe("/open-house/[property-or-id]");
    expect(normalizePublicExperienceRoute("/admin/leads")).toBeNull();
    expect(normalizePublicExperienceRoute("/api/leads")).toBeNull();
    expect(normalizePublicExperienceRoute("/widget-preview")).toBeNull();
    expect(normalizePublicExperienceRoute("/social-preview")).toBeNull();
    expect(normalizePublicExperienceRoute("/integrations/ourtownproperties")).toBeNull();
    expect(normalizePublicExperienceRoute("/home-value?email=hidden@example.com")).toBeNull();
  });

  it("excludes known QA query strings and either canonical attribution storage shape", () => {
    expect(isKnownInternalQaSearch("?utm_source=internal_qa&utm_medium=qa")).toBe(true);
    expect(isKnownInternalQaSearch("?gclid=INTERNAL_QA")).toBe(true);
    expect(isKnownInternalQaSearch("?utm_content=controlled_test")).toBe(true);
    expect(isKnownInternalQaSearch("?utm_source=google&utm_medium=organic")).toBe(false);
    expect(isKnownInternalQaAttribution({ source: "internal_qa_wordpress_bridge" })).toBe(true);
    expect(isKnownInternalQaAttribution({ utmSource: "test", utmMedium: "qa" })).toBe(true);
    expect(isKnownInternalQaAttribution({ first_touch: { source: "internal_qa" } })).toBe(true);
    expect(isKnownInternalQaAttribution({ utmSource: "google", utmMedium: "organic_local" })).toBe(false);
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
    expect(normalizeWebVitalEventProperties(validProperties({ route: "/admin/growth" }))).toBeNull();
    expect(normalizeWebVitalEventProperties(validProperties({ device_category: "tablet" }))).toBeNull();
  });

  it("derives the stored rating from the bounded metric value", () => {
    expect(normalizeWebVitalEventProperties(validProperties({ metric_value: 4_001, rating: "good" }))?.rating)
      .toBe("poor");
    expect(normalizeWebVitalEventProperties(validProperties({ metric_name: "CLS", metric_value: 0.2, rating: "good" }))?.rating)
      .toBe("needs-improvement");
  });

  it("rejects attempts to relabel Preview or test observations", () => {
    expect(normalizeWebVitalEventProperties(validProperties({ traffic_class: "preview" }))).toBeNull();
    expect(normalizeWebVitalEventProperties(validProperties({ traffic_class: "internal_qa" }))).toBeNull();
  });

  it("accepts telemetry only on an exact canonical Production origin", () => {
    const request = new Request("https://www.askmagicmike.com/api/events", {
      headers: { origin: "https://www.askmagicmike.com" },
    });
    expect(isCanonicalProductionWebVitalRequest(request, { VERCEL_ENV: "production" })).toBe(true);
    expect(isCanonicalProductionWebVitalRequest(request, { VERCEL_ENV: "preview" })).toBe(false);
    expect(isCanonicalProductionWebVitalRequest(new Request("https://preview.vercel.app/api/events", {
      headers: { origin: "https://preview.vercel.app" },
    }), { VERCEL_ENV: "production" })).toBe(false);
  });

  it("stores only the registered, sanitizer-safe measurement contract", () => {
    const normalized = normalizeWebVitalEventProperties(validProperties());
    expect(normalized).not.toBeNull();
    const stored = safePublicAnalyticsProperties(
      "web_vital_observed",
      toWebVitalAnalyticsProperties(normalized!),
    );
    expect(stored).toEqual({
      metric_code: "LCP",
      metric_id: "v5-1787346000000-123456789",
      metric_value: 1834.57,
      rating: "good",
      navigation_type: "navigate",
      route: "/home-value",
      device_category: "mobile",
      traffic_class: "public_production",
    });
    expect(stored).not.toHaveProperty("metric_name");
  });

  it("renders the reporter only in Production and keeps identifiers out of its payload", () => {
    const root = process.cwd();
    const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
    const reporter = fs.readFileSync(
      path.join(root, "app/components/experience/WebVitalsReporter.tsx"),
      "utf8",
    );
    expect(layout).toContain('process.env.VERCEL_ENV === "production"');
    expect(reporter).toContain('event_name: "web_vital_observed"');
    expect(reporter).not.toContain("session_id");
    expect(reporter).not.toContain("lead_id");
    expect(reporter).not.toContain("attribution:");
  });
});
