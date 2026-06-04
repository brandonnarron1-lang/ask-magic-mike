import { describe, expect, it } from "vitest";
import {
  computeDeadlines,
  detectBreaches,
  rankBreaches,
  summarizeSla,
} from "@/lib/engines/sla";

describe("SLA engine", () => {
  it("A+ contact deadline is 2 minutes; A is 5 minutes", () => {
    const t = new Date("2026-06-03T12:00:00Z");
    const aPlus = computeDeadlines(t, "A+");
    const a = computeDeadlines(t, "A");
    expect(
      Math.round((aPlus.contactDueAt.getTime() - t.getTime()) / 1000)
    ).toBe(120);
    expect(Math.round((a.contactDueAt.getTime() - t.getTime()) / 1000)).toBe(
      300
    );
  });

  it("flags accept_missed before contact_missed", () => {
    const t = new Date("2026-06-03T12:00:00Z");
    const breaches = detectBreaches(
      [
        {
          leadId: "L1",
          grade: "A+",
          createdAt: t,
          acceptedAt: null,
          contactedAt: null,
        },
      ],
      new Date(t.getTime() + 70 * 1000) // 70s in
    );
    expect(breaches[0].type).toBe("accept_missed");
  });

  it("flags both_missed when both deadlines lapse", () => {
    const t = new Date("2026-06-03T12:00:00Z");
    const breaches = detectBreaches(
      [
        {
          leadId: "L1",
          grade: "A+",
          createdAt: t,
          acceptedAt: null,
          contactedAt: null,
        },
      ],
      new Date(t.getTime() + 5 * 60 * 1000)
    );
    expect(breaches[0].type).toBe("both_missed");
  });

  it("does not flag contacted leads", () => {
    const t = new Date("2026-06-03T12:00:00Z");
    const breaches = detectBreaches(
      [
        {
          leadId: "L1",
          grade: "A",
          createdAt: t,
          acceptedAt: new Date(t.getTime() + 60_000),
          contactedAt: new Date(t.getTime() + 120_000),
        },
      ],
      new Date(t.getTime() + 24 * 3600 * 1000)
    );
    expect(breaches).toHaveLength(0);
  });

  it("ranks A+ breaches before B breaches", () => {
    const t = new Date("2026-06-03T12:00:00Z");
    const ranked = rankBreaches([
      {
        leadId: "Lb",
        grade: "B",
        type: "contact_missed",
        dueAt: new Date(t.getTime() + 30 * 60_000),
      },
      {
        leadId: "Lap",
        grade: "A+",
        type: "contact_missed",
        dueAt: new Date(t.getTime() + 2 * 60_000),
      },
    ]);
    expect(ranked[0].leadId).toBe("Lap");
  });

  it("summarizes hit rate", () => {
    const t = new Date("2026-06-03T12:00:00Z");
    const s = summarizeSla(
      [
        {
          leadId: "L1",
          grade: "A+",
          createdAt: t,
          acceptedAt: new Date(t.getTime() + 30_000),
          contactedAt: new Date(t.getTime() + 60_000),
        },
        {
          leadId: "L2",
          grade: "A",
          createdAt: t,
          acceptedAt: null,
          contactedAt: null,
        },
      ],
      new Date(t.getTime() + 20 * 60_000)
    );
    expect(s.total).toBe(2);
    expect(s.breached).toBe(1);
    expect(s.hitRate).toBe(0.5);
  });
});
