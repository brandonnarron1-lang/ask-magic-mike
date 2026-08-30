import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/admin/rbac-session", () => ({
  requireLeadCenterApiPermission: mocks.requirePermission,
}));

import { POST } from "../../app/api/admin/growth/vendor-ingress/test/route";

const URL = "https://www.askmagicmike.com/api/admin/growth/vendor-ingress/test";

function authorized() {
  mocks.requirePermission.mockResolvedValue({
    ok: true,
    principal: {
      userId: "synthetic-operator",
      role: "primary_lead_owner",
      agentId: null,
      email: "operator@example.test",
      name: "Synthetic Operator",
    },
  });
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.askmagicmike.com",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST vendor ingress contract lab", () => {
  it("returns a private, synthetic, no-write inspection to a growth operator", async () => {
    authorized();
    const response = await POST(request({ profile: "google_ads_lead_form" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      inspection: {
        isTest: true,
        contract: { profile: "google_ads_lead_form" },
        verification: {
          providerCallPerformed: false,
          databaseWritePerformed: false,
          rawPayloadRetained: false,
          liveActivationAuthorized: false,
        },
      },
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith(expect.any(NextRequest), "growth:manage");
  });

  it("rejects cross-origin requests before consulting the authenticated session", async () => {
    authorized();
    const response = await POST(request(
      { profile: "google_ads_lead_form" },
      { origin: "https://example.invalid", "sec-fetch-site": "cross-site" },
    ));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "invalid_origin" });
    expect(mocks.requirePermission).not.toHaveBeenCalled();
  });

  it("copies private response headers onto an authorization failure", async () => {
    mocks.requirePermission.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }),
    });
    const response = await POST(request({ profile: "google_ads_lead_form" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("rejects unsupported profiles and never accepts caller-supplied payloads", async () => {
    authorized();
    const unsupported = await POST(request({ profile: "generic" }));
    expect(unsupported.status).toBe(400);
    await expect(unsupported.json()).resolves.toEqual({ ok: false, error: "unsupported_profile" });

    const response = await POST(request({
      profile: "google_ads_lead_form",
      payload: { name: "This must never be normalized by the lab" },
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
  });

  it("bounds JSON before parsing and rejects non-JSON bodies", async () => {
    authorized();
    const oversized = await POST(request({
      profile: "google_ads_lead_form",
      padding: "x".repeat(700),
    }));
    expect(oversized.status).toBe(413);
    await expect(oversized.json()).resolves.toEqual({ ok: false, error: "payload_too_large" });

    const wrongType = await POST(request(
      "profile=google_ads_lead_form",
      { "content-type": "application/x-www-form-urlencoded" },
    ));
    expect(wrongType.status).toBe(415);
    await expect(wrongType.json()).resolves.toEqual({ ok: false, error: "unsupported_media_type" });
  });
});
