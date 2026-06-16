/**
 * Regression: source_attribution writes must be idempotent.
 *
 * Migration 00013 adds UNIQUE(lead_id) to source_attribution. This test
 * asserts that both write paths call .upsert() — not .insert() — with
 * { onConflict: "lead_id", ignoreDuplicates: true }, so retried form
 * submissions never produce duplicate rows or 23505 unique-violation errors.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PersistableLead } from "@/lib/engines/lead-capture";

// Track Supabase table-level calls across the mock client instances.
type TableCall = { method: string; args: unknown[] };
const tableCallsMap = new Map<string, TableCall[]>();

function recordCall(table: string, method: string, args: unknown[]) {
  if (!tableCallsMap.has(table)) tableCallsMap.set(table, []);
  tableCallsMap.get(table)!.push({ method, args });
}

function callsFor(table: string): TableCall[] {
  return tableCallsMap.get(table) ?? [];
}

function makeMockClient() {
  return {
    from: (table: string) => ({
      insert: (...args: unknown[]) => {
        recordCall(table, "insert", args);
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "mock-lead-id" }, error: null }),
          }),
        };
      },
      upsert: (...args: unknown[]) => {
        recordCall(table, "upsert", args);
        return Promise.resolve({ data: null, error: null });
      },
      select: (cols?: string) => {
        recordCall(table, "select", [cols]);
        return {
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: null }),
            in: () => Promise.resolve({ data: [], error: null }),
            single: () =>
              Promise.resolve({ data: null, error: null }),
          }),
          in: () => Promise.resolve({ data: [], error: null }),
          or: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          limit: () => Promise.resolve({ data: [], error: null }),
        };
      },
    }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => makeMockClient(),
}));

import { createSupabaseLeadCaptureRepo } from "@/lib/engines/lead-capture-supabase-repo";

const LEAD_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const SESSION_ID = "ssssssss-ssss-4sss-8sss-ssssssssssss";

const BASE_REC: PersistableLead = {
  id: LEAD_ID,
  sessionId: SESSION_ID,
  contactId: null,
  leadType: "seller",
  legacyIntent: "sell",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "+12525551234",
  normalizedEmail: "jane@example.com",
  normalizedPhone: "+12525551234",
  propertyAddress: "123 Main St",
  normalizedPropertyAddress: "123 main st",
  city: "Wilson",
  county: "Wilson",
  state: "NC",
  zip: "27893",
  source: "ask_magic_mike_landing",
  sourceDetail: null,
  pageUrl: "https://askmagicmike.com",
  widgetSessionId: null,
  listingId: null,
  utm: {
    source: "facebook",
    medium: "paid_social",
    campaign: "wilson-nc-sellers-2026",
    term: null,
    content: null,
  },
  referrer: "https://facebook.com",
  landingPage: "/",
  spamScore: 0,
  spamReasons: [],
  leadGrade: "B",
  allocation: null as never,
  consent: { sms: true, email: true, call: true, timestamp: "2026-06-16T00:00:00Z" },
  metadata: null,
};

describe("source_attribution idempotency (migration 00013)", () => {
  beforeEach(() => {
    tableCallsMap.clear();
  });

  it("insertLead calls upsert — not insert — on source_attribution", async () => {
    const repo = createSupabaseLeadCaptureRepo();
    await repo.insertLead(BASE_REC);

    const attrCalls = callsFor("source_attribution");
    expect(attrCalls).toHaveLength(1);
    expect(attrCalls[0].method).toBe("upsert");
  });

  it("upsert carries onConflict=lead_id and ignoreDuplicates=true", async () => {
    const repo = createSupabaseLeadCaptureRepo();
    await repo.insertLead(BASE_REC);

    const [call] = callsFor("source_attribution");
    const opts = call.args[1] as Record<string, unknown>;
    expect(opts).toMatchObject({ onConflict: "lead_id", ignoreDuplicates: true });
  });

  it("upsert payload includes the lead_id and UTM fields", async () => {
    const repo = createSupabaseLeadCaptureRepo();
    await repo.insertLead(BASE_REC);

    const [call] = callsFor("source_attribution");
    const payload = call.args[0] as Record<string, unknown>;
    expect(payload.lead_id).toBe("mock-lead-id");
    expect(payload.utm_source).toBe("facebook");
    expect(payload.utm_medium).toBe("paid_social");
    expect(payload.utm_campaign).toBe("wilson-nc-sellers-2026");
    expect(payload.is_paid).toBe(true);
  });

  it("no source_attribution write when all UTM and referrer fields are absent", async () => {
    const repo = createSupabaseLeadCaptureRepo();
    await repo.insertLead({
      ...BASE_REC,
      utm: { source: null, medium: null, campaign: null, term: null, content: null },
      referrer: null,
      landingPage: null,
    });

    expect(callsFor("source_attribution")).toHaveLength(0);
  });
});
