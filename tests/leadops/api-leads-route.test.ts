/**
 * HTTP-level tests for the Black Diamond /api/leads route handler.
 *
 * All external services (Supabase, OpenAI, PostHog, Resend) are absent
 * (no env vars set), so calls gracefully no-op and the route still returns
 * the correct HTTP shape.  One fetch-mock section validates that full
 * attribution fields reach the Supabase insert payload.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { POST } from "../../app/api/leads/route";
import { PUBLIC_LEAD_SAVE_ERROR } from "../../app/lib/publicLeadErrors";

const ORIGINAL_FETCH = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": "vitest-browser",
      referer: "https://www.ourtownproperties.com/ask-mike/",
    },
    body: JSON.stringify(body),
  });
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

function missingColumnResponse(column: string, table = "leads") {
  return {
    ok: false,
    status: 400,
    statusText: "Bad Request",
    text: async () =>
      JSON.stringify({
        code: "PGRST204",
        details: null,
        hint: null,
        message: "Could not find the '" + column + "' column of '" + table + "' in the schema cache",
      }),
  } as Response;
}

function successInsertResponse(status = 201) {
  return { ok: true, status: 201, statusText: "Created", text: async () => "" } as Response;
}

function configureSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";
}

// ─── Validation: home_value ────────────────────────────────────────────────────

describe("POST /api/leads — home_value validation", () => {
  it("400 when address missing", async () => {
    const res = await POST(makeRequest({ funnel_type: "home_value", email: "a@b.com", phone: "2525551212" }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/address/i);
  });

  it("400 when email missing", async () => {
    const res = await POST(makeRequest({ funnel_type: "home_value", address: "123 Nash St", phone: "2525551212" }));
    expect(res.status).toBe(400);
  });

  it("400 when phone missing", async () => {
    const res = await POST(makeRequest({ funnel_type: "home_value", address: "123 Nash St", email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("200 when all required fields present", async () => {
    const res = await POST(makeRequest({
      funnel_type: "home_value",
      address: "123 Nash St NW, Wilson NC",
      email: "jane@example.com",
      phone: "2525551212",
    }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toMatch(/mike/i);
  });
});

// ─── Validation: seller ────────────────────────────────────────────────────────

describe("POST /api/leads — seller validation", () => {
  it("400 when address missing", async () => {
    const res = await POST(makeRequest({ funnel_type: "seller", phone: "2525551212" }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/address/i);
  });

  it("400 when phone missing", async () => {
    const res = await POST(makeRequest({ funnel_type: "seller", address: "123 Nash St" }));
    expect(res.status).toBe(400);
  });

  it("200 when address + phone present", async () => {
    const res = await POST(makeRequest({ funnel_type: "seller", address: "123 Nash St", phone: "2525551212" }));
    expect(res.status).toBe(200);
  });
});

// ─── Validation: chat ─────────────────────────────────────────────────────────

describe("POST /api/leads — chat validation", () => {
  it("400 when question missing", async () => {
    const res = await POST(makeRequest({ funnel_type: "chat" }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/question/i);
  });

  it("200 when question present", async () => {
    const res = await POST(makeRequest({ funnel_type: "chat", question: "What is the Wilson market like?" }));
    expect(res.status).toBe(200);
  });
});

// ─── Validation: appointment (new hardening) ──────────────────────────────────

describe("POST /api/leads — appointment validation", () => {
  it("400 when both email and phone missing", async () => {
    const res = await POST(makeRequest({ funnel_type: "appointment" }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/email or phone/i);
  });

  it("200 when email provided (no phone)", async () => {
    const res = await POST(makeRequest({ funnel_type: "appointment", email: "jane@example.com" }));
    expect(res.status).toBe(200);
  });

  it("200 when phone provided (no email)", async () => {
    const res = await POST(makeRequest({ funnel_type: "appointment", phone: "2525551212" }));
    expect(res.status).toBe(200);
  });

  it("200 when both email and phone provided", async () => {
    const res = await POST(makeRequest({ funnel_type: "appointment", email: "jane@example.com", phone: "2525551212" }));
    expect(res.status).toBe(200);
  });
});

// ─── Validation: widget ────────────────────────────────────────────────────────

describe("POST /api/leads — widget validation", () => {
  it("400 when address missing", async () => {
    const res = await POST(makeRequest({ funnel_type: "widget", email: "a@b.com", phone: "2525551212" }));
    expect(res.status).toBe(400);
  });

  it("200 when all required fields present", async () => {
    const res = await POST(makeRequest({
      funnel_type: "widget",
      address: "123 Nash St NW",
      email: "jane@example.com",
      phone: "2525551212",
      attribution: { source: "widget", medium: "embed" },
    }));
    expect(res.status).toBe(200);
  });
});

// ─── Malformed input ──────────────────────────────────────────────────────────

describe("POST /api/leads — malformed input", () => {
  it("400 when body is not valid JSON", async () => {
    const res = await POST(new Request("http://localhost/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json {{{",
    }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/json/i);
  });
});

// ─── Attribution forwarded to Supabase ────────────────────────────────────────

describe("POST /api/leads — attribution forwarded to Supabase insert", () => {
  it("creates a session first and maps attribution to the production lead row", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";

    const captured: Array<{ table: string; body: Record<string, unknown>; url: string }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("supabase")) {
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push({
          table: urlStr.includes("/rest/v1/sessions") ? "sessions" : "leads",
          body,
          url: urlStr,
        });
        return successInsertResponse();
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    await POST(makeRequest({
      funnel_type: "home_value",
      address: "123 Nash St NW, Wilson NC",
      email: "jane@example.com",
      phone: "2525551212",
      widget_session_id: "11111111-1111-4111-8111-111111111111",
      attribution: {
        source: "facebook",
        medium: "paid_social",
        campaign: "seller_q3_wilson",
        gclid: undefined,
        embed_host: "ourtownproperties.com",
        placement: "sitewide-floating",
      },
    }));

    expect(captured.map((call) => call.table)).toEqual(["sessions", "leads"]);
    const session = captured[0].body;
    const row = captured[1].body;
    expect(session.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(session.utm_source).toBe("facebook");
    expect(session.utm_medium).toBe("paid_social");
    expect(session.utm_campaign).toBe("seller_q3_wilson");
    expect(session.initial_address).toBe("123 Nash St NW, Wilson NC");
    expect(row.session_id).toBe(session.id);
    expect(row.source).toBe("facebook");
    expect(row.source_detail).toBe("home_value_page / paid_social / seller_q3_wilson / sitewide-floating");
    expect(row.page_url).toBe("https://www.ourtownproperties.com/ask-mike/");
    expect(row.widget_session_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(row.lead_type).toBe("home_value");
    expect(row.primary_intent).toBe("sell");
    expect(row.status).toBe("new");
  });
});

// ─── Supabase production schema compatibility ────────────────────────────────

describe("POST /api/leads — Supabase schema compatibility", () => {
  it("maps home-value payloads to production lead columns without address or canonical-only fields", async () => {
    configureSupabaseEnv();

    const captured: Array<{ table: string; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("supabase")) {
        const urlStr = String(url);
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push({ table: urlStr.includes("/rest/v1/sessions") ? "sessions" : "leads", body });
        return successInsertResponse();
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest({
      funnel_type: "home_value",
      lead_source_surface: "widget",
      address: "123 Nash St NW, Wilson NC",
      email: "jane@example.com",
      phone: "2525551212",
      timeline: "30-60 days",
      attribution: {
        source: "ourtownproperties",
        medium: "website",
        campaign: "parent-site-widget",
        parent_url: "https://www.ourtownproperties.com/",
        placement: "sitewide-floating",
      },
    }));

    expect(res.status).toBe(200);
    expect(captured).toHaveLength(2);
    expect(captured[0].table).toBe("sessions");
    expect(captured[1].table).toBe("leads");
    const row = captured[1].body;
    expect(row.address_raw).toBe("123 Nash St NW, Wilson NC");
    expect(row.timeline_months).toBe(3);
    expect(row.lead_type).toBe("home_value");
    expect(row.primary_intent).toBe("sell");
    expect(row.source).toBe("ourtownproperties");
    expect(row.source_detail).toBe("widget / website / parent-site-widget / sitewide-floating");
    expect(row.page_url).toBe("https://www.ourtownproperties.com/");
    expect(row).not.toHaveProperty("address");
    expect(row).not.toHaveProperty("property_address");
    expect(row).not.toHaveProperty("funnel_type");
    expect(row).not.toHaveProperty("lead_source_surface");
    expect(row).not.toHaveProperty("attribution");
  });

  it("keeps seller context in production-safe fields", async () => {
    configureSupabaseEnv();

    const captured: Array<{ table: string; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("supabase")) {
        const urlStr = String(url);
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push({ table: urlStr.includes("/rest/v1/sessions") ? "sessions" : "leads", body });
        return successInsertResponse();
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest({
      funnel_type: "seller",
      lead_source_surface: "seller_page",
      address: "804 Herring Ave E",
      phone: "2525551212",
      condition: "Needs repairs",
      timeline: "As soon as practical",
      notes: "Inherited property",
    }));

    expect(res.status).toBe(200);
    expect(captured).toHaveLength(2);
    const row = captured[1].body;
    expect(row.address_raw).toBe("804 Herring Ave E");
    expect(row.lead_type).toBe("seller");
    expect(row.primary_intent).toBe("sell");
    expect(row.timeline_months).toBe(0);
    expect(String(row.question_raw)).toContain("Condition: Needs repairs");
    expect(String(row.question_raw)).toContain("Inherited property");
    expect(row).not.toHaveProperty("condition");
    expect(row).not.toHaveProperty("property_condition");
    expect(row).not.toHaveProperty("notes");
  });

  it("maps widget lead_type, page_url, and widget_session_id without retrying missing columns", async () => {
    configureSupabaseEnv();

    const captured: Array<{ table: string; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("supabase")) {
        const urlStr = String(url);
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push({ table: urlStr.includes("/rest/v1/sessions") ? "sessions" : "leads", body });
        return successInsertResponse();
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest({
      funnel_type: "widget",
      lead_source_surface: "widget",
      lead_type: "seller_cash_offer",
      address: "400 Broad St W",
      email: "jane@example.com",
      phone: "2525551212",
      timeline: "6-12 months",
      page_url: "https://www.ourtownproperties.com/sell/",
      widget_session_id: "22222222-2222-4222-8222-222222222222",
      attribution: {
        source: "ourtownproperties",
        campaign: "parent-site-widget",
        placement: "sitewide-floating",
      },
    }));

    expect(res.status).toBe(200);
    expect(captured.map((call) => call.table)).toEqual(["sessions", "leads"]);
    const row = captured[1].body;
    expect(row.session_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(row.widget_session_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(row.address_raw).toBe("400 Broad St W");
    expect(row.lead_type).toBe("seller_cash_offer");
    expect(row.primary_intent).toBe("sell");
    expect(row.timeline_months).toBe(12);
    expect(row.page_url).toBe("https://www.ourtownproperties.com/sell/");
    expect(row.source).toBe("ourtownproperties");
  });

  it("does not send address even when PostgREST would reject it with PGRST204", async () => {
    configureSupabaseEnv();

    const captured: Array<{ table: string; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("supabase")) {
        const urlStr = String(url);
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push({ table: urlStr.includes("/rest/v1/sessions") ? "sessions" : "leads", body });
        if (urlStr.includes("/rest/v1/leads") && "address" in body) {
          return missingColumnResponse("address");
        }
        return successInsertResponse();
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest({
      funnel_type: "home_value",
      address: "123 Nash St NW",
      email: "jane@example.com",
      phone: "2525551212",
    }));

    expect(res.status).toBe(200);
    const leadWrites = captured.filter((call) => call.table === "leads");
    expect(leadWrites).toHaveLength(1);
    expect(leadWrites[0].body).not.toHaveProperty("address");
    expect(leadWrites[0].body.address_raw).toBe("123 Nash St NW");
  });

  it("returns a generic public error when Supabase lead insert fails and does not retry storm", async () => {
    configureSupabaseEnv();

    const captured: Array<{ table: string; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("supabase")) {
        captured.push({ table: urlStr.includes("/rest/v1/sessions") ? "sessions" : "leads", body: {} });
        if (urlStr.includes("/rest/v1/sessions")) return successInsertResponse();
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: async () => "Supabase insert failed: PGRST204 schema cache address column",
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest({
      funnel_type: "home_value",
      address: "123 Nash St NW",
      email: "jane@example.com",
      phone: "2525551212",
    }));
    const body = await json(res);
    const serialized = JSON.stringify(body);

    expect(res.status).toBe(500);
    expect(captured.filter((call) => call.table === "sessions")).toHaveLength(1);
    expect(captured.filter((call) => call.table === "leads")).toHaveLength(1);
    expect(body.error).toBe(PUBLIC_LEAD_SAVE_ERROR);
    expect(serialized).not.toMatch(/Supabase insert failed/i);
    expect(serialized).not.toMatch(/PGRST204/i);
    expect(serialized).not.toMatch(/schema cache/i);
    expect(serialized).not.toMatch(/address column/i);
  });
});

describe("POST /api/leads — timeline mapping", () => {
  async function leadRowForTimeline(timeline: string) {
    configureSupabaseEnv();
    const captured: Array<{ table: string; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("supabase")) {
        const urlStr = String(url);
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push({ table: urlStr.includes("/rest/v1/sessions") ? "sessions" : "leads", body });
        return successInsertResponse();
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    await POST(makeRequest({
      funnel_type: "home_value",
      address: "123 Nash St",
      email: "jane@example.com",
      phone: "2525551212",
      timeline,
    }));

    return captured.find((call) => call.table === "leads")?.body || {};
  }

  it("maps ASAP to 0 months", async () => {
    expect((await leadRowForTimeline("ASAP")).timeline_months).toBe(0);
  });

  it("maps 30-60 days to 3 months", async () => {
    expect((await leadRowForTimeline("30-60 days")).timeline_months).toBe(3);
  });

  it("maps 6-12 months to 12 months", async () => {
    expect((await leadRowForTimeline("6-12 months")).timeline_months).toBe(12);
  });

  it("maps just curious/not sure to 24 months", async () => {
    expect((await leadRowForTimeline("Just curious / not sure")).timeline_months).toBe(24);
  });
});

// ─── Response shape ───────────────────────────────────────────────────────────

describe("POST /api/leads — response shape", () => {
  it("returns JSON with message field on success", async () => {
    const res = await POST(makeRequest({
      funnel_type: "seller",
      address: "123 Nash St",
      phone: "2525551212",
    }));
    const body = await json(res);
    expect(typeof body.message).toBe("string");
    expect(String(body.message).length).toBeGreaterThan(0);
  });

  it("includes 'Mike' in default message when OpenAI absent", async () => {
    const res = await POST(makeRequest({
      funnel_type: "chat",
      question: "What is my home worth?",
    }));
    const body = await json(res);
    expect(body.message).toContain("Mike");
  });
});

// ─── /api/valuation backward compat ──────────────────────────────────────────

describe("POST /api/valuation — re-exports leads route", () => {
  it("module exports the same POST function as /api/leads", async () => {
    const valuation = await import("../../app/api/valuation/route");
    const leads = await import("../../app/api/leads/route");
    expect(valuation.POST).toBe(leads.POST);
  });
});
