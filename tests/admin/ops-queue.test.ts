/**
 * Tests for src/lib/admin/ops-queue.ts
 */
import { describe, expect, it } from "vitest";
import { buildOpsQueue, groupOpsQueue } from "@/lib/admin/ops-queue";
import type { OpsQueueItem } from "@/lib/admin/ops-queue";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FQLead = Parameters<typeof buildOpsQueue>[0][number];

function makeLead(overrides: Partial<FQLead> & { id: string }): FQLead {
  const createdAt = overrides.createdAt ?? new Date(Date.now() - 30 * 60_000).toISOString();
  // Use "key in overrides" so that explicit null values (e.g. utmSource: null) are preserved
  // rather than falling through to the default via ??.
  return {
    id:            overrides.id,
    createdAt,
    firstName:     "firstName"    in overrides ? overrides.firstName!    : "TestLead",
    hasEmail:      "hasEmail"     in overrides ? overrides.hasEmail!     : true,
    hasPhone:      "hasPhone"     in overrides ? overrides.hasPhone!     : true,
    utmSource:     "utmSource"    in overrides ? overrides.utmSource     : "facebook",
    utmMedium:     "utmMedium"    in overrides ? overrides.utmMedium     : "social",
    utmCampaign:   "utmCampaign"  in overrides ? overrides.utmCampaign   : "june-push",
    referrerType:  "referrerType" in overrides ? overrides.referrerType  : "social",
    score:         "score"        in overrides ? overrides.score         : 55,
    temperature:   "temperature"  in overrides ? overrides.temperature   : "warm",
    assigned:      "assigned"     in overrides ? overrides.assigned!     : true,
    grade:         "grade"        in overrides ? overrides.grade         : "B",
    leadType:      "leadType"     in overrides ? overrides.leadType      : "buyer",
    leadDetailUrl: overrides.leadDetailUrl ?? `/admin/leads/${overrides.id}`,
  };
}

function oldTimestamp(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Priority ordering
// ---------------------------------------------------------------------------

describe("buildOpsQueue — priority ordering", () => {
  it("sorts urgent leads before hot leads", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "hot-1",    temperature: "hot",    assigned: false }),
      makeLead({ id: "urgent-1", temperature: "urgent", assigned: true  }),
    ]);
    expect(queue[0].id).toBe("urgent-1");
    expect(queue[1].id).toBe("hot-1");
  });

  it("sorts hot+unassigned before warm leads", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "warm-1",  temperature: "warm", assigned: true  }),
      makeLead({ id: "hot-un",  temperature: "hot",  assigned: false }),
    ]);
    expect(queue[0].id).toBe("hot-un");
  });

  it("puts priority-1 items before priority-2 items before priority-5", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "p5",     temperature: "warm", assigned: true }),
      makeLead({ id: "p2",     temperature: "hot",  assigned: false }),
      makeLead({ id: "p1",     temperature: "urgent" }),
    ]);
    expect(queue[0].priority).toBe(1);
    expect(queue[1].priority).toBe(2);
    expect(queue[2].priority).toBe(5);
  });

  it("within same priority, older leads come first", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "newer", temperature: "urgent", createdAt: oldTimestamp(1) }),
      makeLead({ id: "older", temperature: "urgent", createdAt: oldTimestamp(4) }),
    ]);
    expect(queue[0].id).toBe("older");
  });
});

// ---------------------------------------------------------------------------
// SLA breach detection
// ---------------------------------------------------------------------------

describe("buildOpsQueue — SLA breach (urgent + old)", () => {
  it("classifies urgent lead older than 2h as sla_breach", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "sla-breach", temperature: "urgent", createdAt: oldTimestamp(3) }),
    ]);
    expect(queue[0].category).toBe("sla_breach");
    expect(queue[0].urgencyLabel).toBe("SLA BREACH");
  });

  it("classifies urgent lead < 2h as urgent (not sla_breach)", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "fresh-urgent", temperature: "urgent", createdAt: oldTimestamp(1) }),
    ]);
    expect(queue[0].category).toBe("urgent");
  });
});

// ---------------------------------------------------------------------------
// Hot + unassigned
// ---------------------------------------------------------------------------

describe("buildOpsQueue — hot unassigned", () => {
  it("puts A-grade unassigned lead at priority 2", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "a-grade", grade: "A", assigned: false, temperature: "warm" }),
    ]);
    expect(queue[0].priority).toBe(2);
    expect(queue[0].category).toBe("hot_unassigned");
  });

  it("puts A+-grade unassigned lead at priority 2", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "a-plus", grade: "A+", assigned: false, temperature: "warm" }),
    ]);
    expect(queue[0].priority).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Missing attribution
// ---------------------------------------------------------------------------

describe("buildOpsQueue — missing attribution", () => {
  it("detects lead with no utm or referrer as missingAttribution", () => {
    const queue = buildOpsQueue([
      makeLead({
        id: "no-attr",
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        referrerType: null,
        temperature: "warm",
        assigned: true,
      }),
    ]);
    expect(queue[0].missingAttribution).toBe(true);
    expect(queue[0].category).toBe("missing_attribution");
  });

  it("does NOT flag lead with only referrerType as missingAttribution", () => {
    const queue = buildOpsQueue([
      makeLead({
        id: "has-ref",
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        referrerType: "direct",
        temperature: "warm",
        assigned: true,
      }),
    ]);
    expect(queue[0].missingAttribution).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Incomplete contact info
// ---------------------------------------------------------------------------

describe("buildOpsQueue — incomplete contact", () => {
  it("classifies lead with no email and no phone as incomplete_contact", () => {
    const queue = buildOpsQueue([
      makeLead({
        id: "no-contact",
        hasEmail: false,
        hasPhone: false,
        temperature: "warm",
        assigned: true,
      }),
    ]);
    expect(queue[0].category).toBe("incomplete_contact");
    expect(queue[0].urgencyLabel).toBe("INCOMPLETE CONTACT");
  });

  it("does NOT flag lead with email but no phone as incomplete_contact", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "has-email", hasEmail: true, hasPhone: false, temperature: "warm" }),
    ]);
    expect(queue[0].category).not.toBe("incomplete_contact");
  });
});

// ---------------------------------------------------------------------------
// Synthetic exclusion
// ---------------------------------------------------------------------------

describe("buildOpsQueue — synthetic exclusion", () => {
  it("accepts already-filtered followUpQueue without re-applying synthetic checks", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "real-1", temperature: "hot" }),
      makeLead({ id: "real-2", temperature: "warm" }),
    ]);
    expect(queue).toHaveLength(2);
  });

  it("returns empty queue for empty input", () => {
    const queue = buildOpsQueue([]);
    expect(queue).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// OpsQueueItem shape
// ---------------------------------------------------------------------------

describe("buildOpsQueue — item shape", () => {
  it("all items have required fields", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "shape-test", temperature: "hot", assigned: false }),
    ]);
    const item = queue[0];
    expect(item.id).toBeTruthy();
    expect([1, 2, 3, 4, 5]).toContain(item.priority);
    expect(item.category).toBeTruthy();
    expect(item.urgencyLabel).toBeTruthy();
    expect(item.leadLabel).toBeTruthy();
    expect(item.ageLabel).toBeTruthy();
    expect(item.detailUrl).toBeTruthy();
  });

  it("ageLabel formats recent lead as Xm ago", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "recent", createdAt: new Date(Date.now() - 5 * 60_000).toISOString() }),
    ]);
    expect(queue[0].ageLabel).toMatch(/^\d+m ago$/);
  });

  it("ageLabel formats old lead in days", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "old-1", createdAt: oldTimestamp(48) }),
    ]);
    expect(queue[0].ageLabel).toMatch(/^\d+d ago$/);
  });

  it("no PII (email/phone) appears in urgencyLabel or leadLabel", () => {
    const queue = buildOpsQueue([
      makeLead({ id: "pii-check", firstName: "John" }),
    ]);
    for (const item of queue) {
      expect(item.urgencyLabel).not.toMatch(/@\w+\.\w+/);
      expect(item.leadLabel).not.toMatch(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/);
    }
  });
});

// ---------------------------------------------------------------------------
// groupOpsQueue
// ---------------------------------------------------------------------------

describe("groupOpsQueue", () => {
  it("groups items by priority", () => {
    const items: OpsQueueItem[] = [
      { id: "a", priority: 1, category: "urgent", urgencyLabel: "URGENT", leadLabel: "A", ageLabel: "5m ago", ageMinutes: 5, temperature: "urgent", score: null, grade: null, hasEmail: true, hasPhone: true, assigned: true, missingAttribution: false, detailUrl: "/admin/leads/a" },
      { id: "b", priority: 2, category: "hot_unassigned", urgencyLabel: "HOT", leadLabel: "B", ageLabel: "10m ago", ageMinutes: 10, temperature: "hot", score: null, grade: null, hasEmail: true, hasPhone: true, assigned: false, missingAttribution: false, detailUrl: "/admin/leads/b" },
      { id: "c", priority: 1, category: "sla_breach", urgencyLabel: "SLA BREACH", leadLabel: "C", ageLabel: "3h ago", ageMinutes: 180, temperature: "urgent", score: null, grade: null, hasEmail: true, hasPhone: true, assigned: true, missingAttribution: false, detailUrl: "/admin/leads/c" },
    ];
    const groups = groupOpsQueue(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].priority).toBe(1);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].priority).toBe(2);
    expect(groups[1].items).toHaveLength(1);
  });

  it("groups are sorted ascending by priority", () => {
    const items: OpsQueueItem[] = [
      { id: "x", priority: 5, category: "follow_up_due", urgencyLabel: "FOLLOW-UP DUE", leadLabel: "X", ageLabel: "1d ago", ageMinutes: 1440, temperature: "warm", score: 40, grade: "C", hasEmail: true, hasPhone: false, assigned: true, missingAttribution: false, detailUrl: "/admin/leads/x" },
      { id: "y", priority: 2, category: "hot_unassigned", urgencyLabel: "HOT", leadLabel: "Y", ageLabel: "2h ago", ageMinutes: 120, temperature: "hot", score: 80, grade: "A", hasEmail: true, hasPhone: true, assigned: false, missingAttribution: false, detailUrl: "/admin/leads/y" },
    ];
    const groups = groupOpsQueue(items);
    expect(groups[0].priority).toBeLessThan(groups[1].priority);
  });

  it("returns empty array for empty input", () => {
    expect(groupOpsQueue([])).toHaveLength(0);
  });

  it("assigns human-readable labels to priority groups", () => {
    const item: OpsQueueItem = { id: "z", priority: 1, category: "urgent", urgencyLabel: "URGENT", leadLabel: "Z", ageLabel: "5m ago", ageMinutes: 5, temperature: "urgent", score: null, grade: null, hasEmail: true, hasPhone: true, assigned: true, missingAttribution: false, detailUrl: "/admin/leads/z" };
    const groups = groupOpsQueue([item]);
    expect(groups[0].label).toBe("Immediate Action");
  });
});
