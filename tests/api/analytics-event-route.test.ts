/**
 * Route-level tests for POST /api/analytics/event.
 *
 * Validates schema enforcement (known / unknown event names), required fields,
 * optional attribution passthrough, and that valid payloads reach the analytics
 * ledger. The ledger is mocked — no Supabase or network.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const trackMock = vi.fn();

vi.mock("@/lib/analytics/ledger", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { POST } from "@/app/api/analytics/event/route";

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/analytics/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/event", () => {
  beforeEach(() => {
    trackMock.mockReset();
    trackMock.mockResolvedValue(undefined);
  });

  it("accepts a known event name and calls trackEvent", async () => {
    const res = await POST(post({ eventName: "landing_page_viewed", properties: { surface: "hero" } }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(trackMock).toHaveBeenCalledOnce();
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "landing_page_viewed" })
    );
  });

  it("returns 422 for unknown event names", async () => {
    const res = await POST(post({ eventName: "unknown_event_xyz", properties: {} }));
    expect(res.status).toBe(422);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/analytics/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not valid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("returns 422 when eventName is missing entirely", async () => {
    const res = await POST(post({ properties: { surface: "hero" } }));
    expect(res.status).toBe(422);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("passes utm attribution fields through to trackEvent", async () => {
    const res = await POST(post({
      eventName: "cta_chip_clicked",
      sessionId: "00000000-0000-4000-8000-000000000001",
      utmSource: "facebook",
      utmMedium: "paid_social",
      utmCampaign: "wilson-nc-sellers",
      properties: { surface: "landing_hero" },
    }));
    expect(res.status).toBe(200);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "cta_chip_clicked",
        utmSource: "facebook",
        utmMedium: "paid_social",
        utmCampaign: "wilson-nc-sellers",
      })
    );
  });

  it("includes ip and user-agent forwarded from request headers", async () => {
    const req = new NextRequest("http://localhost/api/analytics/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.42, 10.0.0.1",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify({ eventName: "page_view" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: "203.0.113.42",
        userAgent: "Mozilla/5.0",
      })
    );
  });

  it("accepts widget events that the client fires through this endpoint", async () => {
    const widgetEvents = [
      "widget_opened",
      "widget_started",
      "widget_lead_created",
      "widget_submit_failed",
    ] as const;
    for (const eventName of widgetEvents) {
      trackMock.mockReset();
      trackMock.mockResolvedValue(undefined);
      const res = await POST(post({ eventName }));
      expect(res.status).toBe(200);
      expect(trackMock).toHaveBeenCalledOnce();
    }
  });

  it("accepts an empty properties object", async () => {
    const res = await POST(post({ eventName: "session_created" }));
    expect(res.status).toBe(200);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "session_created", properties: {} })
    );
  });
});
