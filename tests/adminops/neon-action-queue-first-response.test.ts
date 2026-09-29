import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => ({ query: mocks.query })),
}));

import { loadNeonAdminActionQueue } from "../../app/lib/persistence/neonAdminAppointmentFollowupOps";

describe("canonical Neon first-response action queue", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://action-queue.invalid/neondb";
    mocks.query.mockReset();
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it("joins immutable response evidence and returns the existing queue item contract", async () => {
    const createdAt = new Date(Date.now() - 20 * 60_000).toISOString();
    mocks.query.mockImplementation(async (query: string) => {
      if (query.includes("FROM public.leads l")) {
        return [{
          id: "11111111-1111-4111-8111-111111111111",
          created_at: createdAt,
          status: "assigned",
          conversion_stage: "assigned",
          assigned_agent_id: "22222222-2222-4222-8222-222222222222",
          assigned_at: createdAt,
          last_contacted_at: null,
          first_human_response_at: null,
          is_test: false,
          communication_suppressed: false,
          first_response_evidence_available: true,
        }];
      }
      return [];
    });

    const result = await loadNeonAdminActionQueue();

    expect(result.error).toBeUndefined();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(expect.objectContaining({
      type: "first_response_overdue",
      priority: 1,
      lead_id: "11111111-1111-4111-8111-111111111111",
      assigned_agent_id: "22222222-2222-4222-8222-222222222222",
    }));
    expect(result.firstResponseCoverage).toEqual({
      evidenceAvailable: true,
      riskCount: 1,
      coveredCount: 1,
      directQueueCount: 1,
      coveredByExistingActionCount: 0,
      uncoveredCount: 0,
    });

    const leadQuery = mocks.query.mock.calls
      .map(([query]) => String(query))
      .find((query) => query.includes("FROM public.leads l"));
    expect(leadQuery).toContain("LEFT JOIN public.lead_response_milestones");
    expect(leadQuery).toContain("l.is_test = false");
    expect(leadQuery).toContain("l.communication_suppressed = false");
    expect(leadQuery).toContain("rm.is_test = false");
    expect(leadQuery).toContain("rm.communication_suppressed = false");
  });

  it("omits lead names and addresses from aggregate-only health reads", async () => {
    mocks.query.mockResolvedValue([]);

    const result = await loadNeonAdminActionQueue({ aggregateOnly: true });

    expect(result.error).toBeUndefined();
    expect(result.firstResponseCoverage.evidenceAvailable).toBe(true);
    const leadQuery = mocks.query.mock.calls
      .map(([query]) => String(query))
      .find((query) => query.includes("FROM public.leads l"));
    expect(leadQuery).toBeDefined();
    expect(leadQuery).not.toContain("l.address_raw");
    expect(leadQuery).not.toContain("l.first_name");
    expect(leadQuery).not.toContain("l.last_name");
    expect(leadQuery).toContain("l.timeline_months");
    expect(leadQuery).toContain("l.is_test");
  });

  it("fails closed when immutable response evidence cannot be read", async () => {
    mocks.query.mockImplementation(async (query: string) => {
      if (query.includes("FROM public.leads l")) throw new Error("response ledger unavailable");
      return [];
    });

    await expect(loadNeonAdminActionQueue()).resolves.toMatchObject({
      configured: true,
      items: [],
      firstResponseCoverage: {
        evidenceAvailable: false,
        riskCount: 0,
        coveredCount: 0,
        directQueueCount: 0,
        coveredByExistingActionCount: 0,
        uncoveredCount: 0,
      },
      error: "Canonical Neon action queue query failed",
    });
  });
});
