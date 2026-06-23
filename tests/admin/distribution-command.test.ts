/**
 * Tests for src/lib/admin/distribution-command.ts
 */
import { describe, expect, it } from "vitest";
import { buildDistributionCommand } from "@/lib/admin/distribution-command";
import type { TrafficCommandData } from "@/lib/admin/traffic-command";
import type { SourceRollupSummary } from "@/lib/admin/source-attribution-rollup";
import { buildSourceRollup } from "@/lib/admin/source-attribution-rollup";
import { buildQuestionIntelligence } from "@/lib/admin/question-intelligence";
import { buildContentOpportunities } from "@/lib/admin/content-opportunity";
import { buildMarketHeatmap } from "@/lib/admin/market-heatmap";
import { buildViralPostSet } from "@/lib/admin/viral-post-builder";

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------

function makeTrafficData(opts: {
  attrRows?: Array<{ utm_source: string | null; utm_medium: string | null; referrer_type: string | null; is_paid: boolean | null }>;
  questionRows?: Array<{ question_raw: string | null; utm_source?: string | null }>;
  heatmapRows?: Array<{ primary_intent: string | null; lead_type: string | null; cta_chip_used: string | null; question_raw: string | null; utm_source: string | null; referrer_type: string | null }>;
  leads7d?: number;
  sessions7d?: number;
} = {}): TrafficCommandData {
  const attrRows = opts.attrRows ?? [];
  const questionRows = opts.questionRows ?? [];
  const heatmapRows = opts.heatmapRows ?? [];

  const sourceRollup = buildSourceRollup(attrRows);
  const questionIntel = buildQuestionIntelligence(questionRows, 10);
  const contentOpportunities = buildContentOpportunities(questionIntel, sourceRollup, 25);
  const marketHeatmap = buildMarketHeatmap(heatmapRows);
  const viralPosts = buildViralPostSet(null, null);

  return {
    summary: {
      sessions24h: 0,
      sessions7d:  opts.sessions7d ?? 0,
      returning7d: 0,
      leads24h:    0,
      leads7d:     opts.leads7d ?? 0,
      leads30d:    0,
      highIntent24h: 0,
      unattributed7d: 0,
      widgetLeads7d: 0,
      widgetLeads24h: 0,
      synthetic7d: 0,
      topSource:      sourceRollup.topPlatform,
      topCampaign:    null,
      topLandingPage: null,
      topQuestion:    null,
      conversionRate: null,
    },
    sourceRollup,
    questionIntel,
    contentOpportunities,
    viralPosts,
    marketHeatmap,
    socialPreviewStatus: "blocked" as const,
    generatedAt: "2026-06-23T00:00:00.000Z",
  };
}

function makeFbAttrRow() {
  return { utm_source: "facebook", utm_medium: "social_organic", referrer_type: null, is_paid: false };
}

function makeLinkedInAttrRow() {
  return { utm_source: "linkedin", utm_medium: "social_organic", referrer_type: null, is_paid: false };
}

// ---------------------------------------------------------------------------
// distributionHealth
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > distributionHealth", () => {
  it("is 'empty' when no platforms have attribution traffic", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.distributionHealth).toBe("empty");
  });

  it("is 'partial' when 1-2 platforms have traffic", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [makeFbAttrRow(), makeFbAttrRow()],
    }));
    expect(r.distributionHealth).toBe("partial");
  });

  it("is 'active' when 3+ platforms have traffic", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [
        makeFbAttrRow(),
        makeFbAttrRow(),
        makeLinkedInAttrRow(),
        { utm_source: "instagram", utm_medium: "social_organic", referrer_type: null, is_paid: false },
      ],
    }));
    expect(r.distributionHealth).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// publishingCounts
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > publishingCounts", () => {
  it("draftIdeas matches contentOpportunities count (up to 25)", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.publishingCounts.draftIdeas).toBe(25);
  });

  it("publishedPlatforms is 0 when no attribution traffic", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.publishingCounts.publishedPlatforms).toBe(0);
  });

  it("publishedPlatforms counts platforms with attribution traffic > 0", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [makeFbAttrRow(), makeLinkedInAttrRow()],
    }));
    expect(r.publishingCounts.publishedPlatforms).toBe(2);
  });

  it("readyToPublish counts high-intent opportunities (score >= 80)", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.publishingCounts.readyToPublish).toBeGreaterThan(0);
    expect(r.publishingCounts.readyToPublish).toBeLessThanOrEqual(25);
  });

  it("needsRefresh is 0 when no platforms have traffic", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.publishingCounts.needsRefresh).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// platformCoverageMatrix
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > platformCoverageMatrix", () => {
  it("returns 6 rows — one per tracked platform", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.platformCoverageMatrix).toHaveLength(6);
  });

  it("all rows have drafted=true (templates always exist)", () => {
    const r = buildDistributionCommand(makeTrafficData());
    for (const row of r.platformCoverageMatrix) {
      expect(row.drafted).toBe(true);
    }
  });

  it("rows with no traffic have gap=true", () => {
    const r = buildDistributionCommand(makeTrafficData());
    for (const row of r.platformCoverageMatrix) {
      expect(row.gap).toBe(true);
    }
  });

  it("Facebook row has traffic when Facebook attribution rows present", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [makeFbAttrRow(), makeFbAttrRow(), makeFbAttrRow()],
    }));
    const fbRow = r.platformCoverageMatrix.find((row) => row.platform === "Facebook");
    expect(fbRow?.traffic7d).toBe(3);
    expect(fbRow?.hasPublishedContent).toBe(true);
    expect(fbRow?.gap).toBe(false);
  });

  it("platforms with traffic and 0 leads have conversionPct=0", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [makeFbAttrRow()],
    }));
    const fbRow = r.platformCoverageMatrix.find((row) => row.platform === "Facebook");
    expect(fbRow?.conversionPct).toBe(0);
  });

  it("platforms with no traffic have conversionPct=null", () => {
    const r = buildDistributionCommand(makeTrafficData());
    const fbRow = r.platformCoverageMatrix.find((row) => row.platform === "Facebook");
    expect(fbRow?.conversionPct).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// priorityQueue
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > priorityQueue", () => {
  it("returns up to 25 queued posts", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.priorityQueue.length).toBeLessThanOrEqual(25);
    expect(r.priorityQueue.length).toBeGreaterThan(0);
  });

  it("posts with intentScore >= 85 have status high_priority", () => {
    const r = buildDistributionCommand(makeTrafficData());
    const highPriority = r.priorityQueue.filter((p) => p.status === "high_priority");
    for (const p of highPriority) {
      expect(p.intentScore).toBeGreaterThanOrEqual(85);
    }
  });

  it("each queued post has a recommendedPlatform", () => {
    const r = buildDistributionCommand(makeTrafficData());
    for (const p of r.priorityQueue) {
      expect(p.recommendedPlatform).toBeTruthy();
    }
  });

  it("ranks start at 1", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.priorityQueue[0].rank).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// trafficByPlatform
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > trafficByPlatform", () => {
  it("is empty when no attribution data", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.trafficByPlatform).toHaveLength(0);
  });

  it("includes only platforms with traffic or leads", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [makeFbAttrRow(), makeFbAttrRow()],
    }));
    expect(r.trafficByPlatform.some((p) => p.platform === "Facebook")).toBe(true);
    expect(r.trafficByPlatform.some((p) => p.platform === "LinkedIn")).toBe(false);
  });

  it("Facebook traffic7d matches attribution row count", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [makeFbAttrRow(), makeFbAttrRow(), makeFbAttrRow()],
    }));
    const fb = r.trafficByPlatform.find((p) => p.platform === "Facebook");
    expect(fb?.traffic7d).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// stalePlatforms
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > stalePlatforms", () => {
  it("is empty when no platforms have traffic", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.stalePlatforms).toHaveLength(0);
  });

  it("flags platform with traffic >= 3 and leads = 0 as stale", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [makeFbAttrRow(), makeFbAttrRow(), makeFbAttrRow()],
    }));
    const fb = r.stalePlatforms.find((p) => p.platform === "Facebook");
    expect(fb).toBeDefined();
    expect(fb?.reason).toContain("0 leads");
  });

  it("does NOT flag platform with only 1-2 sessions as stale (below threshold)", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: [makeFbAttrRow(), makeFbAttrRow()], // only 2 — below threshold of 3
    }));
    const fb = r.stalePlatforms.find((p) => p.platform === "Facebook");
    expect(fb).toBeUndefined();
  });

  it("stale items have recommendation text", () => {
    const r = buildDistributionCommand(makeTrafficData({
      attrRows: Array.from({ length: 5 }, () => makeFbAttrRow()),
    }));
    for (const item of r.stalePlatforms) {
      expect(item.recommendation).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// weeklyPublishingPlan
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > weeklyPublishingPlan", () => {
  it("returns exactly 5 days", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.weeklyPublishingPlan).toHaveLength(5);
  });

  it("covers Monday through Friday", () => {
    const r = buildDistributionCommand(makeTrafficData());
    const days = r.weeklyPublishingPlan.map((p) => p.day);
    expect(days).toContain("Monday");
    expect(days).toContain("Tuesday");
    expect(days).toContain("Wednesday");
    expect(days).toContain("Thursday");
    expect(days).toContain("Friday");
  });

  it("each day has a topic, platform, and goal", () => {
    const r = buildDistributionCommand(makeTrafficData());
    for (const day of r.weeklyPublishingPlan) {
      expect(day.topic).toBeTruthy();
      expect(day.platform).toBeTruthy();
      expect(day.goal).toBeTruthy();
    }
  });

  it("Monday is Facebook", () => {
    const r = buildDistributionCommand(makeTrafficData());
    const monday = r.weeklyPublishingPlan.find((p) => p.day === "Monday");
    expect(monday?.platform).toBe("Facebook");
  });

  it("Wednesday is LinkedIn", () => {
    const r = buildDistributionCommand(makeTrafficData());
    const wednesday = r.weeklyPublishingPlan.find((p) => p.day === "Wednesday");
    expect(wednesday?.platform).toBe("LinkedIn");
  });
});

// ---------------------------------------------------------------------------
// nextPublishingActions
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > nextPublishingActions", () => {
  it("has at least 1 action when distribution is empty", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.nextPublishingActions.length).toBeGreaterThan(0);
  });

  it("first action mentions AMM links when no traffic exists", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.nextPublishingActions[0].toLowerCase()).toContain("amm");
  });
});

// ---------------------------------------------------------------------------
// executiveSummary
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > executiveSummary", () => {
  it("whatHappened mentions 0 leads when no data", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.executiveSummary.whatHappened.toLowerCase()).toContain("no leads");
  });

  it("whatHappened includes lead count when leads exist", () => {
    const r = buildDistributionCommand(makeTrafficData({ leads7d: 5, sessions7d: 50 }));
    expect(r.executiveSummary.whatHappened).toContain("5");
  });

  it("nextPost suggests a specific content title and platform", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.executiveSummary.nextPost).toBeTruthy();
    expect(r.executiveSummary.nextPost.length).toBeGreaterThan(10);
  });

  it("whatWorked is null when no platform has leads", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.executiveSummary.whatWorked).toBeNull();
  });

  it("whatFailed is null when no stale platforms", () => {
    const r = buildDistributionCommand(makeTrafficData());
    expect(r.executiveSummary.whatFailed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Safety — no outbound / no mutations
// ---------------------------------------------------------------------------

describe("buildDistributionCommand > safety", () => {
  it("returns plain data — no function values on result", () => {
    const r = buildDistributionCommand(makeTrafficData());
    const asMap = r as unknown as Record<string, unknown>;
    const fnKeys = Object.keys(r).filter((k) => typeof asMap[k] === "function");
    expect(fnKeys).toHaveLength(0);
  });

  it("calling twice produces consistent results", () => {
    const data = makeTrafficData();
    const r1 = buildDistributionCommand(data);
    const r2 = buildDistributionCommand(data);
    expect(r1.distributionHealth).toBe(r2.distributionHealth);
    expect(r1.platformCoverageMatrix.length).toBe(r2.platformCoverageMatrix.length);
    expect(r1.weeklyPublishingPlan.length).toBe(r2.weeklyPublishingPlan.length);
  });
});
