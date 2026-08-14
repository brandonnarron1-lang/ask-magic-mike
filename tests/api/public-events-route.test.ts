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
    headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com" },
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

  it("rejects a syntactically valid but unapproved event", async () => {
    const response = await POST(request({ event_name: "manufactured_conversion" }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });
});
