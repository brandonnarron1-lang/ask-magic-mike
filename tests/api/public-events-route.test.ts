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
});
