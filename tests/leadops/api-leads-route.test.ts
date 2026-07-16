import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/leads/route";
import { PUBLIC_LEAD_SAVE_ERROR } from "../../app/lib/publicLeadErrors";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "22222222-2222-4222-8222-222222222222";
const DUPLICATE_ID = "33333333-3333-4333-8333-333333333333";
const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VERCEL_ENV",
  "DATABASE_ENV",
  "PREVIEW_DATA_MODE",
  "ALLOW_PREVIEW_DB_MUTATION",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "POSTHOG_API_KEY",
  "AGENT_NOTIFICATIONS_ENABLED",
  "LEAD_NOTIFICATION_MODE",
] as const;
const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function request(body: Record<string, unknown>, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function success(overrides: Record<string, unknown> = {}) {
  return {
    lead_id: LEAD_ID,
    session_id: SESSION_ID,
    widget_session_id: SESSION_ID,
    duplicate_of_lead_id: null,
    assignment_status: "assigned",
    idempotent_replay: false,
    ...overrides,
  };
}

function installRpc(result: Record<string, unknown> = success(), status = 200) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const mock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, body });
    return jsonResponse(result, status);
  });
  vi.stubGlobal("fetch", mock);
  return { calls, mock };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-local-key";
  for (const key of ENV_KEYS.slice(2)) delete process.env[key];
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("POST /api/leads validation and truthful persistence", () => {
  it("returns 400 for invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/leads", { method: "POST", body: "{" }),
    );
    expect(response.status).toBe(400);
  });

  it.each([
    [{ funnel_type: "home_value", email: "a@example.test", phone: "2525550100" }, "Address is required."],
    [{ funnel_type: "home_value", address: "1 Synthetic St", phone: "2525550100" }, "Email and phone are required"],
    [{ funnel_type: "seller", address: "1 Synthetic St" }, "Property address and phone are required"],
    [{ funnel_type: "chat" }, "Question is required"],
    [{ funnel_type: "appointment" }, "Email or phone is required"],
  ])("rejects an incomplete payload without persistence calls", async (payload, message) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(request(payload));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain(message);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a truthful 503 when persistence is not configured", async () => {
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_URL");
    Reflect.deleteProperty(process.env, "SUPABASE_SERVICE_ROLE_KEY");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "1 Synthetic St",
      email: "owner@example.test",
      phone: "2525550100",
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: PUBLIC_LEAD_SAVE_ERROR,
      code: "lead_store_not_configured",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("performs zero persistence/provider calls in Preview read-only mode", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(request({
      funnel_type: "seller",
      lead_source_surface: "seller_page",
      address: "2 Synthetic Ave",
      phone: "2525550101",
    }));
    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/leads atomic lifecycle command", () => {
  it("maps a home-value request, qualification, normalized identity, and attribution into one RPC", async () => {
    const { calls } = installRpc();
    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "100 Synthetic Oak Road",
      email: " Owner@Example.Test ",
      phone: "+1 (252) 555-0102",
      timeline: "ASAP",
      widget_session_id: SESSION_ID,
      attribution: {
        source: "synthetic",
        medium: "cpc",
        campaign: "infra-02",
        landing_page: "/home-value",
      },
    }));

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/rest/v1/rpc/capture_public_lead_v1");
    expect(calls[0].body).toMatchObject({
      p_session: {
        id: SESSION_ID,
        utm_source: "synthetic",
        utm_medium: "cpc",
      },
      p_lead: {
        normalized_email: "owner@example.test",
        normalized_phone: "2525550102",
        normalized_property_address: "100 synthetic oak road",
        timeline_months: 0,
        status: "qualified",
        lead_grade: "A",
      },
      p_attribution: {
        utm_source: "synthetic",
        utm_medium: "cpc",
        is_paid: true,
      },
      p_notification_mode: "disabled",
    });
    expect(await response.json()).toMatchObject({
      lead_id: LEAD_ID,
      session_id: SESSION_ID,
      duplicate_of_lead_id: null,
    });
  });

  it("maps seller and chat leads without changing the public response shape", async () => {
    const seller = installRpc();
    const sellerResponse = await POST(request({
      funnel_type: "seller",
      lead_source_surface: "seller_page",
      address: "200 Synthetic Pine St",
      phone: "2525550103",
      condition: "Needs work",
      timeline: "30-60 days",
      widget_session_id: SESSION_ID,
    }));
    expect(sellerResponse.status).toBe(200);
    expect(seller.calls[0].body.p_lead).toMatchObject({
      lead_type: "seller",
      primary_intent: "sell",
      timeline_months: 3,
    });

    installRpc();
    const chatResponse = await POST(request({
      funnel_type: "chat",
      lead_source_surface: "ask_page",
      question: "What is a synthetic inspection?",
      widget_session_id: SESSION_ID,
    }));
    expect(chatResponse.status).toBe(200);
    expect(await chatResponse.json()).toHaveProperty("message");
  });

  it("returns the canonical lead on an idempotent replay", async () => {
    installRpc(success({ idempotent_replay: true }));
    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "300 Synthetic Cedar Dr",
      email: "repeat@example.test",
      phone: "2525550104",
      widget_session_id: SESSION_ID,
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      lead_id: LEAD_ID,
      session_id: SESSION_ID,
    });
  });

  it("returns duplicate identity linkage supplied by the transaction", async () => {
    installRpc(success({
      duplicate_of_lead_id: DUPLICATE_ID,
      assignment_status: "duplicate",
    }));
    const response = await POST(request({
      funnel_type: "seller",
      lead_source_surface: "seller_page",
      address: "400 Shared Address Way",
      email: "duplicate@example.test",
      phone: "2525550105",
      widget_session_id: SESSION_ID,
    }));
    expect(await response.json()).toMatchObject({
      duplicate_of_lead_id: DUPLICATE_ID,
    });
  });

  it.each(["identity_conflict", "idempotency_conflict"] as const)(
    "maps %s to HTTP 409 without exposing an existing lead id",
    async (code) => {
      installRpc({
        ok: false,
        error: code,
        session_id: SESSION_ID,
        idempotent_replay: false,
      });
      const response = await POST(request({
        funnel_type: "home_value",
        lead_source_surface: "home_value_page",
        address: "450 Conflict Way",
        email: "conflict@example.test",
        phone: "2525550199",
        widget_session_id: SESSION_ID,
      }));
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toMatchObject({ code });
      expect(body).not.toHaveProperty("lead_id");
    },
  );

  it("does not retry-storm when the atomic persistence call fails", async () => {
    const { mock } = installRpc({ error: "synthetic" }, 500);
    const response = await POST(request({
      funnel_type: "seller",
      lead_source_surface: "seller_page",
      address: "500 Synthetic Failure Ct",
      phone: "2525550106",
      widget_session_id: SESSION_ID,
    }));
    expect(response.status).toBe(500);
    expect(mock).toHaveBeenCalledTimes(1);
    expect((await response.json()).error).toBe(PUBLIC_LEAD_SAVE_ERROR);
  });

  it("keeps a committed lead successful when an external provider throws", async () => {
    process.env.OPENAI_API_KEY = "synthetic-openai-key";
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    const fetchSpy = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/rest/v1/rpc/capture_public_lead_v1")) {
        return jsonResponse(success());
      }
      throw new Error("synthetic provider unavailable");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "600 Synthetic Provider Ln",
      email: "provider@example.test",
      phone: "2525550107",
      widget_session_id: SESSION_ID,
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ lead_id: LEAD_ID });
  });
});
