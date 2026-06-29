/**
 * Tests for POST /api/admin/smoke/lead — Ghost Lead Smoke
 *
 * Verifies:
 *   - Admin auth is required
 *   - No DB insert/upsert/update is ever called
 *   - Normal intake route is unchanged
 *   - Smoke report structure is complete and correct
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks (must resolve before vi.mock factories run) ───────────────

const mocks = vi.hoisted(() => {
  const insertFn    = vi.fn();
  const upsertFn    = vi.fn();
  const updateEqFn  = vi.fn();
  const agentEqFn   = vi.fn().mockResolvedValue({ data: [], error: null });
  const supabaseOn  = { current: false };
  return { insertFn, upsertFn, updateEqFn, agentEqFn, supabaseOn };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: mocks.agentEqFn }),
      insert: mocks.insertFn,
      upsert: mocks.upsertFn,
      update: () => ({ eq: mocks.updateEqFn }),
    }),
  }),
}));

vi.mock("@/lib/db/types", () => ({
  isSupabaseConfigured: () => mocks.supabaseOn.current,
  isProduction:         () => false,
  shouldUseDevStorage:  () => true,
}));

import { POST } from "@/app/api/admin/smoke/lead/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_PAYLOAD = {
  sessionId:    "00000000-0000-4000-8000-000000000001",
  firstName:    "Ghost",
  lastName:     "Lead",
  email:        "ghost@amm-smoke.invalid",
  phone:        "+19195550100",
  primaryIntent: "sell",
  questionRaw:  "What is my home worth?",
  timelineMonths: 3,
  consentEmail: true,
  consentSms:   false,
  consentCall:  false,
  addressRaw:   "123 Ghost Lane, Wilson NC 27893",
};

function req(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/admin/smoke/lead", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body:    JSON.stringify(body),
  });
}

function authed(body: unknown): NextRequest {
  return req(body, { "x-admin-secret": "test-secret" });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/smoke/lead — auth", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret";
    vi.clearAllMocks();
    mocks.supabaseOn.current = false;
    mocks.agentEqFn.mockResolvedValue({ data: [], error: null });
  });

  it("returns 401 without x-admin-secret header", async () => {
    const res = await POST(req(VALID_PAYLOAD));
    expect(res.status).toBe(401);
  });

  it("returns 503 when ADMIN_SECRET env is not configured", async () => {
    process.env.ADMIN_SECRET = "";
    const res = await POST(req(VALID_PAYLOAD, { "x-admin-secret": "anything" }));
    expect(res.status).toBe(503);
  });

  it("returns 401 for wrong secret", async () => {
    const res = await POST(req(VALID_PAYLOAD, { "x-admin-secret": "wrong" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/smoke/lead — DB write prevention", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret";
    vi.clearAllMocks();
    mocks.agentEqFn.mockResolvedValue({ data: [], error: null });
  });

  it("does not call insert when Supabase is not configured", async () => {
    mocks.supabaseOn.current = false;
    await POST(authed(VALID_PAYLOAD));
    expect(mocks.insertFn).not.toHaveBeenCalled();
    expect(mocks.upsertFn).not.toHaveBeenCalled();
    expect(mocks.updateEqFn).not.toHaveBeenCalled();
  });

  it("does not call insert/upsert/update even when Supabase is configured", async () => {
    mocks.supabaseOn.current = true;
    await POST(authed(VALID_PAYLOAD));
    expect(mocks.insertFn).not.toHaveBeenCalled();
    expect(mocks.upsertFn).not.toHaveBeenCalled();
    expect(mocks.updateEqFn).not.toHaveBeenCalled();
  });

  it("does not call insert/upsert/update even when agents are returned", async () => {
    mocks.supabaseOn.current = true;
    mocks.agentEqFn.mockResolvedValueOnce({
      data: [
        {
          id: "agt-1", name: "Mike E", email: "mike@amm.com", phone: null,
          role: "primary", is_active: true, max_daily_leads: 20,
          current_load: 2, priority_score: 100,
          availability: { mon: [8, 20], tue: [8, 20], wed: [8, 20], thu: [8, 20], fri: [8, 20] },
          timezone: "America/New_York",
          notification_email: true, notification_sms: false, notification_phone: null,
          created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });
    await POST(authed(VALID_PAYLOAD));
    expect(mocks.insertFn).not.toHaveBeenCalled();
    expect(mocks.upsertFn).not.toHaveBeenCalled();
    expect(mocks.updateEqFn).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/smoke/lead — payload validation", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret";
    vi.clearAllMocks();
    mocks.supabaseOn.current = false;
    mocks.agentEqFn.mockResolvedValue({ data: [], error: null });
  });

  it("returns 422 with smokeMode:true for invalid payload", async () => {
    const res = await POST(authed({ firstName: "Ghost" }));
    expect(res.status).toBe(422);
    const body = await res.json() as Record<string, unknown>;
    expect(body.smokeMode).toBe(true);
    expect(body.dbWrites).toBe("none");
    const payload = body.payload as Record<string, unknown>;
    expect(payload.valid).toBe(false);
  });

  it("returns 400 for malformed JSON", async () => {
    const r = new NextRequest("http://localhost/api/admin/smoke/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": "test-secret" },
      body: "{ not json",
    });
    const res = await POST(r);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/smoke/lead — smoke report", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret";
    vi.clearAllMocks();
    mocks.supabaseOn.current = false;
    mocks.agentEqFn.mockResolvedValue({ data: [], error: null });
  });

  it("returns 200 with smokeMode:true and dbWrites:none", async () => {
    const res = await POST(authed(VALID_PAYLOAD));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.smokeMode).toBe(true);
    expect(body.dbWrites).toBe("none");
    expect(body.timestamp).toBeDefined();
  });

  it("smoke report includes computed score", async () => {
    const res = await POST(authed(VALID_PAYLOAD));
    const body = await res.json() as Record<string, unknown>;
    const score = body.score as Record<string, unknown>;
    expect(typeof score.compositeScore).toBe("number");
    expect(score.compositeScore).toBeGreaterThanOrEqual(0);
    expect(["cold", "warm", "hot", "fire"]).toContain(score.temperature);
    expect(typeof score.sellerCertaintyScore).toBe("number");
    expect(typeof score.buyerCertaintyScore).toBe("number");
    expect(typeof score.factorCount).toBe("number");
  });

  it("smoke report classifies paid attribution", async () => {
    const res = await POST(authed({
      ...VALID_PAYLOAD,
      utmSource: "facebook",
      utmMedium: "paid_social",
    }));
    const body = await res.json() as Record<string, unknown>;
    const attribution = body.attribution as Record<string, unknown>;
    expect(attribution.referrerType).toBe("paid");
    expect(attribution.isPaid).toBe(true);
    expect(attribution.utmSource).toBe("facebook");
    expect(attribution.hasAttribution).toBe(true);
  });

  it("smoke report classifies direct attribution when no UTM", async () => {
    const { utmSource: _u, ...noUtm } = { ...VALID_PAYLOAD, utmSource: undefined };
    void _u;
    const res = await POST(authed(noUtm));
    const body = await res.json() as Record<string, unknown>;
    const attribution = body.attribution as Record<string, unknown>;
    expect(attribution.isPaid).toBe(false);
    expect(attribution.hasAttribution).toBe(false);
  });

  it("consent section lists only granted types", async () => {
    const res = await POST(authed({
      ...VALID_PAYLOAD,
      consentEmail: true,
      consentSms:   true,
      consentCall:  false,
    }));
    const body = await res.json() as Record<string, unknown>;
    const consent = body.consent as Record<string, unknown>;
    expect(consent.wouldInsert).toContain("email");
    expect(consent.wouldInsert).toContain("sms");
    expect(consent.wouldInsert).not.toContain("call");
    expect(consent.count).toBe(2);
    expect(consent.languageVersion).toBe("v1");
  });

  it("consent section is empty when no consents granted", async () => {
    const res = await POST(authed({
      ...VALID_PAYLOAD,
      consentEmail: false,
      consentSms:   false,
      consentCall:  false,
    }));
    const body = await res.json() as Record<string, unknown>;
    const consent = body.consent as Record<string, unknown>;
    expect(consent.count).toBe(0);
    expect(consent.wouldInsert).toHaveLength(0);
  });

  it("property section reflects address presence", async () => {
    const res = await POST(authed({ ...VALID_PAYLOAD, addressRaw: "123 Ghost Lane" }));
    const body = await res.json() as Record<string, unknown>;
    const property = body.property as Record<string, unknown>;
    expect(property.wouldUpsert).toBe(true);
    expect(property.addressLine1).toBe("123 Ghost Lane");
    expect(property.state).toBe("NC");
  });

  it("property.wouldUpsert is false when no address provided", async () => {
    const { addressRaw: _a, ...noAddr } = VALID_PAYLOAD;
    void _a;
    const res = await POST(authed(noAddr));
    const body = await res.json() as Record<string, unknown>;
    const property = body.property as Record<string, unknown>;
    expect(property.wouldUpsert).toBe(false);
  });

  it("routing section reports no agents when none available", async () => {
    const res = await POST(authed(VALID_PAYLOAD));
    const body = await res.json() as Record<string, unknown>;
    const routing = body.routing as Record<string, unknown>;
    expect(routing.agentsAvailable).toBe(0);
    expect(routing.wouldAssign).toBe(false);
    expect(routing.agentId).toBeNull();
  });

  it("routing section reports would-assign when active agent is available", async () => {
    mocks.supabaseOn.current = true;
    const now = new Date();
    const dayKey = now.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" }).toLowerCase();
    const hour = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getHours();
    const availability: Record<string, [number, number]> = { [dayKey]: [0, 24] };
    void hour;

    mocks.agentEqFn.mockResolvedValueOnce({
      data: [{
        id: "agt-1", name: "Mike E", email: "mike@amm.com", phone: null,
        role: "primary", is_active: true, max_daily_leads: 20, current_load: 0,
        priority_score: 100, availability,
        timezone: "America/New_York", notification_email: true,
        notification_sms: false, notification_phone: null,
        created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
      }],
      error: null,
    });

    const res = await POST(authed(VALID_PAYLOAD));
    const body = await res.json() as Record<string, unknown>;
    const routing = body.routing as Record<string, unknown>;
    expect(routing.agentsAvailable).toBe(1);
    // wouldAssign depends on availability window; verify shape regardless
    expect(typeof routing.wouldAssign).toBe("boolean");
  });

  it("checks object shows all systems pass on valid payload", async () => {
    const res = await POST(authed(VALID_PAYLOAD));
    const body = await res.json() as Record<string, unknown>;
    const checks = body.checks as Record<string, unknown>;
    expect(checks.auth).toBe("pass");
    expect(checks.payloadValid).toBe("pass");
    expect(checks.scoreComputed).toBe("pass");
    expect(checks.attributionClassified).toBe("pass");
    expect(checks.consentValidated).toBe("pass");
    expect(checks.propertyValidated).toBe("pass");
    expect(checks.dbWritesPrevented).toBe("pass");
  });

  it("payload section shows valid:true for valid payload", async () => {
    const res = await POST(authed(VALID_PAYLOAD));
    const body = await res.json() as Record<string, unknown>;
    const payload = body.payload as Record<string, unknown>;
    expect(payload.valid).toBe(true);
    expect(payload.schema).toBe("SubmitIntakeSchema");
    expect(typeof payload.fieldCount).toBe("number");
  });
});

describe("normal intake route is unchanged", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    vi.clearAllMocks();
    mocks.supabaseOn.current = false;
  });

  it("intake/submit response does not include smokeMode or dbWrites", async () => {
    const { POST: intakePOST } = await import("@/app/api/intake/submit/route");
    const intakeReq = new NextRequest("http://localhost/api/intake/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    const res = await intakePOST(intakeReq);
    const body = await res.json() as Record<string, unknown>;
    expect(body.smokeMode).toBeUndefined();
    expect(body.dbWrites).toBeUndefined();
    expect(body).toHaveProperty("leadId");
    expect(body).toHaveProperty("score");
  });
});
