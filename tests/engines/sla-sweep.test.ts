import { describe, expect, it } from "vitest";
import { SlaSweepEngine, type SlaSweepRepository } from "@/lib/engines/sla-sweep";
import type { LeadSlaState, SlaBreach } from "@/lib/engines/sla";
import { isSyntheticEmail } from "@/lib/leads/synthetic-detection";

function fakeRepo(states: LeadSlaState[]): {
  repo: SlaSweepRepository;
  recorded: SlaBreach[];
} {
  const recorded: SlaBreach[] = [];
  return {
    repo: {
      async fetchOpenLeadStates() {
        return states;
      },
      async recordBreach(b) {
        recorded.push(b);
      },
    },
    recorded,
  };
}

describe("SlaSweepEngine", () => {
  it("reports breaches without persisting unless asked", async () => {
    const t = new Date("2026-06-04T12:00:00Z");
    const states: LeadSlaState[] = [
      {
        leadId: "L-hot",
        grade: "A+",
        createdAt: t,
        acceptedAt: null,
        contactedAt: null,
      },
      {
        leadId: "L-ok",
        grade: "B",
        createdAt: new Date(t.getTime() - 60_000),
        acceptedAt: new Date(t.getTime()),
        contactedAt: new Date(t.getTime()),
      },
    ];
    const { repo, recorded } = fakeRepo(states);
    const engine = new SlaSweepEngine(repo);
    const report = await engine.sweep({ now: new Date(t.getTime() + 5 * 60_000) });
    expect(report.scanned).toBe(2);
    expect(report.breaches[0].leadId).toBe("L-hot");
    expect(report.flaggedCount).toBe(0);
    expect(recorded).toHaveLength(0);
  });

  it("persists breaches when persistBreaches=true", async () => {
    const t = new Date("2026-06-04T12:00:00Z");
    const { repo, recorded } = fakeRepo([
      {
        leadId: "L-hot",
        grade: "A+",
        createdAt: t,
        acceptedAt: null,
        contactedAt: null,
      },
    ]);
    const engine = new SlaSweepEngine(repo);
    const report = await engine.sweep({
      now: new Date(t.getTime() + 5 * 60_000),
      persistBreaches: true,
    });
    expect(report.flaggedCount).toBe(1);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].grade).toBe("A+");
  });

  it("does not sweep synthetic/QA leads when repo applies synthetic filter", async () => {
    const t = new Date("2026-06-04T12:00:00Z");
    // Mirror the filtering that createSupabaseSlaSweepRepo now applies:
    // synthetic leads are excluded before LeadSlaState[] is returned to the engine.
    type Row = LeadSlaState & { email?: string | null };
    const rows: Row[] = [
      {
        leadId: "qa-lead",
        grade: "A+",
        createdAt: t,
        acceptedAt: null,
        contactedAt: null,
        email: "qa+amm-smoke@ourtownproperties.com",
      },
      {
        leadId: "real-lead",
        grade: "B",
        createdAt: t,
        acceptedAt: null,
        contactedAt: null,
        email: "realbuyer@gmail.com",
      },
    ];
    const filteredStates: LeadSlaState[] = rows
      .filter((r) => !isSyntheticEmail(r.email))
      .map(({ email: _e, ...rest }) => rest as LeadSlaState);

    const { repo } = fakeRepo(filteredStates);
    const engine = new SlaSweepEngine(repo);
    // Advance 35 min — past B-grade accept (30 min) and A+-grade thresholds
    const report = await engine.sweep({ now: new Date(t.getTime() + 35 * 60_000) });

    expect(report.scanned).toBe(1);
    expect(report.breaches.some((b) => b.leadId === "qa-lead")).toBe(false);
    expect(report.breaches.some((b) => b.leadId === "real-lead")).toBe(true);
  });

  it("ranks A+ breaches first", async () => {
    const t = new Date("2026-06-04T12:00:00Z");
    const { repo } = fakeRepo([
      {
        leadId: "L-b",
        grade: "B",
        createdAt: t,
        acceptedAt: null,
        contactedAt: null,
      },
      {
        leadId: "L-aplus",
        grade: "A+",
        createdAt: t,
        acceptedAt: null,
        contactedAt: null,
      },
    ]);
    const engine = new SlaSweepEngine(repo);
    const report = await engine.sweep({
      now: new Date(t.getTime() + 31 * 60_000),
    });
    expect(report.breaches[0].leadId).toBe("L-aplus");
  });
});
