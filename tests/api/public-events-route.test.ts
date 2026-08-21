import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMock = vi.fn();
const recordMock = vi.fn();

vi.mock("../../src/lib/security/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
  LIMITS: { analyticsEvent: { limit: 60, windowMs: 60_000 } },
  rateLimitKey: () => "test-client",
}));

vi.mock("../../app/lib/publicOrigin", () => ({
  isApprovedPublicOrigin: () => true,
}));

vi.mock("../../app/lib/serverAnalytics", () => ({
  recordServerAnalyticsEvent: (...args: unknown[]) => recordMock(...args),
  safeAnalyticsProperties: (value: unknown) => value,
}));

import { POST } from "../../app/api/events/route";

function request(body: unknown) {
  return new Request("https://www.askmagicmike.com/api/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.askmagicmike.com",
      "user-agent": "Mozilla/5.0 Chrome/140",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    rateLimitMock.mockReset();
    rateLimitMock.mockResolvedValue({ allowed: true });
    recordMock.mockReset();
    recordMock.mockResolvedValue(true);
  });

  it("persists an approved public event", async () => {
    const response = await POST(request({ event_name: "funnel_started", properties: { funnel_name: "seller" } }));
    expect(response.status).toBe(202);
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({ eventName: "funnel_started" }));
  });

  it("rejects a syntactically valid but unapproved event", async () => {
    const response = await POST(request({ event_name: "manufactured_conversion" }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized event before parsing or persistence", async () => {
    const response = await POST(request({
      event_name: "funnel_started",
      properties: { padding: "x".repeat(5_000) },
    }));
    expect(response.status).toBe(413);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("accepts a strictly normalized Core Web Vital without lead or attribution context", async () => {
    const response = await POST(request({
      event_name: "web_vital_observed",
      event_category: "intake",
      session_id: "11111111-1111-4111-8111-111111111111",
      lead_id: "22222222-2222-4222-8222-222222222222",
      attribution: { source: "should_not_persist" },
      properties: {
        metric_name: "INP",
        metric_id: "v5-1787346000000-123456789",
        metric_value: 145.4,
        rating: "good",
        navigation_type: "navigate",
        route: "/buy",
        device_category: "desktop",
        traffic_class: "public_production",
      },
    }));
    expect(response.status).toBe(202);
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "web_vital_observed",
      category: "system",
      sessionId: null,
      leadId: null,
      attribution: undefined,
      properties: expect.objectContaining({ metric_code: "INP", route: "/buy" }),
      userAgent: "browser/desktop",
    }));
  });

  it("rejects Web Vitals outside canonical Production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const response = await POST(request({
      event_name: "web_vital_observed",
      properties: {
        metric_name: "LCP",
        metric_id: "v5-safe",
        metric_value: 1200,
        rating: "good",
        navigation_type: "navigate",
        route: "/home-value",
        device_category: "desktop",
        traffic_class: "public_production",
      },
    }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects malformed or non-public Web Vital payloads", async () => {
    const response = await POST(request({
      event_name: "web_vital_observed",
      properties: {
        metric_name: "LCP",
        metric_id: "v5-safe",
        metric_value: 1200,
        rating: "good",
        navigation_type: "navigate",
        route: "/admin/leads",
        device_category: "desktop",
        traffic_class: "public_production",
      },
    }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });
});
