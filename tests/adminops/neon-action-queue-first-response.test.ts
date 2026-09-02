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

    const leadQuery = mocks.query.mock.calls
      .map(([query]) => String(query))
      .find((query) => query.includes("FROM public.leads l"));
    expect(leadQuery).toContain("LEFT JOIN public.lead_response_milestones");
    expect(leadQuery).toContain("l.is_test = false");
    expect(leadQuery).toContain("l.communication_suppressed = false");
    expect(leadQuery).toContain("rm.is_test = false");
    expect(leadQuery).toContain("rm.communication_suppressed = false");
  });

  it("fails closed when immutable response evidence cannot be read", async () => {
    mocks.query.mockImplementation(async (query: string) => {
      if (query.includes("FROM public.leads l")) throw new Error("response ledger unavailable");
      return [];
    });

    await expect(loadNeonAdminActionQueue()).resolves.toMatchObject({
      configured: true,
      items: [],
      error: "Canonical Neon action queue query failed",
    });
  });
});
