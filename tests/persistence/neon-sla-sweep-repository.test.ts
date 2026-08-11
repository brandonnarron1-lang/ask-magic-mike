import { describe, expect, it, vi } from "vitest";
import { NeonSlaSweepRepository } from "@/lib/persistence/neon/sla-sweep-repository";

describe("NeonSlaSweepRepository", () => {
  it("maps live leads and excludes test or synthetic rows", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        created_at: "2026-08-11T12:00:00.000Z",
        lead_grade: "A",
        last_contacted_at: null,
        email: "realbuyer@gmail.com",
        is_test: false,
        accepted_at: "2026-08-11T12:01:00.000Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        created_at: "2026-08-11T12:00:00.000Z",
        lead_grade: "A+",
        last_contacted_at: null,
        email: "qa+amm-smoke@ourtownproperties.com",
        is_test: true,
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
        contactedAt: null,
      },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("LEFT JOIN LATERAL"), [
      ["new", "qualified", "contacted", "assigned"],
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
