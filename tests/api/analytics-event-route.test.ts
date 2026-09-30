/**
 * Route-level tests for POST /api/analytics/event.
 *
 * Validates schema enforcement (known / unknown event names), required fields,
 * optional attribution passthrough, and that valid payloads reach the analytics
 * ledger. The ledger is mocked — no Supabase or network.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const trackMock = vi.fn();
const rateLimitMock = vi.fn();

vi.mock("@/lib/analytics/ledger", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
  trackEventNoWait: (...args: unknown[]) => trackMock(...args),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
  LIMITS: { analyticsEvent: { limit: 60, windowMs: 60_000 } },
  rateLimitKey: (value: string | null) => value || "anonymous",
  nonDurableRateLimitFallbackAllowed: () =>
    process.env.VERCEL_ENV !== "production"
    || process.env.RATE_LIMIT_EMERGENCY_MEMORY?.trim() === "1",
}));

import { POST } from "@/app/api/analytics/event/route";

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/analytics/event", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.askmagicmike.com",
      "user-agent": "Mozilla/5.0 Chrome/140",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/event", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    rateLimitMock.mockReset();
    rateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      durable: true,
    });
    trackMock.mockReset();
    trackMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a known event name and calls trackEvent", async () => {
    const res = await POST(post({ eventName: "landing_page_viewed", properties: { surface: "hero" } }));
    expect(res.status).toBe(202);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.correlation_id).toBe(res.headers.get("x-amm-correlation-id"));
    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(trackMock).toHaveBeenCalledOnce();
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "landing_page_viewed" })
    );
  });

  it("fails closed before rate limiting or persisting ordinary Preview telemetry", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const res = await POST(post({ eventName: "page_view", properties: { path: "/ask" } }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      persisted: false,
      code: "preview_data_disabled",
    });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("rejects a missing Origin before limiting or persistence", async () => {
    const req = new NextRequest("https://www.askmagicmike.com/api/analytics/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 Chrome/140",
      },
      body: JSON.stringify({ eventName: "page_view" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toMatchObject({ code: "origin_not_approved" });
    expect(body.correlation_id).toBe(res.headers.get("x-amm-correlation-id"));
    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("accepts but never persists automated-browser telemetry", async () => {
    const req = new NextRequest("https://www.askmagicmike.com/api/analytics/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://www.askmagicmike.com",
        "user-agent": "Mozilla/5.0 HeadlessChrome/140",
      },
      body: JSON.stringify({ eventName: "page_view" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      persisted: false,
      excluded: "automation",
    });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("fails closed before persistence when Production limiting is non-durable", async () => {
    rateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      durable: false,
    });

    const res = await POST(post({ eventName: "page_view" }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      persisted: false,
      code: "rate_limit_store_unavailable",
    });
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("preserves the exact emergency-memory break-glass value", async () => {
    vi.stubEnv("RATE_LIMIT_EMERGENCY_MEMORY", "1");
    rateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      durable: false,
    });

    const res = await POST(post({ eventName: "page_view" }));

    expect(res.status).toBe(202);
    expect(trackMock).toHaveBeenCalledOnce();
  });

  it("returns bounded retry guidance without persisting a throttled event", async () => {
    rateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 10_000_000,
      durable: true,
    });

    const res = await POST(post({ eventName: "page_view" }));
    const body = await res.json();
    const retryAfter = Number(res.headers.get("retry-after"));

    expect(res.status).toBe(429);
    expect(body).toMatchObject({ code: "rate_limited" });
    expect(body.correlation_id).toBe(res.headers.get("x-amm-correlation-id"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("returns 422 for unknown event names", async () => {
    const res = await POST(post({ eventName: "unknown_event_xyz", properties: {} }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toMatchObject({ code: "invalid_event_payload" });
    expect(body).not.toHaveProperty("issues");
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/analytics/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://www.askmagicmike.com",
        "user-agent": "Mozilla/5.0 Chrome/140",
      },
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
    expect(res.status).toBe(202);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "cta_chip_clicked",
        funnelSessionId: "00000000-0000-4000-8000-000000000001",
        utmSource: "facebook",
        utmMedium: "paid_social",
        utmCampaign: "wilson-nc-sellers",
      })
    );
    expect(trackMock.mock.calls[0][0]).not.toHaveProperty("sessionId");
  });

  it("uses IP only for abuse control and forwards a coarse user-agent class", async () => {
    const req = new NextRequest("http://localhost/api/analytics/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://www.askmagicmike.com",
        "user-agent": "Mozilla/5.0 Chrome/140",
        "x-forwarded-for": "203.0.113.42, 10.0.0.1",
      },
      body: JSON.stringify({ eventName: "page_view" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: "browser/desktop",
      })
    );
    expect(trackMock.mock.calls[0][0]).not.toHaveProperty("ipAddress");
  });

  it("drops arbitrary and PII-bearing public properties", async () => {
    const res = await POST(post({
      eventName: "landing_page_viewed",
      properties: {
        surface: "person@example.com",
        arbitrary: "252-555-0100",
        path: "/home-value",
      },
      utmSource: "person@example.com",
      utmMedium: "social_organic",
      utmCampaign: "3106 Quinn Drive",
    }));
    expect(res.status).toBe(202);
    expect(trackMock).toHaveBeenCalledWith(expect.objectContaining({
      properties: { path: "/home-value" },
      utmSource: undefined,
      utmMedium: "social_organic",
      utmCampaign: undefined,
    }));
  });

  it("rejects internal-only events at the public boundary", async () => {
    const res = await POST(post({ eventName: "lead_scored", properties: { score: 99 } }));
    expect(res.status).toBe(422);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("rejects public attempts to associate an event with a canonical lead", async () => {
    const res = await POST(post({
      eventName: "widget_lead_created",
      leadId: "00000000-0000-4000-8000-000000000001",
    }));
    expect(res.status).toBe(422);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it.each(["lead_created", "widget_lead_created", "lead_qualified", "appointment_requested"])(
    "rejects browser-authored canonical outcome %s",
    async (eventName) => {
      const res = await POST(post({
        eventName,
        sessionId: "00000000-0000-4000-8000-000000000001",
      }));
      expect(res.status).toBe(422);
      expect(trackMock).not.toHaveBeenCalled();
    },
  );

  it("rejects nested properties and oversized bodies", async () => {
    const nested = await POST(post({
      eventName: "page_view",
      properties: { context: { unsafe: true } },
    }));
    expect(nested.status).toBe(422);

    const oversized = await POST(post({
      eventName: "page_view",
      properties: { surface: "x".repeat(5_000) },
    }));
    expect(oversized.status).toBe(413);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("rejects a foreign browser origin", async () => {
    const req = new NextRequest("http://localhost/api/analytics/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
      },
      body: JSON.stringify({ eventName: "page_view" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("accepts widget events that the client fires through this endpoint", async () => {
    const widgetEvents = [
      "widget_opened",
      "widget_started",
      "widget_submit_failed",
    ] as const;
    for (const eventName of widgetEvents) {
      trackMock.mockReset();
      trackMock.mockResolvedValue(true);
      const res = await POST(post({ eventName }));
      expect(res.status).toBe(202);
      expect(trackMock).toHaveBeenCalledOnce();
    }
  });

  it("accepts an empty properties object", async () => {
    const res = await POST(post({ eventName: "session_created" }));
    expect(res.status).toBe(202);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "session_created", properties: {} })
    );
  });

  it("fails truthfully when the canonical event write is unavailable", async () => {
    trackMock.mockResolvedValue(false);
    const res = await POST(post({ eventName: "page_view", properties: { path: "/" } }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      persisted: false,
      code: "analytics_persistence_unavailable",
    });
  });
});
