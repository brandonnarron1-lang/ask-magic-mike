/**
 * Tests for src/lib/admin/lead-source-reconciliation.ts
 *
 * All tests operate on in-memory RevenueCommandData fixtures.
 * No database calls. No network calls. No env vars required.
 * No outbound messaging behavior of any kind.
 */

import { describe, expect, it } from "vitest";
import { buildLeadSourceReconciliation } from "@/lib/admin/lead-source-reconciliation";
import type { RevenueCommandData } from "@/lib/admin/revenue-command";

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const DEFAULT_GENERATED_AT = "2026-01-01T12:00:00.000Z";
const NOW_ISO_FRESH = "2026-01-01T12:05:00.000Z";  // 5 min after → fresh
const NOW_ISO_STALE = "2026-01-01T12:20:00.000Z";  // 20 min after → stale

interface DataOverrides {
  funnelHealth?: Partial<RevenueCommandData["funnelHealth"]>;
  sourceAttribution?: RevenueCommandData["sourceAttribution"];
  qualification?: Partial<RevenueCommandData["qualification"]>;
  routing?: RevenueCommandData["routing"];
  followUpQueue?: RevenueCommandData["followUpQueue"];
  attributionIntegrity?: Partial<RevenueCommandData["attributionIntegrity"]>;
  syntheticResidues?: RevenueCommandData["syntheticResidues"];
  generatedAt?: string;
}

function makeData(overrides: DataOverrides = {}): RevenueCommandData {
  const base: RevenueCommandData = {
    funnelHealth: {
      leads24h: 0,
      leads7d: 0,
      leads30d: 0,
      unattributed7d: 0,
      wordpressWidget24h: 0,
      wordpressWidget7d: 0,
      highIntent24h: 0,
    },
    trafficPathScorecard: {
      website_widget:    { leads7d: 0, leads30d: 0, avgScore: null, hotUrgentCount: 0, missingAttribution30d: 0 },
      homepage_cta:      { leads7d: 0, leads30d: 0, avgScore: null, hotUrgentCount: 0, missingAttribution30d: 0 },
      agent_profile_cta: { leads7d: 0, leads30d: 0, avgScore: null, hotUrgentCount: 0, missingAttribution30d: 0 },
      direct_unknown:    { leads7d: 0, leads30d: 0, avgScore: null, hotUrgentCount: 0, missingAttribution30d: 0 },
    },
    sourceAttribution: {
      byReferrerType: {},
      byUtmSource: {},
      byUtmMedium: {},
      byCampaign: {},
    },
    qualification: {
      byTemperature: {},
      byScoreBand: { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 },
      missingScore: 0,
    },
    routing: null,
    followUpQueue: [],
    attributionIntegrity: {
      missingAttribution7d: 0,
      missingReferrerType: 0,
      websiteWidgetCount: 0,
      latestAttributionAt: null,
      latestLeadAt: null,
    },
    syntheticResidues: [],
    pipelineLeads: [],
    generatedAt: DEFAULT_GENERATED_AT,
  };

  return {
    ...base,
    generatedAt: overrides.generatedAt ?? base.generatedAt,
    routing: "routing" in overrides ? (overrides.routing ?? null) : base.routing,
    funnelHealth: { ...base.funnelHealth, ...(overrides.funnelHealth ?? {}) },
    sourceAttribution: overrides.sourceAttribution ?? base.sourceAttribution,
    qualification: { ...base.qualification, ...(overrides.qualification ?? {}) },
    attributionIntegrity: { ...base.attributionIntegrity, ...(overrides.attributionIntegrity ?? {}) },
    syntheticResidues: overrides.syntheticResidues ?? base.syntheticResidues,
    followUpQueue: overrides.followUpQueue ?? base.followUpQueue,
    trafficPathScorecard: base.trafficPathScorecard,
    pipelineLeads: [],
  };
}

function makeSynthetic(id: string, createdAt: string = DEFAULT_GENERATED_AT) {
  return { id, email: `qa+amm-${id}@example.com`, createdAt };
}

function makeQueueLead(
  id: string,
  opts: {
    createdAt?: string;
    temperature?: string | null;
    score?: number | null;
  } = {}
): RevenueCommandData["followUpQueue"][number] {
  return {
    id,
    createdAt: opts.createdAt ?? DEFAULT_GENERATED_AT,
    firstName: "Test",
    hasEmail: true,
    hasPhone: false,
    utmSource: "ourtownproperties",
    utmMedium: "website_widget",
    utmCampaign: "website_widget",
    referrerType: "referral",
    score: opts.score ?? null,
    temperature: opts.temperature ?? null,
    assigned: false,
    grade: null,
    leadType: null,
    leadDetailUrl: `/admin/leads/${id}`,
  };
}

// ---------------------------------------------------------------------------
// 1. Synthetic leads excluded from real counts
// ---------------------------------------------------------------------------

describe("synthetic leads excluded from real counts", () => {
  it("realLeads = totalLeads when no synthetics exist", () => {
    const data = makeData({ funnelHealth: { leads30d: 5 } as RevenueCommandData["funnelHealth"] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.totalLeads).toBe(5);
    expect(r.syntheticLeads).toBe(0);
    expect(r.realLeads).toBe(5);
  });

  it("realLeads subtracts 30d synthetic count from total", () => {
    const recentSynth = new Date(new Date(NOW_ISO_FRESH).getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const data = makeData({
      funnelHealth: { leads30d: 10 } as RevenueCommandData["funnelHealth"],
      syntheticResidues: [
        makeSynthetic("s1", recentSynth),
        makeSynthetic("s2", recentSynth),
        makeSynthetic("s3", recentSynth),
      ],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.totalLeads).toBe(10);
    expect(r.syntheticLeads).toBe(3);
    expect(r.syntheticLeads30d).toBe(3);
    expect(r.realLeads).toBe(7);
  });

  it("syntheticLeads counts all-time residues, syntheticLeads30d only counts recent ones", () => {
    const oldSynth = new Date(new Date(NOW_ISO_FRESH).getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const recentSynth = new Date(new Date(NOW_ISO_FRESH).getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const data = makeData({
      funnelHealth: { leads30d: 3 } as RevenueCommandData["funnelHealth"],
      syntheticResidues: [
        makeSynthetic("old", oldSynth),   // outside 30d
        makeSynthetic("new", recentSynth), // inside 30d
      ],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.syntheticLeads).toBe(2);    // all-time
    expect(r.syntheticLeads30d).toBe(1); // only the recent one
    expect(r.realLeads).toBe(2);          // 3 total - 1 synthetic30d
  });

  it("realLeads is never negative even if syntheticLeads30d > totalLeads", () => {
    const recentSynth = new Date(new Date(NOW_ISO_FRESH).getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const data = makeData({
      funnelHealth: { leads30d: 2 } as RevenueCommandData["funnelHealth"],
      syntheticResidues: [
        makeSynthetic("s1", recentSynth),
        makeSynthetic("s2", recentSynth),
        makeSynthetic("s3", recentSynth),
      ],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.realLeads).toBe(0);
  });

  it("adds warning when all 30d leads are synthetic", () => {
    const recentSynth = new Date(new Date(NOW_ISO_FRESH).getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const data = makeData({
      funnelHealth: { leads30d: 2 } as RevenueCommandData["funnelHealth"],
      syntheticResidues: [
        makeSynthetic("s1", recentSynth),
        makeSynthetic("s2", recentSynth),
      ],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.warnings.some((w) => w.includes("synthetic/test"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Latest synthetic does not become latest real
// ---------------------------------------------------------------------------

describe("latestSyntheticLeadAt and latestRealLeadAt are independent", () => {
  it("latestRealLeadAt comes from followUpQueue, not syntheticResidues", () => {
    const realAt = "2026-01-01T11:00:00.000Z";
    const synthAt = "2026-01-01T11:30:00.000Z"; // newer than real

    const data = makeData({
      syntheticResidues: [makeSynthetic("s1", synthAt)],
      followUpQueue: [makeQueueLead("r1", { createdAt: realAt })],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.latestRealLeadAt).toBe(realAt);
    expect(r.latestSyntheticLeadAt).toBe(synthAt);
    // synthetic is newer but must NOT contaminate latestRealLeadAt
    expect(r.latestRealLeadAt).not.toBe(synthAt);
  });

  it("latestRealLeadAt is null when followUpQueue is empty", () => {
    const data = makeData({ followUpQueue: [] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.latestRealLeadAt).toBeNull();
  });

  it("latestSyntheticLeadAt is null when no synthetic residues", () => {
    const data = makeData({ syntheticResidues: [] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.latestSyntheticLeadAt).toBeNull();
  });

  it("latestSyntheticLeadAt is the max createdAt across all synthetic residues", () => {
    const early = "2026-01-01T08:00:00.000Z";
    const late  = "2026-01-01T10:00:00.000Z";
    const mid   = "2026-01-01T09:00:00.000Z";
    const data = makeData({
      syntheticResidues: [
        makeSynthetic("s1", early),
        makeSynthetic("s2", late),
        makeSynthetic("s3", mid),
      ],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.latestSyntheticLeadAt).toBe(late);
  });
});

// ---------------------------------------------------------------------------
// 3. website_widget attribution counts correctly
// ---------------------------------------------------------------------------

describe("website_widget attribution", () => {
  it("websiteWidgetLeads24h mirrors funnelHealth.wordpressWidget24h", () => {
    const data = makeData({ funnelHealth: { wordpressWidget24h: 3 } as RevenueCommandData["funnelHealth"] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.websiteWidgetLeads24h).toBe(3);
  });

  it("websiteWidgetLeads7d mirrors funnelHealth.wordpressWidget7d", () => {
    const data = makeData({ funnelHealth: { wordpressWidget7d: 7 } as RevenueCommandData["funnelHealth"] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.websiteWidgetLeads7d).toBe(7);
  });

  it("wordpressAttributedLeads7d equals websiteWidgetLeads7d", () => {
    const data = makeData({ funnelHealth: { wordpressWidget7d: 4 } as RevenueCommandData["funnelHealth"] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.wordpressAttributedLeads7d).toBe(r.websiteWidgetLeads7d);
    expect(r.wordpressAttributedLeads7d).toBe(4);
  });

  it("sourceBreakdown reflects sourceAttribution.byCampaign", () => {
    const data = makeData({
      sourceAttribution: {
        byReferrerType: {},
        byUtmSource: {},
        byUtmMedium: {},
        byCampaign: { website_widget: 5, spring_push: 2 },
      },
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.sourceBreakdown["website_widget"]).toBe(5);
    expect(r.sourceBreakdown["spring_push"]).toBe(2);
  });

  it("sourceBreakdown is an empty object when no attribution exists", () => {
    const data = makeData();
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.sourceBreakdown).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// 4. Missing attribution creates warning
// ---------------------------------------------------------------------------

describe("unattributed leads warning", () => {
  it("adds warning when unattributed7d > 0", () => {
    const data = makeData({
      funnelHealth: { unattributed7d: 3, leads30d: 5 } as RevenueCommandData["funnelHealth"],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    const hasWarning = r.warnings.some((w) =>
      w.includes("missing source attribution") || w.includes("unattributed")
    );
    expect(hasWarning).toBe(true);
  });

  it("does not add unattributed warning when unattributed7d is 0", () => {
    const data = makeData({ funnelHealth: { unattributed7d: 0 } as RevenueCommandData["funnelHealth"] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.warnings.some((w) => w.includes("missing source attribution"))).toBe(false);
  });

  it("unattributedLeads7d mirrors funnelHealth.unattributed7d", () => {
    const data = makeData({ funnelHealth: { unattributed7d: 6 } as RevenueCommandData["funnelHealth"] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.unattributedLeads7d).toBe(6);
  });

  it("no-widget warning includes phrase about pipeline being verified", () => {
    const data = makeData({
      funnelHealth: {
        leads30d: 2,
        wordpressWidget7d: 0,
      } as RevenueCommandData["funnelHealth"],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    const warnText = r.warnings.join(" ");
    expect(warnText.toLowerCase()).toMatch(/pipeline.*verified|verified.*pipeline/);
  });
});

// ---------------------------------------------------------------------------
// 5. Freshness status with empty or missing data
// ---------------------------------------------------------------------------

describe("dataFreshnessStatus", () => {
  it("returns fresh when generatedAt is within threshold", () => {
    const data = makeData({ generatedAt: DEFAULT_GENERATED_AT });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH); // 5 min later
    expect(r.dataFreshnessStatus).toBe("fresh");
    expect(r.stalenessMinutes).toBe(5);
  });

  it("returns stale when generatedAt is beyond threshold", () => {
    const data = makeData({ generatedAt: DEFAULT_GENERATED_AT });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_STALE); // 20 min later
    expect(r.dataFreshnessStatus).toBe("stale");
    expect(r.stalenessMinutes).toBe(20);
  });

  it("returns unknown when generatedAt is empty string", () => {
    const data = makeData({ generatedAt: "" });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.dataFreshnessStatus).toBe("unknown");
    expect(r.stalenessMinutes).toBeNull();
  });

  it("returns unknown when generatedAt is invalid date string", () => {
    const data = makeData({ generatedAt: "not-a-date" });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.dataFreshnessStatus).toBe("unknown");
    expect(r.stalenessMinutes).toBeNull();
  });

  it("adds stale warning when status is stale", () => {
    const data = makeData({ generatedAt: DEFAULT_GENERATED_AT });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_STALE);
    expect(r.warnings.some((w) => w.includes("old") || w.includes("stale"))).toBe(true);
  });

  it("does not add stale warning when status is fresh", () => {
    const data = makeData({ generatedAt: DEFAULT_GENERATED_AT });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.warnings.some((w) => w.includes("stale"))).toBe(false);
  });

  it("does not add stale warning when status is unknown", () => {
    const data = makeData({ generatedAt: "" });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.warnings.some((w) => w.includes("stale"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. recommendedNextAction changes based on state
// ---------------------------------------------------------------------------

describe("recommendedNextAction state transitions", () => {
  it("recommends reload when snapshot is stale", () => {
    const data = makeData({ generatedAt: DEFAULT_GENERATED_AT });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_STALE);
    expect(r.recommendedNextAction.toLowerCase()).toMatch(/reload|stale/);
  });

  it("recommends follow-up when high-intent leads are in queue", () => {
    const data = makeData({
      followUpQueue: [
        makeQueueLead("r1", { temperature: "urgent" }),
        makeQueueLead("r2", { temperature: "hot" }),
      ],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.recommendedNextAction.toLowerCase()).toMatch(/follow.?up|high.?intent/);
  });

  it("recommends funnel investigation when unattributed > 0 and no high-intent leads", () => {
    const data = makeData({
      funnelHealth: { unattributed7d: 3 } as RevenueCommandData["funnelHealth"],
      followUpQueue: [makeQueueLead("r1", { temperature: "warm" })],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.recommendedNextAction.toLowerCase()).toMatch(/unattributed|funnel|verify/);
  });

  it("recommends assigning when routing unassigned > 0 and no high-intent or unattributed", () => {
    const data = makeData({
      routing: { assigned: 2, unassigned: 3, statusCounts: {}, oldestUnassignedAge: null },
      followUpQueue: [],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.recommendedNextAction.toLowerCase()).toMatch(/assign/);
  });

  it("recommends pipeline-verified message when only synthetic leads exist", () => {
    const recentSynth = new Date(new Date(NOW_ISO_FRESH).getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const data = makeData({
      funnelHealth: { leads30d: 1 } as RevenueCommandData["funnelHealth"],
      syntheticResidues: [makeSynthetic("s1", recentSynth)],
      followUpQueue: [], // empty because all leads are synthetic
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.recommendedNextAction.toLowerCase()).toMatch(/synthetic|test|pipeline.*verified|verified.*pipeline/);
  });

  it("returns no-action message when everything is clean", () => {
    const data = makeData();
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r.recommendedNextAction.toLowerCase()).toMatch(/no.*action|review weekly/);
  });
});

// ---------------------------------------------------------------------------
// 7. No outbound messaging behavior
// ---------------------------------------------------------------------------

describe("no outbound messaging", () => {
  it("never includes any email/SMS/call instruction in output", () => {
    const data = makeData({
      funnelHealth: { leads30d: 5, wordpressWidget7d: 2 } as RevenueCommandData["funnelHealth"],
      followUpQueue: [makeQueueLead("r1", { temperature: "urgent" })],
      syntheticResidues: [makeSynthetic("s1")],
    });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    const allText = [
      r.recommendedNextAction,
      ...r.warnings,
    ].join(" ").toLowerCase();

    expect(allText).not.toMatch(/send email/);
    expect(allText).not.toMatch(/send sms/);
    expect(allText).not.toMatch(/make a call/);
    expect(allText).not.toMatch(/dial/);
    expect(allText).not.toMatch(/text message/);
    expect(allText).not.toMatch(/outbound/);
  });

  it("warns not to contact synthetic leads", () => {
    const data = makeData({ syntheticResidues: [makeSynthetic("s1")] });
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    const text = r.warnings.join(" ").toLowerCase();
    expect(text).toMatch(/do not contact/);
  });
});

// ---------------------------------------------------------------------------
// 8. Output shape
// ---------------------------------------------------------------------------

describe("output shape", () => {
  it("returns all required fields", () => {
    const data = makeData();
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(r).toHaveProperty("totalLeads");
    expect(r).toHaveProperty("syntheticLeads");
    expect(r).toHaveProperty("syntheticLeads30d");
    expect(r).toHaveProperty("realLeads");
    expect(r).toHaveProperty("latestLeadAt");
    expect(r).toHaveProperty("latestRealLeadAt");
    expect(r).toHaveProperty("latestSyntheticLeadAt");
    expect(r).toHaveProperty("websiteWidgetLeads24h");
    expect(r).toHaveProperty("websiteWidgetLeads7d");
    expect(r).toHaveProperty("unattributedLeads7d");
    expect(r).toHaveProperty("wordpressAttributedLeads7d");
    expect(r).toHaveProperty("sourceBreakdown");
    expect(r).toHaveProperty("dataFreshnessStatus");
    expect(r).toHaveProperty("stalenessMinutes");
    expect(r).toHaveProperty("warnings");
    expect(r).toHaveProperty("recommendedNextAction");
  });

  it("warnings is always an array", () => {
    const data = makeData();
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("recommendedNextAction is always a non-empty string", () => {
    const data = makeData();
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(typeof r.recommendedNextAction).toBe("string");
    expect(r.recommendedNextAction.length).toBeGreaterThan(0);
  });

  it("dataFreshnessStatus is one of fresh | stale | unknown", () => {
    const data = makeData();
    const r = buildLeadSourceReconciliation(data, NOW_ISO_FRESH);
    expect(["fresh", "stale", "unknown"]).toContain(r.dataFreshnessStatus);
  });
});
