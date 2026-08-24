import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("../../app/lib/serverAnalytics", async () => {
  const actual = await vi.importActual<typeof import("../../app/lib/serverAnalytics")>(
    "../../app/lib/serverAnalytics",
  );
  return {
    ...actual,
    recordServerAnalyticsEvent: (...args: unknown[]) => recordMock(...args),
  };
});

import { POST } from "../../app/api/events/route";

function request(body: unknown, userAgent = "Mozilla/5.0 Chrome/140") {
  return new Request("https://www.askmagicmike.com/api/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.askmagicmike.com",
      "user-agent": userAgent,
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

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("persists an approved public event", async () => {
    const response = await POST(request({ event_name: "funnel_started", properties: { funnel_name: "seller" } }));
    expect(response.status).toBe(202);
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({ eventName: "funnel_started" }));
  });

  it("persists a valid anonymous funnel identity without pre-creating a canonical session", async () => {
    const sessionId = "11111111-1111-4111-8111-111111111111";
    const response = await POST(request({
      event_name: "address_submitted",
      session_id: sessionId,
      properties: {
        funnel_name: "home_value",
        step_name: "address",
        current_path: "/home-value",
        funnel_session_id: "22222222-2222-4222-8222-222222222222",
      },
    }));

    expect(response.status).toBe(202);
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "address_submitted",
      sessionId: null,
      funnelSessionId: sessionId,
      leadId: null,
    }));
    expect(recordMock.mock.calls[0][0].properties).not.toHaveProperty("funnel_session_id");
  });

  it("does not persist a malformed funnel identifier", async () => {
    const response = await POST(request({
      event_name: "funnel_started",
      session_id: "person@example.com",
      properties: { funnel_name: "seller" },
    }));

    expect(response.status).toBe(202);
    const event = recordMock.mock.calls[0][0] as Record<string, unknown>;
    expect(event.sessionId).toBeNull();
    expect(event).not.toHaveProperty("funnelSessionId");
  });

  it("accepts but does not persist automated-browser telemetry", async () => {
    const response = await POST(request(
      { event_name: "page_view", properties: { path: "/home-value" } },
      "Mozilla/5.0 HeadlessChrome/140",
    ));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      persisted: false,
      excluded: "automation",
    });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("fails truthfully when the canonical event write is unavailable", async () => {
    recordMock.mockResolvedValue(false);
    const response = await POST(request({ event_name: "page_view", properties: { path: "/" } }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      persisted: false,
      error: "Event persistence is unavailable.",
    });
  });

  it("rejects a syntactically valid but unapproved event", async () => {
    const response = await POST(request({ event_name: "manufactured_conversion" }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });
  it("rejects delivery events that must come from trusted server/provider paths", async () => {
    const response = await POST(request({ event_name: "notification_delivered" }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it.each(["lead_created", "widget_lead_created", "lead_qualified", "appointment_requested"])(
    "rejects browser-authored canonical outcome event %s",
    async (eventName) => {
      const response = await POST(request({
        event_name: eventName,
        session_id: "11111111-1111-4111-8111-111111111111",
        properties: { funnel_name: "home_value" },
      }));
      expect(response.status).toBe(400);
      expect(recordMock).not.toHaveBeenCalled();
    },
  );

  it("rejects an oversized event before parsing or persistence", async () => {
    const response = await POST(request({
      event_name: "funnel_started",
      properties: { padding: "x".repeat(5_000) },
    }));
    expect(response.status).toBe(413);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("drops arbitrary and PII-bearing properties before persistence", async () => {
    const response = await POST(request({
      event_name: "funnel_started",
      event_category: "admin",
      lead_id: "00000000-0000-4000-8000-000000000001",
      properties: {
        funnel_name: "seller",
        arbitrary: "person@example.com",
        surface: "252-555-0100",
      },
      attribution: {
        source: "SarahJohnson",
        medium: "social_organic",
        campaign: "3106-quinn-drive",
      },
    }));
    expect(response.status).toBe(202);
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({
      category: "intake",
      leadId: null,
      properties: { funnel_name: "seller" },
      attribution: {
        source: undefined,
        medium: "social_organic",
        campaign: undefined,
      },
      userAgent: "browser/desktop",
    }));
  });

  it("persists a normalized Web Vital without lead, session, or attribution context", async () => {
    const response = await POST(request({
      event_name: "web_vital_observed",
      event_category: "admin",
      session_id: "11111111-1111-4111-8111-111111111111",
      lead_id: "22222222-2222-4222-8222-222222222222",
      attribution: { source: "facebook" },
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
    expect(recordMock).toHaveBeenCalledWith({
      eventName: "web_vital_observed",
      category: "system",
      sessionId: null,
      leadId: null,
      attribution: undefined,
      properties: {
        metric_code: "INP",
        metric_id: "wv1_55470c37b9b6e86d4755e4a48a2390b39df2ffb2499f54af7f14cd9c7160a278",
        metric_value: 145.4,
        rating: "good",
        navigation_type: "navigate",
        route: "/buy",
        device_category: "desktop",
        traffic_class: "public_production",
      },
      userAgent: "browser/desktop",
    });
  });

  it("rejects Web Vitals outside canonical Production and excludes automation without persistence", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const previewResponse = await POST(request({
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
    expect(previewResponse.status).toBe(400);

    vi.stubEnv("VERCEL_ENV", "production");
    const automationRequest = new Request("https://www.askmagicmike.com/api/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://www.askmagicmike.com",
        "user-agent": "Mozilla/5.0 HeadlessChrome/140",
      },
      body: JSON.stringify({
        event_name: "web_vital_observed",
        properties: {
          metric_name: "CLS",
          metric_id: "v5-safe-automation",
          metric_value: 0.08,
          rating: "good",
          navigation_type: "navigate",
          route: "/",
          device_category: "desktop",
          traffic_class: "public_production",
        },
      }),
    });
    const automationResponse = await POST(automationRequest);
    expect(automationResponse.status).toBe(202);
    await expect(automationResponse.json()).resolves.toMatchObject({
      ok: true,
      persisted: false,
      excluded: "automation",
    });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects malformed, private-route, and relabeled experience payloads", async () => {
    for (const properties of [
      {
        metric_name: "TTFB",
        metric_id: "v5-safe",
        metric_value: 1200,
        rating: "good",
        navigation_type: "navigate",
        route: "/home-value",
        device_category: "desktop",
        traffic_class: "public_production",
      },
      {
        metric_name: "LCP",
        metric_id: "v5-safe",
        metric_value: 1200,
        rating: "good",
        navigation_type: "navigate",
        route: "/admin/leads",
        device_category: "desktop",
        traffic_class: "public_production",
      },
      {
        metric_name: "LCP",
        metric_id: "v5-safe",
        metric_value: 1200,
        rating: "good",
        navigation_type: "navigate",
        route: "/home-value",
        device_category: "desktop",
        traffic_class: "internal_qa",
      },
    ]) {
      const response = await POST(request({ event_name: "web_vital_observed", properties }));
      expect(response.status).toBe(400);
    }
    expect(recordMock).not.toHaveBeenCalled();
  });
});
