import { describe, expect, it, vi } from "vitest";
import { NeonSlaSweepRepository } from "@/lib/persistence/neon/sla-sweep-repository";

describe("NeonSlaSweepRepository", () => {
  it("uses immutable response evidence and excludes test, suppressed, or synthetic rows", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        created_at: "2026-08-11T12:00:00.000Z",
        lead_grade: "A",
        first_human_response_at: "2026-08-11T12:03:00.000Z",
        email: "realbuyer@gmail.com",
        is_test: false,
        communication_suppressed: false,
        accepted_at: "2026-08-11T12:01:00.000Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        created_at: "2026-08-11T12:00:00.000Z",
        lead_grade: "A+",
        first_human_response_at: null,
        email: "qa+amm-smoke@ourtownproperties.com",
        is_test: true,
        communication_suppressed: true,
        accepted_at: null,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        created_at: "2026-08-11T12:00:00.000Z",
        lead_grade: "B",
        first_human_response_at: null,
        email: "suppressed@example.com",
        is_test: false,
        communication_suppressed: true,
        accepted_at: null,
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        created_at: "2026-08-11T12:00:00.000Z",
        lead_grade: "A+",
        first_human_response_at: null,
        email: "internal.qa@example.com",
        is_test: false,
        communication_suppressed: false,
        accepted_at: null,
      },
    ]);
    const repo = new NeonSlaSweepRepository({ query });

    const states = await repo.fetchOpenLeadStates(5_000);

    expect(states).toEqual([
      {
        leadId: "11111111-1111-4111-8111-111111111111",
        grade: "A",
        createdAt: new Date("2026-08-11T12:00:00.000Z"),
        acceptedAt: new Date("2026-08-11T12:01:00.000Z"),
        contactedAt: new Date("2026-08-11T12:03:00.000Z"),
      },
    ]);
    const statement = query.mock.calls[0]?.[0] as string;
    expect(statement).toContain("public.lead_response_milestones");
    expect(statement).toContain("rm.communication_suppressed = false");
    expect(statement).toContain("COALESCE(l.communication_suppressed, false) = false");
    expect(statement).not.toContain("last_contacted_at");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("LEFT JOIN LATERAL"), [
      [
        "new",
        "scored",
        "assigned",
        "escalated",
        "qualified",
        "contacted",
        "appointment_requested",
      ],
      1_000,
    ]);
  });

  it("records a concurrency-safe critical SLA breach through the existing SQL function", async () => {
    const query = vi.fn().mockResolvedValue([{ record_sla_breach_v1: true }]);
    const repo = new NeonSlaSweepRepository({ query });

    await repo.recordBreach({
      leadId: "11111111-1111-4111-8111-111111111111",
      grade: "A+",
      type: "accept_missed",
      dueAt: new Date("2026-08-11T12:02:00.000Z"),
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("record_sla_breach_v1"),
      [
        "11111111-1111-4111-8111-111111111111",
        "sla_accept_breached",
        "critical",
        JSON.stringify({ grade: "A+", dueAt: "2026-08-11T12:02:00.000Z" }),
      ],
    );
  });
});
