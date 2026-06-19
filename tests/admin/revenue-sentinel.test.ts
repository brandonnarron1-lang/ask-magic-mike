/**
 * Tests for buildRevenueSentinel — pure function, no DB, no writes.
 *
 * All tests use a minimal RevenueCommandData factory so each test
 * only sets the fields it cares about.
 */
import { describe, expect, it } from "vitest";
import { buildRevenueSentinel } from "../../src/lib/admin/revenue-sentinel";
import type { RevenueCommandData } from "../../src/lib/admin/revenue-command";

// ---------------------------------------------------------------------------
// Test factory — safe defaults that produce no alerts
// ---------------------------------------------------------------------------

function makeData(overrides: Partial<RevenueCommandData> = {}): RevenueCommandData {
  return {
    generatedAt: "2026-06-16T10:00:00.000Z",
    funnelHealth: {
      leads24h: 3,
      leads7d: 20,
      leads30d: 80,
      wordpressWidget24h: 2,
      wordpressWidget7d: 14,
      unattributed7d: 0,
      highIntent24h: 0,
    },
    routing: {
      assigned: 15,
      unassigned: 0,
      statusCounts: { new: 5, contacted: 8, qualified: 2, closed: 0 },
      oldestUnassignedAge: null,
    },
    followUpQueue: [],
    syntheticResidues: [],
    integrityWarnings: [],
    // --- fields not used by sentinel but required by type ---
    snapshot: {
      newLeads24h: 3,
      highIntent24h: 0,
      wordpressWidget7d: 14,
      unattributed7d: 0,
    },
    actionPriorityQueue: [],
    trafficPathScorecard: [],
    ...overrides,
  } as unknown as RevenueCommandData;
}

// ---------------------------------------------------------------------------
// Overall status — "ok" when no alerts fire
// ---------------------------------------------------------------------------

describe("overallStatus", () => {
  it("returns ok when all metrics are healthy", () => {
    const result = buildRevenueSentinel(makeData());
    expect(result.overallStatus).toBe("ok");
    expect(result.alerts).toHaveLength(0);
  });

  it("returns critical when any critical alert fires", () => {
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 0,
      },
    });
    const result = buildRevenueSentinel(data);
    expect(result.overallStatus).toBe("critical");
  });

  it("returns warning when only warnings fire (no critical)", () => {
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 5,
      },
    });
    const result = buildRevenueSentinel(data);
    expect(result.overallStatus).toBe("warning");
  });

  it("returns info when only info alerts fire", () => {
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        highIntent24h: 3,
      },
    });
    const result = buildRevenueSentinel(data);
    expect(result.overallStatus).toBe("info");
  });
});

// ---------------------------------------------------------------------------
// Rule 1 — Funnel quiet (24h=0, 7d>0) → warning (not critical)
// ---------------------------------------------------------------------------

describe("Rule 1: funnel quiet", () => {
  it("fires funnel-quiet-24h warning when 24h=0 and 7d>0", () => {
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 8,
      },
    });
    const result = buildRevenueSentinel(data);
    const alert = result.alerts.find((a) => a.id === "funnel-quiet-24h");
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("warning");
  });

  it("does NOT fire funnel-quiet-24h when 24h>0", () => {
    const result = buildRevenueSentinel(makeData());
    expect(result.alerts.find((a) => a.id === "funnel-quiet-24h")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Rule 2 — Funnel dead (both 24h=0, 7d=0) → critical
// ---------------------------------------------------------------------------

describe("Rule 2: funnel dead", () => {
  it("fires funnel-dead-7d critical when both 24h=0 and 7d=0", () => {
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 0,
      },
    });
    const result = buildRevenueSentinel(data);
    const alert = result.alerts.find((a) => a.id === "funnel-dead-7d");
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("critical");
  });

  it("fires funnel-dead-7d but NOT funnel-quiet-24h when both 24h and 7d are zero", () => {
    // Rule 1 (quiet) requires 7d > 0; when 7d = 0, only Rule 2 (dead) fires.
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 0,
      },
    });
    const result = buildRevenueSentinel(data);
    expect(result.alerts.find((a) => a.id === "funnel-dead-7d")).toBeDefined();
    expect(result.alerts.find((a) => a.id === "funnel-quiet-24h")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Rule 3 — Missing attribution → warning
// ---------------------------------------------------------------------------

describe("Rule 3: missing attribution", () => {
  it("fires missing-attribution-7d warning when unattributed7d > 0", () => {
    const data = makeData({
      funnelHealth: { ...makeData().funnelHealth, unattributed7d: 3 },
    });
    const result = buildRevenueSentinel(data);
    const alert = result.alerts.find((a) => a.id === "missing-attribution-7d");
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("warning");
    expect(alert!.value).toBe(3);
  });

  it("does NOT fire when unattributed7d === 0", () => {
    const result = buildRevenueSentinel(makeData());
    expect(result.alerts.find((a) => a.id === "missing-attribution-7d")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Rule 4 — High intent → info
// ---------------------------------------------------------------------------

describe("Rule 4: high intent", () => {
  it("fires high-intent-24h info when highIntent24h > 0", () => {
    const data = makeData({
      funnelHealth: { ...makeData().funnelHealth, highIntent24h: 2 },
    });
    const result = buildRevenueSentinel(data);
    const alert = result.alerts.find((a) => a.id === "high-intent-24h");
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("info");
    expect(alert!.value).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Rule 5 — Synthetic residue → warning
// ---------------------------------------------------------------------------

describe("Rule 5: synthetic residue", () => {
  it("fires synthetic-residue warning when syntheticResidues is non-empty", () => {
    const data = makeData({
      syntheticResidues: [
        { id: "syn-1", email: "test+qa@example.com", createdAt: "2026-06-01T00:00:00Z" },
      ],
    });
    const result = buildRevenueSentinel(data);
    const alert = result.alerts.find((a) => a.id === "synthetic-residue");
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("warning");
    expect(alert!.value).toBe(1);
  });

  it("does NOT fire when syntheticResidues is empty", () => {
    const result = buildRevenueSentinel(makeData());
    expect(result.alerts.find((a) => a.id === "synthetic-residue")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Rule 6 — Unassigned leads → warning
// ---------------------------------------------------------------------------

describe("Rule 6: unassigned leads", () => {
  it("fires unassigned-leads warning when routing.unassigned > 0", () => {
    const data = makeData({
      routing: { ...makeData().routing!, unassigned: 4 },
    });
    const result = buildRevenueSentinel(data);
    const alert = result.alerts.find((a) => a.id === "unassigned-leads");
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("warning");
    expect(alert!.value).toBe(4);
  });

  it("does NOT fire when all leads are assigned", () => {
    const result = buildRevenueSentinel(makeData());
    expect(result.alerts.find((a) => a.id === "unassigned-leads")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Rule 7 — Oldest unassigned >= 24 h → critical
// ---------------------------------------------------------------------------

describe("Rule 7: oldest unassigned >= 24h", () => {
  it("fires oldest-unassigned-24h critical when oldest unassigned is >= 24 h ago", () => {
    // 25 hours ago
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const data = makeData({
      routing: {
        ...makeData().routing!,
        unassigned: 1,
        oldestUnassignedAge: oldDate,
      },
    });
    const result = buildRevenueSentinel(data);
    const alert = result.alerts.find((a) => a.id === "oldest-unassigned-24h");
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("critical");
    expect(typeof alert!.value).toBe("number");
    expect(alert!.value as number).toBeGreaterThanOrEqual(24);
  });

  it("does NOT fire when oldest unassigned is < 24 h ago", () => {
    const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const data = makeData({
      routing: {
        ...makeData().routing!,
        unassigned: 1,
        oldestUnassignedAge: recentDate,
      },
    });
    const result = buildRevenueSentinel(data);
    expect(result.alerts.find((a) => a.id === "oldest-unassigned-24h")).toBeUndefined();
  });

  it("does NOT fire when oldestUnassignedAge is null", () => {
    const result = buildRevenueSentinel(makeData());
    expect(result.alerts.find((a) => a.id === "oldest-unassigned-24h")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Today Action Board
// ---------------------------------------------------------------------------

describe("todayActions", () => {
  function makeLeadEntry(overrides: Record<string, unknown> = {}) {
    return {
      id: `lead-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: "2026-06-16T08:00:00Z",
      firstName: "Test",
      hasEmail: true,
      hasPhone: true,
      utmSource: "ourtownproperties.com",
      utmMedium: "website_widget",
      utmCampaign: "wordpress_widget",
      referrerType: "direct",
      score: 80,
      temperature: "warm",
      assigned: true,
      leadDetailUrl: "/admin/leads/test",
      ...overrides,
    };
  }

  it("includes urgent action items for hot/urgent leads", () => {
    const lead = makeLeadEntry({ temperature: "urgent", id: "hot-1" });
    const data = makeData({ followUpQueue: [lead] as any });
    const result = buildRevenueSentinel(data);
    const action = result.todayActions.find((a) => a.id === "lead-priority-hot-1");
    expect(action).toBeDefined();
    expect(action!.priority).toBe("urgent");
  });

  it("includes high action items for hot leads", () => {
    const lead = makeLeadEntry({ temperature: "hot", id: "hot-2" });
    const data = makeData({ followUpQueue: [lead] as any });
    const result = buildRevenueSentinel(data);
    const action = result.todayActions.find((a) => a.id === "lead-priority-hot-2");
    expect(action).toBeDefined();
    expect(action!.priority).toBe("high");
  });

  it("includes unassigned leads as high priority action", () => {
    const lead = makeLeadEntry({ id: "unassigned-1", assigned: false, temperature: "warm" });
    const data = makeData({ followUpQueue: [lead] as any });
    const result = buildRevenueSentinel(data);
    const action = result.todayActions.find((a) => a.id === "lead-unassigned-unassigned-1");
    expect(action).toBeDefined();
    expect(action!.priority).toBe("high");
  });

  it("caps todayActions at 8 even when many sources fire", () => {
    const urgentLeads = Array.from({ length: 10 }, (_, i) =>
      makeLeadEntry({ temperature: "urgent", id: `urg-${i}` })
    );
    const data = makeData({
      followUpQueue: urgentLeads as any,
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 0,
        unattributed7d: 5,
      },
      syntheticResidues: [{ id: "s1", email: "test@qa.com", createdAt: "2026-06-01T00:00:00Z" }],
    });
    const result = buildRevenueSentinel(data);
    expect(result.todayActions.length).toBeLessThanOrEqual(8);
  });

  it("sorts urgent before high before normal", () => {
    const leads = [
      makeLeadEntry({ temperature: "hot", id: "h1" }),
      makeLeadEntry({ temperature: "urgent", id: "u1" }),
    ];
    const data = makeData({ followUpQueue: leads as any });
    const result = buildRevenueSentinel(data);
    const priorities = result.todayActions.map((a) => a.priority);
    const firstUrgent = priorities.indexOf("urgent");
    const firstHigh = priorities.indexOf("high");
    if (firstUrgent !== -1 && firstHigh !== -1) {
      expect(firstUrgent).toBeLessThan(firstHigh);
    }
  });

  it("includes funnel QA action as urgent when 7d=0", () => {
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 0,
      },
    });
    const result = buildRevenueSentinel(data);
    const action = result.todayActions.find((a) => a.id === "action-funnel-qa");
    expect(action).toBeDefined();
    expect(action!.priority).toBe("urgent");
  });

  it("includes funnel QA action as normal when 7d>0 but 24h=0", () => {
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 5,
      },
    });
    const result = buildRevenueSentinel(data);
    const action = result.todayActions.find((a) => a.id === "action-funnel-qa");
    expect(action).toBeDefined();
    expect(action!.priority).toBe("normal");
  });
});

// ---------------------------------------------------------------------------
// Summary counts
// ---------------------------------------------------------------------------

describe("summary", () => {
  it("counts criticals and warnings correctly", () => {
    const data = makeData({
      funnelHealth: {
        ...makeData().funnelHealth,
        wordpressWidget24h: 0,
        wordpressWidget7d: 0,
        unattributed7d: 2,
      },
    });
    const result = buildRevenueSentinel(data);
    expect(result.summary.criticalCount).toBeGreaterThanOrEqual(1);
    expect(result.summary.warningCount).toBeGreaterThanOrEqual(1);
  });

  it("reflects wordpressWidget24h in summary", () => {
    const data = makeData({
      funnelHealth: { ...makeData().funnelHealth, wordpressWidget24h: 7 },
    });
    const result = buildRevenueSentinel(data);
    expect(result.summary.wordpressWidget24h).toBe(7);
  });

  it("reflects unattributed7d in summary", () => {
    const data = makeData({
      funnelHealth: { ...makeData().funnelHealth, unattributed7d: 4 },
    });
    const result = buildRevenueSentinel(data);
    expect(result.summary.unattributed7d).toBe(4);
  });

  it("sets actionCount = todayActions.length", () => {
    const result = buildRevenueSentinel(makeData());
    expect(result.summary.actionCount).toBe(result.todayActions.length);
  });

  it("preserves generatedAt from input data", () => {
    const result = buildRevenueSentinel(makeData());
    expect(result.generatedAt).toBe("2026-06-16T10:00:00.000Z");
  });
});
