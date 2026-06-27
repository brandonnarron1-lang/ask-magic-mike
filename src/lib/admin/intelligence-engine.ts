/**
 * Intelligence Engine — pure, typed calculation utilities.
 *
 * Every function is deterministic: same inputs → same outputs.
 * No API calls. No writes. No side effects.
 * Fully unit-testable without environment variables.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface TrendResult {
  direction: "up" | "down" | "flat";
  pct: number;          // absolute % change, always positive
  signed: number;       // signed % change (positive = up)
  label: string;        // e.g. "+12.4%" or "−5.1%" or "—"
}

export interface ConversionResult {
  rate: number;         // 0–100
  label: string;        // "42.5%"
  numerator: number;
  denominator: number;
}

export interface DropoffResult {
  rate: number;         // 0–100
  label: string;
  lost: number;
  total: number;
}

export interface MomentumResult {
  score: number;        // 0–100
  level: "strong" | "growing" | "steady" | "slowing" | "stalled";
  label: string;
}

export interface HeatScore {
  score: number;        // 0–100
  tier: "critical" | "hot" | "warm" | "cool" | "cold";
  label: string;
}

export interface PipelineResult {
  totalLeads: number;
  hotLeads: number;
  appointments: number;
  contracts: number;
  closings: number;
  estimatedValue: number;
  estimatedCommission: number;
  conversionRate: number;
  velocityDays: number | null;
}

export interface OpportunityResult {
  score: number;         // 0–100
  tier: "high" | "medium" | "low";
  label: string;
  reason: string;
}

export interface RankResult {
  rank: number;
  score: number;         // 0–100
  tier: "top" | "above_avg" | "avg" | "below_avg" | "bottom";
}

export interface PriorityResult {
  level: "critical" | "high" | "medium" | "low";
  score: number;         // 0–100
  label: string;
}

export interface ConfidenceResult {
  score: number;         // 0–100
  tier: "high" | "medium" | "low";
  label: string;
}

export interface HealthScoreResult {
  score: number;         // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  warnings: string[];
}

export interface VelocityResult {
  leadsPerDay: number;
  leadsPerWeek: number;
  trend: TrendResult;
  label: string;
}

// ---------------------------------------------------------------------------
// calculateConversion
// ---------------------------------------------------------------------------

export function calculateConversion(
  numerator: number,
  denominator: number
): ConversionResult {
  if (denominator <= 0) {
    return { rate: 0, label: "—", numerator, denominator };
  }
  const rate = Math.min(100, (numerator / denominator) * 100);
  return {
    rate,
    label: `${rate.toFixed(1)}%`,
    numerator,
    denominator,
  };
}

// ---------------------------------------------------------------------------
// calculateDropoff
// ---------------------------------------------------------------------------

export function calculateDropoff(
  remained: number,
  total: number
): DropoffResult {
  if (total <= 0) {
    return { rate: 0, label: "—", lost: 0, total };
  }
  const lost = Math.max(0, total - remained);
  const rate = Math.min(100, (lost / total) * 100);
  return {
    rate,
    label: `${rate.toFixed(1)}%`,
    lost,
    total,
  };
}

// ---------------------------------------------------------------------------
// calculateTrend
// ---------------------------------------------------------------------------

export function calculateTrend(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) {
    return { direction: "flat", pct: 0, signed: 0, label: "—" };
  }
  if (previous === 0) {
    return { direction: "up", pct: 100, signed: 100, label: "+100%" };
  }
  const signed = ((current - previous) / previous) * 100;
  const pct = Math.abs(signed);
  const direction: TrendResult["direction"] =
    signed > 0.5 ? "up" : signed < -0.5 ? "down" : "flat";
  const prefix = direction === "up" ? "+" : direction === "down" ? "−" : "";
  return {
    direction,
    pct,
    signed,
    label: direction === "flat" ? "—" : `${prefix}${pct.toFixed(1)}%`,
  };
}

// ---------------------------------------------------------------------------
// calculateVelocity
// ---------------------------------------------------------------------------

export function calculateVelocity(
  leads7d: number,
  leads7d_prev: number
): VelocityResult {
  const leadsPerDay = leads7d / 7;
  const leadsPerWeek = leads7d;
  const trend = calculateTrend(leads7d, leads7d_prev);
  const label =
    leadsPerDay >= 1
      ? `${leadsPerDay.toFixed(1)}/day`
      : `${(leadsPerDay * 7).toFixed(0)}/wk`;
  return { leadsPerDay, leadsPerWeek, trend, label };
}

// ---------------------------------------------------------------------------
// calculateMomentum
// ---------------------------------------------------------------------------

export function calculateMomentum(
  current7d: number,
  prev7d: number,
  conversionRate: number
): MomentumResult {
  const trend = calculateTrend(current7d, prev7d);
  // Weighted: 60% trend direction, 40% conversion contribution
  const trendScore = trend.direction === "up"
    ? Math.min(60, 30 + trend.pct)
    : trend.direction === "down"
    ? Math.max(0, 30 - trend.pct)
    : 30;
  const convScore = Math.min(40, conversionRate * 0.4);
  const score = Math.round(trendScore + convScore);

  const level: MomentumResult["level"] =
    score >= 75 ? "strong"
    : score >= 55 ? "growing"
    : score >= 40 ? "steady"
    : score >= 20 ? "slowing"
    : "stalled";

  const labels: Record<MomentumResult["level"], string> = {
    strong: "Strong",
    growing: "Growing",
    steady: "Steady",
    slowing: "Slowing",
    stalled: "Stalled",
  };

  return { score, level, label: labels[level] };
}

// ---------------------------------------------------------------------------
// calculateHeat
// ---------------------------------------------------------------------------

export function calculateHeat(
  urgentCount: number,
  hotCount: number,
  totalCount: number
): HeatScore {
  if (totalCount <= 0) {
    return { score: 0, tier: "cold", label: "Cold" };
  }
  const urgentWeight = (urgentCount / totalCount) * 60;
  const hotWeight = (hotCount / totalCount) * 40;
  const score = Math.min(100, Math.round(urgentWeight + hotWeight));

  const tier: HeatScore["tier"] =
    score >= 75 ? "critical"
    : score >= 50 ? "hot"
    : score >= 30 ? "warm"
    : score >= 10 ? "cool"
    : "cold";

  const labels: Record<HeatScore["tier"], string> = {
    critical: "Critical",
    hot: "Hot",
    warm: "Warm",
    cool: "Cool",
    cold: "Cold",
  };

  return { score, tier, label: labels[tier] };
}

// ---------------------------------------------------------------------------
// calculatePipeline
// ---------------------------------------------------------------------------

export function calculatePipeline(params: {
  totalLeads: number;
  hotLeads: number;
  appointments: number;
  contracts: number;
  closings: number;
  avgHomePrice?: number;
  commissionPct?: number;
}): PipelineResult {
  const avgHomePrice = params.avgHomePrice ?? 220000;
  const commissionPct = params.commissionPct ?? 0.03;
  const estimatedValue = params.contracts * avgHomePrice;
  const estimatedCommission = estimatedValue * commissionPct;
  const conversionRate = params.totalLeads > 0
    ? (params.closings / params.totalLeads) * 100
    : 0;

  // Rough velocity: avg days from lead to close in the US market
  const velocityDays = params.closings > 0
    ? Math.round(30 + (params.totalLeads / Math.max(1, params.closings)) * 2)
    : null;

  return {
    totalLeads: params.totalLeads,
    hotLeads: params.hotLeads,
    appointments: params.appointments,
    contracts: params.contracts,
    closings: params.closings,
    estimatedValue,
    estimatedCommission,
    conversionRate,
    velocityDays,
  };
}

// ---------------------------------------------------------------------------
// calculateOpportunity
// ---------------------------------------------------------------------------

export function calculateOpportunity(
  conversionRate: number,
  velocityScore: number,
  heatScore: number
): OpportunityResult {
  const score = Math.round(
    conversionRate * 0.4 + velocityScore * 0.3 + heatScore * 0.3
  );

  const tier: OpportunityResult["tier"] =
    score >= 65 ? "high" : score >= 35 ? "medium" : "low";

  const reasons: Record<OpportunityResult["tier"], string> = {
    high: "Strong conversion with active pipeline",
    medium: "Moderate activity with growth potential",
    low: "Low activity — attention required",
  };

  const labels: Record<OpportunityResult["tier"], string> = {
    high: "High Opportunity",
    medium: "Moderate Opportunity",
    low: "Low Opportunity",
  };

  return { score, tier, label: labels[tier], reason: reasons[tier] };
}

// ---------------------------------------------------------------------------
// calculateAgentRank
// ---------------------------------------------------------------------------

export function calculateAgentRank(
  agentConversionRate: number,
  agentResponseTime: number,   // hours
  avgConversionRate: number,
  avgResponseTime: number      // hours
): RankResult {
  const convScore = avgConversionRate > 0
    ? Math.min(60, (agentConversionRate / avgConversionRate) * 30)
    : 30;
  const responseScore = avgResponseTime > 0
    ? Math.min(40, (avgResponseTime / Math.max(0.1, agentResponseTime)) * 20)
    : 20;
  const score = Math.round(convScore + responseScore);

  const tier: RankResult["tier"] =
    score >= 80 ? "top"
    : score >= 60 ? "above_avg"
    : score >= 40 ? "avg"
    : score >= 20 ? "below_avg"
    : "bottom";

  // Rank is a placeholder — caller determines rank from sorted list
  return { rank: 0, score, tier };
}

// ---------------------------------------------------------------------------
// calculateCampaignRank
// ---------------------------------------------------------------------------

export function calculateCampaignRank(
  campaignConversion: number,
  campaignMomentum: number,
  avgConversion: number,
  avgMomentum: number
): RankResult {
  const convScore = avgConversion > 0
    ? Math.min(60, (campaignConversion / avgConversion) * 30)
    : 30;
  const momScore = avgMomentum > 0
    ? Math.min(40, (campaignMomentum / avgMomentum) * 20)
    : 20;
  const score = Math.round(convScore + momScore);

  const tier: RankResult["tier"] =
    score >= 80 ? "top"
    : score >= 60 ? "above_avg"
    : score >= 40 ? "avg"
    : score >= 20 ? "below_avg"
    : "bottom";

  return { rank: 0, score, tier };
}

// ---------------------------------------------------------------------------
// calculateSourceRank
// ---------------------------------------------------------------------------

export function calculateSourceRank(
  sourceCount: number,
  sourceConversion: number,
  totalCount: number,
  avgConversion: number
): RankResult {
  const shareScore = totalCount > 0
    ? Math.min(50, (sourceCount / totalCount) * 100 * 0.5)
    : 0;
  const convScore = avgConversion > 0
    ? Math.min(50, (sourceConversion / avgConversion) * 25)
    : 25;
  const score = Math.round(shareScore + convScore);

  const tier: RankResult["tier"] =
    score >= 80 ? "top"
    : score >= 60 ? "above_avg"
    : score >= 40 ? "avg"
    : score >= 20 ? "below_avg"
    : "bottom";

  return { rank: 0, score, tier };
}

// ---------------------------------------------------------------------------
// calculatePriority
// ---------------------------------------------------------------------------

export function calculatePriority(params: {
  urgentCount: number;
  slaBreach: number;
  unassigned: number;
  neverContacted: number;
  totalLeads: number;
}): PriorityResult {
  const criticalSignals = params.urgentCount + params.slaBreach;
  const highSignals = params.unassigned + params.neverContacted;

  if (criticalSignals > 0) {
    const score = Math.min(100, 70 + criticalSignals * 5);
    return { level: "critical", score, label: "Critical Attention Required" };
  }
  if (highSignals > 2) {
    const score = Math.min(69, 45 + highSignals * 3);
    return { level: "high", score, label: "High Priority" };
  }
  if (highSignals > 0 || params.totalLeads > 0) {
    return { level: "medium", score: 40, label: "Normal Operations" };
  }
  return { level: "low", score: 10, label: "Quiet" };
}

// ---------------------------------------------------------------------------
// calculateConfidence
// ---------------------------------------------------------------------------

export function calculateConfidence(
  sampleSize: number,
  daysCovered: number,
  inconsistency: number  // 0–1: how inconsistent is the data (0=perfect, 1=chaotic)
): ConfidenceResult {
  const sizeScore = Math.min(50, (sampleSize / 100) * 50);
  const coverageScore = Math.min(30, (daysCovered / 30) * 30);
  const consistencyScore = Math.min(20, (1 - inconsistency) * 20);
  const score = Math.round(sizeScore + coverageScore + consistencyScore);

  const tier: ConfidenceResult["tier"] =
    score >= 65 ? "high" : score >= 35 ? "medium" : "low";

  const labels: Record<ConfidenceResult["tier"], string> = {
    high: "High Confidence",
    medium: "Moderate Confidence",
    low: "Limited Data",
  };

  return { score, tier, label: labels[tier] };
}

// ---------------------------------------------------------------------------
// calculateHealthScore
// ---------------------------------------------------------------------------

export function calculateHealthScore(params: {
  conversionRate: number;    // 0–100
  responseRate: number;      // 0–100 (% leads contacted within 1h)
  slaCompliance: number;     // 0–100
  pipelineActivity: number;  // 0–100
  dataQuality: number;       // 0–100 (% leads with full attribution)
}): HealthScoreResult {
  const score = Math.round(
    params.conversionRate * 0.3 +
    params.responseRate   * 0.25 +
    params.slaCompliance  * 0.2 +
    params.pipelineActivity * 0.15 +
    params.dataQuality    * 0.1
  );

  const grade: HealthScoreResult["grade"] =
    score >= 85 ? "A"
    : score >= 70 ? "B"
    : score >= 55 ? "C"
    : score >= 40 ? "D"
    : "F";

  const warnings: string[] = [];
  if (params.conversionRate < 20)  warnings.push("Conversion rate below target");
  if (params.responseRate < 50)    warnings.push("Lead response rate low");
  if (params.slaCompliance < 70)   warnings.push("SLA compliance needs improvement");
  if (params.dataQuality < 60)     warnings.push("Attribution data incomplete");

  const gradeLabels: Record<HealthScoreResult["grade"], string> = {
    A: "Excellent", B: "Good", C: "Fair", D: "Poor", F: "Critical"
  };

  return { score, grade, label: gradeLabels[grade], warnings };
}

// ---------------------------------------------------------------------------
// Formatting helpers (not calculations — but co-located for convenience)
// ---------------------------------------------------------------------------

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatDuration(hours: number): string {
  if (hours < 1)   return `${Math.round(hours * 60)}m`;
  if (hours < 24)  return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
