import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/leads/route";
import { PUBLIC_LEAD_SAVE_ERROR } from "../../app/lib/publicLeadErrors";
import { signWordPressBridgeBody } from "../../app/lib/wordpressBridgeSignature";

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
  "DATABASE_URL",
  "ALLOW_LEGACY_SUPABASE_FALLBACK",
  "RATE_LIMIT_HASH_SECRET",
  "RATE_LIMIT_EMERGENCY_MEMORY",
  "WORDPRESS_BRIDGE_SECRET",
] as const;
const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function request(body: Record<string, unknown>, headers: HeadersInit = {}) {
  const idempotencyKey = typeof body.idempotency_key === "string"
    ? body.idempotency_key
    : typeof body.request_fingerprint === "string"
      ? body.request_fingerprint
      : SESSION_ID;
  const leadSourceSurface = typeof body.lead_source_surface === "string"
    ? body.lead_source_surface
    : "home_value_page";
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.askmagicmike.com",
      "Idempotency-Key": idempotencyKey,
      ...headers,
    },
    body: JSON.stringify({
      ...body,
      lead_source_surface: leadSourceSurface,
      idempotency_key: idempotencyKey,
    }),
  });
}

function signedWordPressRequest(body: Record<string, unknown>, entryId = "1901") {
  const rawBody = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1_000));
  const secret = "synthetic-wordpress-bridge-secret-at-least-32-characters";
  process.env.WORDPRESS_BRIDGE_SECRET = secret;
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `gf:7:${entryId}`,
      "X-AMM-WP-Bridge": "v1",
      "X-AMM-WP-Timestamp": timestamp,
      "X-AMM-WP-Entry": entryId,
      "X-AMM-WP-Signature": `v1=${signWordPressBridgeBody(secret, timestamp, entryId, rawBody)}`,
    },
    body: rawBody,
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
  vi.useRealTimers();
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
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://www.askmagicmike.com",
        },
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
  });

  it("stream-bounds a chunked lead body before parsing or persistence", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(new Request("http://localhost/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.askmagicmike.com",
      },
      body: JSON.stringify({ question: "é".repeat(33_000) }),
    }));
    expect(response.status).toBe(413);
    expect(response.headers.get("X-AMM-Correlation-Id")).toBeTruthy();
    expect(await response.json()).toMatchObject({ error: "Submission is too large." });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a correlation ID when a declared lead body is oversized", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(new Request("http://localhost/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "65537",
        Origin: "https://www.askmagicmike.com",
      },
      body: "{}",
    }));
    expect(response.status).toBe(413);
    expect(response.headers.get("X-AMM-Correlation-Id")).toBeTruthy();
    expect(await response.json()).toMatchObject({ error: "Submission is too large." });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects unsigned origin-less requests and foreign browser origins", async () => {
    for (const origin of [null, "https://attacker.example"]) {
      const headers = new Headers({
        "Content-Type": "application/json",
        "Idempotency-Key": SESSION_ID,
      });
      if (origin) headers.set("Origin", origin);
      const response = await POST(new Request("http://localhost/api/leads", {
        method: "POST",
        headers,
        body: JSON.stringify({
          funnel_type: "home_value",
          lead_source_surface: "home_value_page",
          address: "1 Synthetic Origin Way",
          email: "origin@example.test",
          idempotency_key: SESSION_ID,
        }),
      }));
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({ code: "origin_not_approved" });
      expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    }
  });

  it("requires JSON and a plain-object payload", async () => {
    const unsupported = await POST(new Request("http://localhost/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Origin: "https://www.askmagicmike.com",
      },
      body: "not-json",
    }));
    expect(unsupported.status).toBe(415);
    await expect(unsupported.json()).resolves.toMatchObject({ code: "unsupported_media_type" });

    const arrayPayload = await POST(new Request("http://localhost/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.askmagicmike.com",
      },
      body: "[]",
    }));
    expect(arrayPayload.status).toBe(400);
    await expect(arrayPayload.json()).resolves.toMatchObject({ code: "invalid_payload" });
  });

  it("requires one bounded matching idempotency key", async () => {
    const body = {
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "2 Synthetic Idempotency Way",
      email: "idempotency@example.test",
    };
    const missing = await POST(new Request("http://localhost/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.askmagicmike.com",
      },
      body: JSON.stringify(body),
    }));
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({ code: "idempotency_key_required" });

    const conflict = await POST(request(
      { ...body, idempotency_key: SESSION_ID },
      { "Idempotency-Key": "44444444-4444-4444-8444-444444444444" },
    ));
    expect(conflict.status).toBe(400);
    await expect(conflict.json()).resolves.toMatchObject({ code: "idempotency_key_conflict" });

    const invalid = await POST(request(
      { ...body, idempotency_key: "invalid key with spaces" },
    ));
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({ code: "idempotency_key_invalid" });
  });

  it.each([
    [{ funnel_type: "mystery" }, "invalid_funnel_type"],
    [{ lead_source_surface: "unknown_surface" }, "invalid_lead_source_surface"],
    [{ lead_type: "mystery" }, "invalid_lead_type"],
    [{ score: 100 }, "protected_field_rejected"],
    [{ assigned_agent_id: LEAD_ID }, "protected_field_rejected"],
    [{ consent: "true" }, "invalid_field_type"],
    [{ attribution: [] }, "invalid_attribution"],
  ])("rejects malformed or privileged public input %o", async (override, code) => {
    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "3 Synthetic Boundary Road",
      email: "boundary@example.test",
      ...override,
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code });
  });

  it("bounds normalized lead and attribution fields before persistence", async () => {
    for (const override of [
      { target_geography: "x".repeat(501) },
      { attribution: { source: "x".repeat(121) } },
      { attribution: { first_touch: { campaign: "x".repeat(241) } } },
    ]) {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const response = await POST(request({
        funnel_type: "buyer",
        lead_source_surface: "buyer_page",
        email: "bounded@example.test",
        ...override,
      }));
      expect(response.status).toBe(400);
      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    }
  });

  it("does not trust a standalone public is_test boolean", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "4 Synthetic Test Marker Way",
      email: "marker@example.test",
      is_test: true,
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "invalid_test_marker" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    [{ funnel_type: "home_value", email: "a@example.test", phone: "2525550100" }, "Address is required."],
    [{ funnel_type: "home_value", address: "1 Synthetic St" }, "Email or phone is required"],
    [{ funnel_type: "home_value", address: "1 Synthetic St", email: "qa@example", phone: "2525550100" }, "valid email"],
    [{ funnel_type: "home_value", address: "1 Synthetic St", phone: "5550100" }, "valid phone"],
    [{ funnel_type: "seller", address: "1 Synthetic St" }, "Property address and phone are required"],
    [{ funnel_type: "chat" }, "Question is required"],
    [{ funnel_type: "chat", question: "Synthetic question" }, "Email or phone is required for a chat follow-up"],
    [{ funnel_type: "chat", question: "Synthetic question", email: "qa@example.test" }, "Consent is required for a chat follow-up"],
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
    const mutableEnv = process.env as Record<string, string | undefined>;
    const originalNodeEnv = mutableEnv.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";
    process.env.DATABASE_URL = "postgresql://synthetic:synthetic@ep-synthetic.us-east-1.aws.neon.tech/neondb?sslmode=require";
    process.env.RATE_LIMIT_HASH_SECRET = "synthetic-rate-limit-hash-secret-at-least-32-characters";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const response = await POST(request({
        funnel_type: "seller",
        lead_source_surface: "seller_page",
        address: "2 Synthetic Ave",
        phone: "2525550101",
      }));
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({ code: "preview_data_disabled" });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
      else mutableEnv.NODE_ENV = originalNodeEnv;
    }
  });

  it("fails closed before parsing or persistence when Production durable limiting is unavailable", async () => {
    const mutableEnv = process.env as Record<string, string | undefined>;
    const originalNodeEnv = mutableEnv.NODE_ENV;
    const fetchSpy = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchSpy);
    mutableEnv.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    delete process.env.DATABASE_URL;
    delete process.env.RATE_LIMIT_HASH_SECRET;
    delete process.env.RATE_LIMIT_EMERGENCY_MEMORY;

    try {
      const response = await POST(request({
        funnel_type: "home_value",
        lead_source_surface: "home_value_page",
        address: "4 Synthetic Durable Way",
        email: "durable-guard@example.test",
        phone: "2525550104",
      }));

      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: "Lead intake is temporarily unavailable.",
      });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
    } finally {
      if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
      else mutableEnv.NODE_ENV = originalNodeEnv;
    }
  });
});

describe("POST /api/leads atomic lifecycle command", () => {
  it.each([
    [{ email: "email-only@example.test" }, "email"],
    [{ phone: "2525550110" }, "phone"],
  ])("durably accepts a home-value request with %s as its only contact method", async (contact, expectedMethod) => {
    const { calls } = installRpc();
    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "88 Synthetic Contact Lane",
      name: "INTERNAL QA DO NOT CONTACT",
      ...contact,
    }));

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/rest/v1/rpc/capture_public_lead_v2");
    const lead = calls[0].body.p_lead as Record<string, unknown>;
    expect(expectedMethod === "email" ? lead.normalized_email : lead.normalized_phone).toBeTruthy();
  });

  it("derives one stable UUID session from a non-UUID idempotency key", async () => {
    const { calls } = installRpc();
    const payload = {
      funnel_type: "home_value",
      lead_source_surface: "ourtownproperties",
      address: "999 Synthetic Replay Way",
      email: "stable-replay@example.test",
      phone: "2525550111",
      idempotency_key: "gf:3:1549",
    };

    expect((await POST(request(payload))).status).toBe(200);
    expect((await POST(request(payload))).status).toBe(200);

    const firstSessionId = String(calls[0].body.p_session && (calls[0].body.p_session as Record<string, unknown>).id);
    const secondSessionId = String(calls[1].body.p_session && (calls[1].body.p_session as Record<string, unknown>).id);
    expect(firstSessionId).toBe(secondSessionId);
    expect(firstSessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

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
    expect(calls[0].url).toContain("/rest/v1/rpc/capture_public_lead_v2");
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
      p_internal_notification: {
        template_version: "lead_alert_email_v3",
      },
    });
    expect(await response.json()).toMatchObject({
      lead_id: LEAD_ID,
      session_id: SESSION_ID,
      duplicate_of_lead_id: null,
    });
  });

  it("preserves exact consent evidence only from a verified WordPress bridge", async () => {
    const { calls } = installRpc();
    const response = await POST(signedWordPressRequest({
      funnel_type: "buyer",
      lead_type: "buyer",
      lead_source_surface: "ourtownproperties",
      name: "INTERNAL QA DO NOT CONTACT",
      email: "form7-consent@example.test",
      phone: "2525550199",
      question: "INTERNAL QA DO NOT CONTACT property alert contract",
      idempotency_key: "gf:7:1901",
      consent: true,
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_timestamp: "2026-09-01T19:58:24Z",
      consent_language_version: "otp_form7_property_alert_email_v1",
      consent_language_text: "EMAIL: Exact approved property-alert language.",
      consent_source: "gravity_forms_7",
      attribution: {
        source: "ourtownproperties",
        medium: "website_form",
        content: "gravity_form_7",
      },
    }));

    expect(response.status).toBe(200);
    expect(calls[0].body.p_lead).toMatchObject({
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_timestamp: "2026-09-01T19:58:24.000Z",
      consent_language_version: "otp_form7_property_alert_email_v1",
      consent_language_text: "EMAIL: Exact approved property-alert language.",
      consent_source: "gravity_forms_7",
      is_test: true,
      communication_suppressed: true,
    });
  });

  it("stores a signed bridge lead but denies communication when source consent time is missing", async () => {
    const { calls } = installRpc();
    const response = await POST(signedWordPressRequest({
      funnel_type: "buyer",
      lead_type: "buyer",
      lead_source_surface: "ourtownproperties",
      name: "INTERNAL QA DO NOT CONTACT",
      email: "form7-missing-time@example.test",
      question: "INTERNAL QA DO NOT CONTACT missing source consent time",
      idempotency_key: "gf:7:1901",
      consent_email: true,
      consent_language_version: "otp_form7_property_alert_email_v1",
      consent_language_text: "EMAIL: Exact approved property-alert language.",
      consent_source: "gravity_forms_7",
    }));

    expect(response.status).toBe(200);
    expect(calls[0].body.p_lead).toMatchObject({
      consent_email: false,
      consent_call: false,
      consent_sms: false,
      consent_language_version: "wordpress_gravity_forms_unverified_v1",
    });
  });

  it.each([
    {
      label: "entry id",
      idempotency_key: "gf:7:1902",
      consent_source: "gravity_forms_7",
      expectedCode: "idempotency_key_conflict",
    },
    {
      label: "form consent source",
      idempotency_key: "gf:7:1901",
      consent_source: "gravity_forms_3",
      expectedCode: "wordpress_bridge_identity_mismatch",
    },
  ])("rejects a signed WordPress bridge payload with a mismatched $label before persistence", async ({
    idempotency_key,
    consent_source,
    expectedCode,
  }) => {
    const { mock } = installRpc();
    const response = await POST(signedWordPressRequest({
      funnel_type: "buyer",
      lead_type: "buyer",
      lead_source_surface: "ourtownproperties",
      name: "INTERNAL QA DO NOT CONTACT",
      email: "form7-mismatch@example.test",
      question: "INTERNAL QA DO NOT CONTACT identity mismatch",
      idempotency_key,
      consent_email: true,
      consent_language_version: "otp_form7_property_alert_email_v1",
      consent_language_text: "EMAIL: Exact approved property-alert language.",
      consent_source,
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: expectedCode,
    });
    expect(mock).not.toHaveBeenCalled();
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

    const chat = installRpc();
    const chatResponse = await POST(request({
      funnel_type: "chat",
      lead_source_surface: "ask_page",
      question: "What is a synthetic inspection?",
      email: "chat-follow-up@example.test",
      phone: "2525550112",
      consent: true,
      consent_email: true,
      consent_call: true,
      consent_sms: false,
      widget_session_id: SESSION_ID,
    }));
    expect(chatResponse.status).toBe(200);
    expect(chat.calls[0].body.p_lead).toMatchObject({
      consent_email: true,
      consent_call: true,
      consent_sms: false,
      consent_language_version: "amm_contact_v2",
    });
    expect(await chatResponse.json()).toHaveProperty("message");
  });

  it("does not let standalone public channel booleans widen communication consent", async () => {
    const { calls } = installRpc();
    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "210 Synthetic Consent Boundary",
      email: "consent-boundary@example.test",
      phone: "2525550119",
      consent: false,
      consent_email: true,
      consent_call: true,
    }));

    expect(response.status).toBe(200);
    expect(calls[0].body.p_lead).toMatchObject({
      consent_email: false,
      consent_call: false,
      consent_sms: false,
    });
  });

  it("keeps an omitted seller timeline unknown instead of manufacturing urgency", async () => {
    const { calls } = installRpc();
    const response = await POST(request({
      funnel_type: "seller",
      lead_source_surface: "seller_page",
      address: "220 Synthetic Truth Lane",
      phone: "2525550120",
      widget_session_id: SESSION_ID,
    }));

    expect(response.status).toBe(200);
    const lead = calls[0].body.p_lead as Record<string, unknown>;
    expect(lead.timeline_months).toBeNull();
    expect(lead.financing).toBeNull();
    expect(lead.preapproval).toBeNull();
    expect(lead.lead_grade).toBe("B");
    expect(lead.score).toBe(45);
    expect(lead.score_factors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "timeline_unknown",
        points: 0,
      }),
    ]));
  });

  it.each(["Not sure yet", "Unknown", "Prefer not to say"])(
    "keeps an explicit uncertain timeline unknown: %s",
    async (timeline) => {
      const { calls } = installRpc();
      const response = await POST(request({
        funnel_type: "buyer",
        lead_source_surface: "buyer_page",
        phone: "2525550120",
        timeline,
        widget_session_id: SESSION_ID,
      }));

      expect(response.status).toBe(200);
      const lead = calls[0].body.p_lead as Record<string, unknown>;
      expect(lead.timeline_months).toBeNull();
      expect(lead.score_factors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "timeline_unknown",
          points: 0,
        }),
      ]));
    },
  );

  it("retains an explicit planning horizon without manufacturing urgency", async () => {
    const { calls } = installRpc();
    const response = await POST(request({
      funnel_type: "seller",
      lead_source_surface: "seller_page",
      address: "221 Synthetic Planning Lane",
      phone: "2525550120",
      timeline: "Just planning",
      widget_session_id: SESSION_ID,
    }));

    expect(response.status).toBe(200);
    const lead = calls[0].body.p_lead as Record<string, unknown>;
    expect(lead.timeline_months).toBe(24);
    expect(lead.lead_grade).toBe("B");
    expect(lead.score_factors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "timeline_unknown",
        points: 0,
      }),
    ]));
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

  it("returns replay success without provider side effects", async () => {
    process.env.OPENAI_API_KEY = "synthetic-openai-key";
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    process.env.POSTHOG_API_KEY = "synthetic-posthog-key";
    const { calls } = installRpc(success({ idempotent_replay: true }));

    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "310 Replay Oak Dr",
      email: "repeat-provider@example.test",
      phone: "2525550110",
      widget_session_id: SESSION_ID,
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-AMM-Idempotent-Replay")).toBe("1");
    expect(await response.json()).toMatchObject({
      message: "Your request is stored for review. Mike or the approved team will follow up through the contact path you provided.",
      lead_id: LEAD_ID,
      session_id: SESSION_ID,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/rest/v1/rpc/capture_public_lead_v2");
    expect(calls.some((call) => call.url.includes("api.openai.com"))).toBe(false);
    expect(calls.some((call) => call.url.includes("api.resend.com"))).toBe(false);
    expect(calls.some((call) => call.url.includes("posthog"))).toBe(false);
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

  it("does not call generative or consumer providers from the public lead route", async () => {
    const fetchSpy = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/rest/v1/rpc/capture_public_lead_v2")) {
        return Promise.resolve(jsonResponse(success()));
      }
      return Promise.reject(new Error("unexpected provider call"));
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "610 Synthetic Timeout Ln",
      email: "timeout@example.test",
      phone: "2525550111",
      widget_session_id: SESSION_ID,
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ lead_id: LEAD_ID, session_id: SESSION_ID });
    expect(body).not.toHaveProperty("error");
    expect(JSON.stringify(body)).not.toContain("AbortError");
    expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("api.openai.com"))).toBe(false);
  });

  it("keeps a committed lead successful when an external provider throws", async () => {
    const mutableEnv = process.env as Record<string, string | undefined>;
    const originalNodeEnv = mutableEnv.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    process.env.VERCEL_ENV = "development";
    process.env.ALLOW_LEGACY_SUPABASE_FALLBACK = "true";
    process.env.OPENAI_API_KEY = "synthetic-openai-key";
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchSpy = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/rest/v1/rpc/capture_public_lead_v2")) {
        return jsonResponse(success());
      }
      throw new Error("synthetic provider unavailable");
    });
    vi.stubGlobal("fetch", fetchSpy);

    try {
      const response = await POST(request({
        funnel_type: "home_value",
        lead_source_surface: "home_value_page",
        address: "600 Synthetic Provider Ln",
        email: "provider@example.test",
        phone: "2525550107",
        widget_session_id: SESSION_ID,
      }, { "X-Forwarded-For": "192.0.2.107" }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ lead_id: LEAD_ID });
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
      else mutableEnv.NODE_ENV = originalNodeEnv;
    }
  });

  it("maps unknown domain failures to a sanitized persistence error", async () => {
    const { mock } = installRpc({
      ok: false,
      error: "some_future_failure",
      idempotent_replay: false,
    });
    const response = await POST(request({
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      address: "700 Future Failure Way",
      email: "future@example.test",
      phone: "2525550112",
      widget_session_id: SESSION_ID,
    }));

    expect(response.status).toBe(500);
    expect(response.status).not.toBe(409);
    expect(mock).toHaveBeenCalledTimes(1);
    const body = await response.json();
    expect(body).toMatchObject({ error: PUBLIC_LEAD_SAVE_ERROR });
    expect(body.correlation_id).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toContain("some_future_failure");
  });
});
