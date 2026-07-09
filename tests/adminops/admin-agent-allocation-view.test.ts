import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bucketAgentAvailability,
  loadAdminAgentAllocationView,
  normalizeAgentRow,
  normalizeAssignableLeadRow,
  scoreLeadForAssignment,
  summarizeAgentAllocation,
} from "../../app/lib/adminAgentAllocationView";

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
});

describe("AdminOps agent allocation view", () => {
  it("normalizes agent rows and buckets availability", () => {
    const agent = normalizeAgentRow({
      id: "agent-1",
      name: "Mike Eatmon",
      email: " mike@example.com ",
      phone: "2525550100",
      role: "primary",
      is_active: true,
      max_daily_leads: 3,
      current_load: 2,
      priority_score: 90,
      timezone: "America/New_York",
    });

    expect(agent.name).toBe("Mike Eatmon");
    expect(agent.email).toBe("mike@example.com");
    expect(agent.availability).toBe("active");
    expect(bucketAgentAvailability({ is_active: false })).toBe("inactive");
    expect(bucketAgentAvailability({ is_active: true, max_daily_leads: 2, current_load: 2 })).toBe("unavailable");
  });

  it("normalizes assignable lead rows and scores hot seller leads", () => {
    const lead = normalizeAssignableLeadRow({
      id: "lead-1",
      created_at: "2026-07-09T11:00:00.000Z",
      status: "new",
      first_name: "Jane",
      last_name: "Wilson",
      email: "jane@example.com",
      phone: "2525550101",
      address_raw: "100 Nash St",
      primary_intent: "sell",
      timeline_months: 0,
      lead_type: "seller",
      source: "widget",
    });

    expect(lead.displayName).toBe("Jane Wilson");
    expect(lead.contactSummary).toBe("jane@example.com / 2525550101");
    expect(lead.assignmentScore).toBe(100);
    expect(lead.isHot).toBe(true);
    expect(scoreLeadForAssignment({ ...lead, status: "spam" })).toBe(0);
  });

  it("groups assigned and unassigned leads into allocation summaries", () => {
    const agents = [
      normalizeAgentRow({ id: "agent-1", name: "Mike", is_active: true }),
      normalizeAgentRow({ id: "agent-2", name: "Backup", is_active: false }),
    ];
    const leads = [
      normalizeAssignableLeadRow({
        id: "lead-hot",
        created_at: "2026-07-09T11:00:00.000Z",
        status: "new",
        phone: "2525550101",
        primary_intent: "sell",
        timeline_months: 0,
        lead_type: "seller",
        source: "widget",
      }),
      normalizeAssignableLeadRow({
        id: "lead-assigned",
        created_at: "2026-07-09T10:00:00.000Z",
        status: "assigned",
        assigned_agent_id: "agent-1",
        phone: "2525550102",
        primary_intent: "sell",
        timeline_months: 3,
        lead_type: "home_value",
        source: "facebook",
      }),
      normalizeAssignableLeadRow({
        id: "lead-stale",
        created_at: "2026-07-07T10:00:00.000Z",
        status: "new",
        email: "stale@example.com",
        primary_intent: "buy",
        timeline_months: 12,
        lead_type: "buyer",
        source: "direct",
      }),
    ];

    const summary = summarizeAgentAllocation(agents, leads);

    expect(summary.kpis).toEqual({
      unassignedLeads: 2,
      hotUnassigned: 1,
      assignedActiveLeads: 1,
      availableAgents: 1,
    });
    expect(summary.unassignedHotLeads.map((lead) => lead.id)).toEqual(["lead-hot"]);
    expect(summary.staleUnassignedLeads.map((lead) => lead.id)).toEqual(["lead-stale"]);
    expect(summary.assignedLeadsByAgent[0].agent.currentAssignedLeadCount).toBe(1);
    expect(summary.sourceMix.map((item) => item.value)).toContain("widget");
    expect(summary.intentMix.map((item) => item.value)).toContain("sell");
    expect(summary.timelineMix.map((item) => item.value)).toContain("Immediate / 0-30 days");
  });

  it("returns a safe unconfigured state when Supabase env vars are missing", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(loadAdminAgentAllocationView()).resolves.toMatchObject({
      configured: false,
      agents: [],
      leads: [],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses bounded Supabase REST GET requests only", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return {
        ok: true,
        status: 200,
        json: async () => [],
      } as Response;
    }) as unknown as typeof fetch;

    const summary = await loadAdminAgentAllocationView(999);

    expect(summary.configured).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => !call.init?.method || call.init.method === "GET")).toBe(true);
    expect(calls[0].url).toContain("/rest/v1/agents");
    expect(calls[1].url).toContain("/rest/v1/leads");
    expect(calls[1].url).toContain("limit=300");
    expect(JSON.stringify(calls)).not.toContain("/api/leads");
  });
});
