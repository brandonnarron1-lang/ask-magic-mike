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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

function missingColumnResponse(column: string) {
  return {
    ok: false,
    status: 400,
    statusText: "Bad Request",
    text: async () =>
      JSON.stringify({
        code: "PGRST204",
        details: null,
        hint: null,
        message: "Could not find the '" + column + "' column of 'leads' in the schema cache",
      }),
  } as Response;
}

function successInsertResponse() {
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
  it("passes all attribution fields to Supabase fullRow", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";

    const captured: unknown[] = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("supabase")) {
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push(body);
        return { ok: true, status: 201, text: async () => "" } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    await POST(makeRequest({
      funnel_type: "home_value",
      address: "123 Nash St NW, Wilson NC",
      email: "jane@example.com",
      phone: "2525551212",
      attribution: {
        source: "facebook",
        medium: "paid_social",
        campaign: "seller_q3_wilson",
        gclid: undefined,
        embed_host: "ourtownproperties.com",
        placement: "sitewide-floating",
      },
    }));

    expect(captured).toHaveLength(1);
    const row = captured[0] as Record<string, unknown>;
    expect(row.source).toBe("facebook");
    expect(row.medium).toBe("paid_social");
    expect(row.campaign).toBe("seller_q3_wilson");
    expect(row.embed_host).toBe("ourtownproperties.com");
    expect(row.placement).toBe("sitewide-floating");
    expect(row.funnel_type).toBe("home_value");
    expect(row.status).toBe("new");
    expect(row.assigned_agent_id).toBeNull();
  });
});

// ─── Supabase schema compatibility ───────────────────────────────────────────

describe("POST /api/leads — Supabase schema compatibility", () => {
  it("retries home-value inserts without a PGRST204 missing address column", async () => {
    configureSupabaseEnv();

    const captured: Array<Record<string, unknown>> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("supabase")) {
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push(body);
        return captured.length === 1 ? missingColumnResponse("address") : successInsertResponse();
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest({
      funnel_type: "home_value",
      lead_source_surface: "widget",
      address: "123 Nash St NW, Wilson NC",
      email: "jane@example.com",
      phone: "2525551212",
      timeline: "30 days",
      attribution: { source: "ourtownproperties", placement: "sitewide-floating" },
    }));

    expect(res.status).toBe(200);
    expect(captured).toHaveLength(2);
    expect(captured[0].address).toBe("123 Nash St NW, Wilson NC");
    expect(captured[1]).not.toHaveProperty("address");
    expect(captured[1].address_raw).toBe("123 Nash St NW, Wilson NC");
    expect(captured[1].property_address).toBe("123 Nash St NW, Wilson NC");
    expect(String(captured[1].notes)).toContain("Address: 123 Nash St NW, Wilson NC");
  });

  it("keeps seller condition, timeline, and compatible address fields after dropping address", async () => {
    configureSupabaseEnv();

    const captured: Array<Record<string, unknown>> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("supabase")) {
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push(body);
        return captured.length === 1 ? missingColumnResponse("address") : successInsertResponse();
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
    const retryRow = captured[1];
    expect(retryRow).not.toHaveProperty("address");
    expect(retryRow.address_raw).toBe("804 Herring Ave E");
    expect(retryRow.property_address).toBe("804 Herring Ave E");
    expect(retryRow.property_condition).toBe("Needs repairs");
    expect(retryRow.condition).toBe("Needs repairs");
    expect(retryRow.timeline).toBe("As soon as practical");
    expect(String(retryRow.notes)).toContain("Inherited property");
  });

  it("can drop multiple unsupported canonical columns while preserving compatible widget lead data", async () => {
    configureSupabaseEnv();

    const captured: Array<Record<string, unknown>> = [];
    const missingColumns = ["address", "property_address", "funnel_type"];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("supabase")) {
        const body = init?.body && typeof init.body === "string"
          ? JSON.parse(init.body) as Record<string, unknown>
          : {};
        captured.push(body);
        const missing = missingColumns[captured.length - 1];
        return missing ? missingColumnResponse(missing) : successInsertResponse();
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest({
      funnel_type: "widget",
      lead_source_surface: "widget",
      address: "400 Broad St W",
      email: "jane@example.com",
      phone: "2525551212",
      timeline: "This month",
      attribution: {
        source: "ourtownproperties",
        campaign: "parent-site-widget",
        placement: "sitewide-floating",
      },
    }));

    expect(res.status).toBe(200);
    expect(captured).toHaveLength(4);
    const finalRow = captured[3];
    expect(finalRow).not.toHaveProperty("address");
    expect(finalRow).not.toHaveProperty("property_address");
    expect(finalRow).not.toHaveProperty("funnel_type");
    expect(finalRow.address_raw).toBe("400 Broad St W");
    expect(finalRow.lead_type).toBe("home_value");
    expect(finalRow.source).toBe("ourtownproperties");
    expect(finalRow.placement).toBe("sitewide-floating");
  });

  it("returns a generic public error when Supabase insert cannot be recovered", async () => {
    configureSupabaseEnv();

    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("supabase")) {
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
    expect(body.error).toBe(PUBLIC_LEAD_SAVE_ERROR);
    expect(serialized).not.toMatch(/Supabase insert failed/i);
    expect(serialized).not.toMatch(/PGRST204/i);
    expect(serialized).not.toMatch(/schema cache/i);
    expect(serialized).not.toMatch(/address column/i);
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
