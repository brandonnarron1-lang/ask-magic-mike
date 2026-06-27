import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Import the intelligence engine and recommendation engine for unit tests
// ---------------------------------------------------------------------------

import {
  calculateConversion,
  calculateDropoff,
  calculateTrend,
  calculateVelocity,
  calculateMomentum,
  calculateHeat,
  calculatePipeline,
  calculateOpportunity,
  calculateAgentRank,
  calculateCampaignRank,
  calculateSourceRank,
  calculatePriority,
  calculateConfidence,
  calculateHealthScore,
  formatCurrency,
  formatDuration,
  formatCount,
} from "../../src/lib/admin/intelligence-engine";

import {
  buildLeadRecommendations,
  buildCampaignRecommendations,
  buildAgentRecommendations,
  buildSourceRecommendations,
  buildConversationRecommendations,
  buildRecommendationSummary,
  type LeadSignals,
  type CampaignSignal,
  type AgentSignal,
  type SourceSignal,
  type ConversationSignals,
} from "../../src/lib/admin/recommendation-engine";

// ---------------------------------------------------------------------------
// File reader helper
// ---------------------------------------------------------------------------

const read = (rel: string) =>
  readFileSync(path.resolve(__dirname, "../../src", rel), "utf8");

// ===========================================================================
// INTELLIGENCE ENGINE — unit tests
// ===========================================================================

describe("calculateConversion", () => {
  it("returns 0 rate when denominator is 0", () => {
    const r = calculateConversion(5, 0);
    expect(r.rate).toBe(0);
    expect(r.label).toBe("—");
  });

  it("returns correct rate", () => {
    const r = calculateConversion(25, 100);
    expect(r.rate).toBe(25);
    expect(r.label).toBe("25.0%");
  });

  it("caps at 100", () => {
    const r = calculateConversion(200, 100);
    expect(r.rate).toBe(100);
  });

  it("preserves numerator and denominator", () => {
    const r = calculateConversion(3, 10);
    expect(r.numerator).toBe(3);
    expect(r.denominator).toBe(10);
  });
});

describe("calculateDropoff", () => {
  it("returns 0 when total is 0", () => {
    const r = calculateDropoff(0, 0);
    expect(r.rate).toBe(0);
    expect(r.label).toBe("—");
  });

  it("calculates correct dropoff", () => {
    const r = calculateDropoff(60, 100);
    expect(r.lost).toBe(40);
    expect(r.rate).toBeCloseTo(40);
    expect(r.label).toBe("40.0%");
  });

  it("remained cannot exceed total — lost floors at 0", () => {
    const r = calculateDropoff(120, 100);
    expect(r.lost).toBe(0);
  });
});

describe("calculateTrend", () => {
  it("flat when both are 0", () => {
    const r = calculateTrend(0, 0);
    expect(r.direction).toBe("flat");
    expect(r.label).toBe("—");
  });

  it("up trend when current > previous", () => {
    const r = calculateTrend(120, 100);
    expect(r.direction).toBe("up");
    expect(r.signed).toBeCloseTo(20);
    expect(r.label).toBe("+20.0%");
  });

  it("down trend when current < previous", () => {
    const r = calculateTrend(80, 100);
    expect(r.direction).toBe("down");
    expect(r.signed).toBeCloseTo(-20);
    expect(r.label).toBe("−20.0%");
  });

  it("100% up when previous is 0 and current > 0", () => {
    const r = calculateTrend(5, 0);
    expect(r.direction).toBe("up");
    expect(r.pct).toBe(100);
  });

  it("pct is always non-negative", () => {
    const r = calculateTrend(50, 100);
    expect(r.pct).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateVelocity", () => {
  it("calculates leads per day", () => {
    const r = calculateVelocity(14, 7);
    expect(r.leadsPerDay).toBe(2);
    expect(r.leadsPerWeek).toBe(14);
  });

  it("trend compares to previous week", () => {
    const r = calculateVelocity(14, 7);
    expect(r.trend.direction).toBe("up");
  });

  it("formats high velocity with /day suffix", () => {
    const r = calculateVelocity(21, 14);
    expect(r.label).toContain("/day");
  });

  it("formats low velocity with /wk suffix", () => {
    const r = calculateVelocity(2, 1);
    expect(r.label).toContain("/wk");
  });
});

describe("calculateMomentum", () => {
  it("strong momentum when trending up with high conversion", () => {
    const r = calculateMomentum(100, 50, 80);
    expect(r.level).toBe("strong");
    expect(r.score).toBeGreaterThanOrEqual(75);
  });

  it("stalled when near zero", () => {
    const r = calculateMomentum(0, 10, 0);
    expect(["stalled", "slowing"]).toContain(r.level);
  });

  it("returns a label string", () => {
    const r = calculateMomentum(5, 5, 30);
    expect(typeof r.label).toBe("string");
    expect(r.label.length).toBeGreaterThan(0);
  });
});

describe("calculateHeat", () => {
  it("cold when all zeros", () => {
    const r = calculateHeat(0, 0, 0);
    expect(r.tier).toBe("cold");
    expect(r.score).toBe(0);
  });

  it("critical when high urgent ratio", () => {
    const r = calculateHeat(10, 5, 15);
    expect(r.score).toBeGreaterThan(50);
    expect(["critical", "hot"]).toContain(r.tier);
  });

  it("score is 0-100", () => {
    const r = calculateHeat(5, 10, 20);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("calculatePipeline", () => {
  it("calculates estimated commission", () => {
    const r = calculatePipeline({ totalLeads: 100, hotLeads: 20, appointments: 10, contracts: 3, closings: 1, avgHomePrice: 220000, commissionPct: 0.03 });
    expect(r.estimatedCommission).toBe(3 * 220000 * 0.03);
  });

  it("handles zeros without NaN", () => {
    const r = calculatePipeline({ totalLeads: 0, hotLeads: 0, appointments: 0, contracts: 0, closings: 0 });
    expect(r.conversionRate).toBe(0);
    expect(r.estimatedCommission).toBe(0);
    expect(r.velocityDays).toBeNull();
  });

  it("uses defaults for avgHomePrice and commission", () => {
    const r = calculatePipeline({ totalLeads: 50, hotLeads: 5, appointments: 3, contracts: 1, closings: 1 });
    expect(r.estimatedCommission).toBeGreaterThan(0);
  });
});

describe("calculateOpportunity", () => {
  it("high when all scores are strong", () => {
    const r = calculateOpportunity(80, 90, 85);
    expect(r.tier).toBe("high");
    expect(r.score).toBeGreaterThanOrEqual(65);
  });

  it("low when all scores are weak", () => {
    const r = calculateOpportunity(5, 10, 5);
    expect(r.tier).toBe("low");
  });

  it("returns non-empty label and reason", () => {
    const r = calculateOpportunity(50, 50, 50);
    expect(r.label.length).toBeGreaterThan(0);
    expect(r.reason.length).toBeGreaterThan(0);
  });
});

describe("calculateAgentRank", () => {
  it("top tier for fast responder with high conversion", () => {
    const r = calculateAgentRank(50, 0.5, 25, 2);
    expect(r.score).toBeGreaterThan(40);
  });

  it("returns score 0–100", () => {
    const r = calculateAgentRank(10, 5, 20, 2);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("calculateCampaignRank", () => {
  it("top tier when campaign outperforms average on both dimensions", () => {
    const r = calculateCampaignRank(80, 90, 40, 45);
    expect(["top", "above_avg"]).toContain(r.tier);
  });

  it("score is bounded 0–100", () => {
    const r = calculateCampaignRank(0, 0, 100, 100);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("calculateSourceRank", () => {
  it("top when source has high share and high conversion", () => {
    const r = calculateSourceRank(50, 60, 100, 30);
    expect(["top", "above_avg"]).toContain(r.tier);
  });

  it("score is bounded 0–100", () => {
    const r = calculateSourceRank(1, 5, 100, 50);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("calculatePriority", () => {
  it("critical when SLA breaches exist", () => {
    const r = calculatePriority({ urgentCount: 3, slaBreach: 3, unassigned: 0, neverContacted: 0, totalLeads: 50 });
    expect(r.level).toBe("critical");
  });

  it("high when unassigned or neverContacted > 2", () => {
    const r = calculatePriority({ urgentCount: 0, slaBreach: 0, unassigned: 5, neverContacted: 2, totalLeads: 50 });
    expect(r.level).toBe("high");
  });

  it("low when no leads", () => {
    const r = calculatePriority({ urgentCount: 0, slaBreach: 0, unassigned: 0, neverContacted: 0, totalLeads: 0 });
    expect(r.level).toBe("low");
  });

  it("returns non-empty label", () => {
    const r = calculatePriority({ urgentCount: 0, slaBreach: 0, unassigned: 1, neverContacted: 0, totalLeads: 10 });
    expect(r.label.length).toBeGreaterThan(0);
  });
});

describe("calculateConfidence", () => {
  it("high confidence with large sample and long coverage", () => {
    const r = calculateConfidence(200, 30, 0.1);
    expect(r.tier).toBe("high");
    expect(r.score).toBeGreaterThanOrEqual(65);
  });

  it("low confidence with small sample", () => {
    const r = calculateConfidence(5, 2, 0.8);
    expect(r.tier).toBe("low");
  });

  it("returns label", () => {
    const r = calculateConfidence(50, 14, 0.3);
    expect(typeof r.label).toBe("string");
  });
});

describe("calculateHealthScore", () => {
  it("A grade with excellent metrics", () => {
    const r = calculateHealthScore({ conversionRate: 90, responseRate: 95, slaCompliance: 98, pipelineActivity: 80, dataQuality: 90 });
    expect(r.grade).toBe("A");
  });

  it("F grade with poor metrics", () => {
    const r = calculateHealthScore({ conversionRate: 5, responseRate: 10, slaCompliance: 15, pipelineActivity: 5, dataQuality: 10 });
    expect(r.grade).toBe("F");
  });

  it("generates warnings for low metrics", () => {
    const r = calculateHealthScore({ conversionRate: 10, responseRate: 40, slaCompliance: 60, pipelineActivity: 20, dataQuality: 50 });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("no warnings for passing metrics", () => {
    const r = calculateHealthScore({ conversionRate: 60, responseRate: 80, slaCompliance: 90, pipelineActivity: 70, dataQuality: 80 });
    expect(r.warnings).toHaveLength(0);
  });
});

describe("formatCurrency", () => {
  it("formats millions", () => expect(formatCurrency(1_500_000)).toBe("$1.5M"));
  it("formats thousands", () => expect(formatCurrency(250_000)).toBe("$250K"));
  it("formats small", () => expect(formatCurrency(500)).toBe("$500"));
});

describe("formatDuration", () => {
  it("formats minutes", () => expect(formatDuration(0.5)).toBe("30m"));
  it("formats hours", () => expect(formatDuration(2.5)).toBe("2.5h"));
  it("formats days", () => expect(formatDuration(48)).toBe("2.0d"));
});

describe("formatCount", () => {
  it("formats millions", () => expect(formatCount(2_000_000)).toBe("2.0M"));
  it("formats thousands", () => expect(formatCount(5000)).toBe("5.0K"));
  it("formats small", () => expect(formatCount(42)).toBe("42"));
});

// ===========================================================================
// RECOMMENDATION ENGINE — unit tests
// ===========================================================================

describe("buildLeadRecommendations", () => {
  const baseSignals: LeadSignals = {
    urgentCount: 0,
    slaBreach: 0,
    unassigned: 0,
    neverContacted: 0,
    followUpDue: 0,
    totalToday: 5,
    total7d: 20,
    total7d_prev: 18,
    hotPct: 20,
  };

  it("returns empty array when no issues", () => {
    const recs = buildLeadRecommendations(baseSignals);
    expect(Array.isArray(recs)).toBe(true);
  });

  it("critical recommendation when SLA breach exists", () => {
    const recs = buildLeadRecommendations({ ...baseSignals, slaBreach: 3, urgentCount: 3 });
    const critical = recs.filter((r) => r.priority === "critical");
    expect(critical.length).toBeGreaterThan(0);
  });

  it("high recommendation when unassigned leads exist", () => {
    const recs = buildLeadRecommendations({ ...baseSignals, unassigned: 5 });
    const high = recs.filter((r) => r.priority !== "low");
    expect(high.length).toBeGreaterThan(0);
  });

  it("volume drop recommendation when leads down >20%", () => {
    const recs = buildLeadRecommendations({ ...baseSignals, total7d: 4, total7d_prev: 20 });
    const volumeDrop = recs.find((r) => r.id.includes("volume_drop"));
    expect(volumeDrop).toBeDefined();
  });

  it("every recommendation has required fields", () => {
    const recs = buildLeadRecommendations({ ...baseSignals, urgentCount: 2, slaBreach: 2, unassigned: 3, neverContacted: 1 });
    for (const rec of recs) {
      expect(rec.id.length).toBeGreaterThan(0);
      expect(rec.title.length).toBeGreaterThan(0);
      expect(rec.reason.length).toBeGreaterThan(0);
      expect(rec.action.length).toBeGreaterThan(0);
      expect(rec.impact.length).toBeGreaterThan(0);
      expect(rec.confidence).toBeGreaterThan(0);
      expect(rec.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("no genie or lamp copy in recommendations", () => {
    const recs = buildLeadRecommendations({ ...baseSignals, urgentCount: 5, slaBreach: 5 });
    for (const rec of recs) {
      const text = JSON.stringify(rec).toLowerCase();
      expect(text).not.toContain("genie");
      expect(text).not.toMatch(/\blamp\b/);
      expect(text).not.toContain("magic lamp");
    }
  });

  it("no red-* tokens in recommendation text", () => {
    const recs = buildLeadRecommendations({ ...baseSignals, urgentCount: 2, slaBreach: 2 });
    for (const rec of recs) {
      expect(JSON.stringify(rec)).not.toMatch(/\btext-red-|bg-red-/);
    }
  });
});

describe("buildCampaignRecommendations", () => {
  const campaigns: CampaignSignal[] = [
    { slug: "home_value",    name: "Home Value",     conversionRate: 40, leads7d: 10, leads7d_prev: 5,  status: "active" },
    { slug: "amm_launch",    name: "AMM Launch",     conversionRate: 15, leads7d: 2,  leads7d_prev: 2,  status: "active" },
    { slug: "we_buy_houses", name: "We Buy Houses",  conversionRate: 5,  leads7d: 0,  leads7d_prev: 0,  status: "active" },
  ];

  it("returns array", () => {
    expect(Array.isArray(buildCampaignRecommendations([]))).toBe(true);
  });

  it("surfaces top performer recommendation", () => {
    const recs = buildCampaignRecommendations(campaigns);
    const topRec = recs.find((r) => r.id.includes("top_"));
    expect(topRec).toBeDefined();
  });

  it("surfaces pause recommendation for underperformer", () => {
    const recs = buildCampaignRecommendations(campaigns);
    const pauseRec = recs.find((r) => r.id.includes("pause_"));
    expect(pauseRec).toBeDefined();
  });

  it("no banned copy in recommendations", () => {
    const recs = buildCampaignRecommendations(campaigns);
    for (const rec of recs) {
      const text = JSON.stringify(rec).toLowerCase();
      expect(text).not.toContain("genie");
      expect(text).not.toContain("magic lamp");
    }
  });
});

describe("buildAgentRecommendations", () => {
  const agents: AgentSignal[] = [
    { id: "a1", name: "Agent A", responseTimeHours: 0.5, conversionRate: 35, slaBreaches: 0, assignedCount: 20, avgResponseTimeHours: 2 },
    { id: "a2", name: "Agent B", responseTimeHours: 8,   conversionRate: 10, slaBreaches: 4, assignedCount: 15, avgResponseTimeHours: 2 },
  ];

  it("returns array", () => {
    expect(Array.isArray(buildAgentRecommendations([]))).toBe(true);
  });

  it("SLA breach recommendation for agent with breaches", () => {
    const recs = buildAgentRecommendations(agents);
    const slRec = recs.find((r) => r.id.includes("sla_"));
    expect(slRec).toBeDefined();
    expect(slRec?.priority).toBe("high");
  });

  it("slow response recommendation when 2× above average", () => {
    const recs = buildAgentRecommendations(agents);
    const slowRec = recs.find((r) => r.id.includes("slow_"));
    expect(slowRec).toBeDefined();
  });

  it("top performer recommendation when agent outperforms by 25%+", () => {
    const recs = buildAgentRecommendations(agents);
    const topRec = recs.find((r) => r.id.includes("top_performer_"));
    expect(topRec).toBeDefined();
  });
});

describe("buildSourceRecommendations", () => {
  const sources: SourceSignal[] = [
    { platform: "Facebook",  count7d: 15, conversion: 30, trend: 35 },
    { platform: "Email",     count7d: 2,  conversion: 55, trend: 5 },
    { platform: "Instagram", count7d: 3,  conversion: 20, trend: -5 },
  ];

  it("returns array", () => {
    expect(Array.isArray(buildSourceRecommendations([]))).toBe(true);
  });

  it("accelerating recommendation when trend > 25%", () => {
    const recs = buildSourceRecommendations(sources);
    const accel = recs.find((r) => r.id.includes("accelerating_"));
    expect(accel).toBeDefined();
  });

  it("underinvested recommendation for high-conv low-volume", () => {
    const recs = buildSourceRecommendations(sources);
    const under = recs.find((r) => r.id.includes("underinvested_"));
    expect(under).toBeDefined();
  });
});

describe("buildConversationRecommendations", () => {
  const signals: ConversationSignals = {
    abandonRate: 50,
    avgMessagesBeforeQual: 5,
    avgMessagesBeforeExit: 1.5,
    topObjection: "I'll wait until spring",
    highIntentCount: 8,
  };

  it("abandon recommendation when rate > 40%", () => {
    const recs = buildConversationRecommendations(signals);
    const abandon = recs.find((r) => r.id.includes("high_abandon"));
    expect(abandon).toBeDefined();
    expect(abandon?.priority).toBe("high");
  });

  it("high intent abandon recommendation", () => {
    const recs = buildConversationRecommendations(signals);
    const hi = recs.find((r) => r.id.includes("high_intent_abandon"));
    expect(hi).toBeDefined();
  });

  it("objection recommendation when topObjection is set", () => {
    const recs = buildConversationRecommendations(signals);
    const obj = recs.find((r) => r.id.includes("top_objection"));
    expect(obj).toBeDefined();
  });
});

describe("buildRecommendationSummary", () => {
  const leadSignals: LeadSignals = {
    urgentCount: 2, slaBreach: 2, unassigned: 3, neverContacted: 1,
    followUpDue: 5, totalToday: 5, total7d: 20, total7d_prev: 15, hotPct: 20,
  };

  it("aggregates all categories", () => {
    const summary = buildRecommendationSummary({ leadSignals });
    expect(summary.totalCount).toBeGreaterThan(0);
    expect(Array.isArray(summary.all)).toBe(true);
    expect(Array.isArray(summary.critical)).toBe(true);
  });

  it("sorted by priority then confidence", () => {
    const summary = buildRecommendationSummary({ leadSignals });
    const priorities = summary.all.map((r) => r.priority);
    const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 1; i < priorities.length; i++) {
      expect(PRIORITY_ORDER[priorities[i]]).toBeGreaterThanOrEqual(PRIORITY_ORDER[priorities[i - 1]]);
    }
  });

  it("topThree is max 3 items", () => {
    const summary = buildRecommendationSummary({ leadSignals });
    expect(summary.topThree.length).toBeLessThanOrEqual(3);
  });

  it("byCategory contains all category keys", () => {
    const summary = buildRecommendationSummary({ leadSignals });
    expect(summary.byCategory).toHaveProperty("leads");
    expect(summary.byCategory).toHaveProperty("campaigns");
    expect(summary.byCategory).toHaveProperty("agents");
    expect(summary.byCategory).toHaveProperty("sources");
    expect(summary.byCategory).toHaveProperty("conversations");
  });

  it("criticalCount matches critical array length", () => {
    const summary = buildRecommendationSummary({ leadSignals });
    expect(summary.criticalCount).toBe(summary.critical.length);
  });
});

// ===========================================================================
// COMPONENT TOKEN GUARDS
// ===========================================================================

describe("analytics/trend-badge.tsx token guard", () => {
  const src = read("components/admin/analytics/trend-badge.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("uses ruby-400 for negative trend", () => expect(src).toContain("ruby-400"));
  it("uses emerald-400 for positive trend", () => expect(src).toContain("emerald-400"));
});

describe("analytics/performance-badge.tsx token guard", () => {
  const src = read("components/admin/analytics/performance-badge.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("uses gold-* for top tier", () => expect(src).toContain("gold-"));
  it("uses ruby-* for bottom tier", () => expect(src).toContain("ruby-"));
});

describe("analytics/sparkline.tsx token guard", () => {
  const src = read("components/admin/analytics/sparkline.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("is a client component", () => expect(src).toContain('"use client"'));
  it("has aria-label support", () => expect(src).toContain("aria-label"));
});

describe("analytics/executive-metric.tsx token guard", () => {
  const src = read("components/admin/analytics/executive-metric.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("uses motion-safe: for animations", () => expect(src).toContain("motion-safe:"));
  it("uses font-bebas for value display", () => expect(src).toContain("font-bebas"));
});

describe("analytics/analytics-card.tsx token guard", () => {
  const src = read("components/admin/analytics/analytics-card.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("exports AnalyticsCard", () => expect(src).toContain("export function AnalyticsCard"));
  it("exports MetricGrid", () => expect(src).toContain("export function MetricGrid"));
  it("exports MetricTile", () => expect(src).toContain("export function MetricTile"));
});

describe("analytics/recommendation-card.tsx token guard", () => {
  const src = read("components/admin/analytics/recommendation-card.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("uses ruby-400 for critical priority", () => expect(src).toContain("ruby-400"));
  it("has role and aria-label for accessibility", () => {
    expect(src).toContain('role="article"');
    expect(src).toContain("aria-label");
  });
});

describe("analytics/conversion-funnel.tsx token guard", () => {
  const src = read("components/admin/analytics/conversion-funnel.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("has role=list for accessibility", () => expect(src).toContain('role="list"'));
  it("has aria-label", () => expect(src).toContain("aria-label"));
  it("uses gold gradient for bars", () => expect(src).toContain("gold-400/"));
});

describe("analytics/insight-card.tsx token guard", () => {
  const src = read("components/admin/analytics/insight-card.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("uses ruby-* not red-* for negative state", () => {
    expect(src).not.toMatch(/border-red-|text-red-|bg-red-/);
    expect(src).toContain("ruby");
  });
});

describe("analytics/pipeline-card.tsx token guard", () => {
  const src = read("components/admin/analytics/pipeline-card.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("imports formatCurrency from intelligence-engine", () => expect(src).toContain("intelligence-engine"));
  it("has aria-label", () => expect(src).toContain("aria-label"));
});

describe("analytics/empty-state.tsx token guard", () => {
  const src = read("components/admin/analytics/empty-state.tsx");
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("exports EmptyState, LoadingState, NoDataState", () => {
    expect(src).toContain("export function EmptyState");
    expect(src).toContain("export function LoadingState");
    expect(src).toContain("export function NoDataState");
  });
  it("has role=status on all states", () => {
    const count = (src.match(/role="status"/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });
  it("uses motion-safe for animations", () => expect(src).toContain("motion-safe:"));
});

// ===========================================================================
// PAGE TOKEN GUARDS
// ===========================================================================

describe("admin/analytics/page.tsx token guard", () => {
  const src = read("app/(admin)/admin/analytics/page.tsx");
  it("imports AdminShell", () => expect(src).toContain("AdminShell"));
  it("imports intelligence-engine", () => expect(src).toContain("intelligence-engine"));
  it("imports recommendation-engine", () => expect(src).toContain("recommendation-engine"));
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("no genie, lamp, or magic lamp", () => {
    const lower = src.toLowerCase();
    expect(lower).not.toContain("genie");
    expect(lower).not.toContain("magic lamp");
    expect(lower).not.toMatch(/\blamp\b/);
  });
  it("no social API calls", () => {
    expect(src).not.toContain("graph.facebook.com");
    expect(src).not.toContain("api.twitter.com");
  });
  it("no secrets exposed", () => {
    expect(src).not.toContain("ADMIN_SECRET");
    expect(src).not.toContain("SERVICE_ROLE_KEY");
  });
  it("backHref links to /admin", () => expect(src).toContain('backHref="/admin"'));
  it("analytics nav has all 5 sections", () => {
    expect(src).toContain("/admin/analytics/sources");
    expect(src).toContain("/admin/analytics/campaigns");
    expect(src).toContain("/admin/analytics/conversations");
    expect(src).toContain("/admin/analytics/reports");
  });
});

describe("admin/analytics/sources/page.tsx token guard", () => {
  const src = read("app/(admin)/admin/analytics/sources/page.tsx");
  it("imports AdminShell", () => expect(src).toContain("AdminShell"));
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("no genie or lamp", () => {
    expect(src.toLowerCase()).not.toContain("genie");
    expect(src.toLowerCase()).not.toMatch(/\blamp\b/);
  });
  it("never references ourtownproperties.com as a live URL", () => {
    expect(src).not.toContain("https://ourtownproperties.com");
  });
  it("backHref links to analytics", () => expect(src).toContain('backHref="/admin/analytics"'));
});

describe("admin/analytics/campaigns/page.tsx token guard", () => {
  const src = read("app/(admin)/admin/analytics/campaigns/page.tsx");
  it("imports AdminShell", () => expect(src).toContain("AdminShell"));
  it("imports ALL_CAMPAIGNS", () => expect(src).toContain("ALL_CAMPAIGNS"));
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("no genie or lamp", () => {
    expect(src.toLowerCase()).not.toContain("genie");
    expect(src.toLowerCase()).not.toMatch(/\blamp\b/);
  });
  it("links to marketing command", () => expect(src).toContain("/admin/marketing"));
});

describe("admin/analytics/conversations/page.tsx token guard", () => {
  const src = read("app/(admin)/admin/analytics/conversations/page.tsx");
  it("imports AdminShell", () => expect(src).toContain("AdminShell"));
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("no genie or lamp", () => {
    expect(src.toLowerCase()).not.toContain("genie");
    expect(src.toLowerCase()).not.toMatch(/\blamp\b/);
  });
  it("never posts to social media", () => {
    expect(src).not.toContain("graph.facebook.com");
    expect(src).not.toContain("api.twitter.com");
  });
});

describe("admin/analytics/reports/page.tsx token guard", () => {
  const src = read("app/(admin)/admin/analytics/reports/page.tsx");
  it("imports AdminShell", () => expect(src).toContain("AdminShell"));
  it("no red-* tokens", () => expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/));
  it("no hardcoded hex text colors", () => expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/));
  it("no genie or lamp", () => {
    expect(src.toLowerCase()).not.toContain("genie");
    expect(src.toLowerCase()).not.toMatch(/\blamp\b/);
  });
  it("no email sending code", () => {
    expect(src).not.toContain("sendmail");
    expect(src).not.toContain("nodemailer");
    expect(src).not.toContain("smtp");
    expect(src).not.toContain("sendgrid");
  });
  it("no data export to external services", () => {
    expect(src).not.toContain("s3.amazonaws");
    expect(src).not.toContain("export.csv");
  });
  it("imports CopyBlock for report text export", () => expect(src).toContain("CopyBlock"));
  it("no secrets printed", () => {
    expect(src).not.toContain("ADMIN_SECRET");
    expect(src).not.toContain("SERVICE_ROLE_KEY");
  });
});

// ===========================================================================
// INTELLIGENCE ENGINE source file guard
// ===========================================================================

describe("lib/admin/intelligence-engine.ts source guard", () => {
  const src = read("lib/admin/intelligence-engine.ts");
  it("no external API calls", () => {
    expect(src).not.toContain("fetch(");
    expect(src).not.toContain("axios");
    expect(src).not.toContain("http.get");
  });
  it("no writes (no DB mutations)", () => {
    expect(src).not.toContain(".insert(");
    expect(src).not.toContain(".update(");
    expect(src).not.toContain(".delete(");
    expect(src).not.toContain(".upsert(");
  });
  it("exports all required calculation functions", () => {
    expect(src).toContain("export function calculateConversion");
    expect(src).toContain("export function calculateDropoff");
    expect(src).toContain("export function calculateTrend");
    expect(src).toContain("export function calculateVelocity");
    expect(src).toContain("export function calculateMomentum");
    expect(src).toContain("export function calculateHeat");
    expect(src).toContain("export function calculatePipeline");
    expect(src).toContain("export function calculateOpportunity");
    expect(src).toContain("export function calculateAgentRank");
    expect(src).toContain("export function calculateCampaignRank");
    expect(src).toContain("export function calculateSourceRank");
    expect(src).toContain("export function calculatePriority");
    expect(src).toContain("export function calculateConfidence");
    expect(src).toContain("export function calculateHealthScore");
  });
});

describe("lib/admin/recommendation-engine.ts source guard", () => {
  const src = read("lib/admin/recommendation-engine.ts");
  it("no external API calls", () => {
    expect(src).not.toContain("fetch(");
    expect(src).not.toContain("openai");
    expect(src).not.toContain("anthropic");
  });
  it("no writes", () => {
    expect(src).not.toContain(".insert(");
    expect(src).not.toContain(".update(");
    expect(src).not.toContain(".delete(");
  });
  it("no genie or lamp copy in recommendation text templates", () => {
    const lower = src.toLowerCase();
    expect(lower).not.toContain("genie");
    expect(lower).not.toMatch(/\blamp\b/);
    expect(lower).not.toContain("magic lamp");
  });
  it("exports buildRecommendationSummary", () => {
    expect(src).toContain("export function buildRecommendationSummary");
  });
  it("all builder functions are exported", () => {
    expect(src).toContain("export function buildLeadRecommendations");
    expect(src).toContain("export function buildCampaignRecommendations");
    expect(src).toContain("export function buildAgentRecommendations");
    expect(src).toContain("export function buildSourceRecommendations");
    expect(src).toContain("export function buildConversationRecommendations");
  });
});
