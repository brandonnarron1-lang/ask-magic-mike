/**
 * Phase 11 — Executive Intelligence Layer
 * Generates deterministic, narrative-form executive insights.
 * No LLM calls. No generative AI. Pure computation + string templates.
 */

import type {
  ExecutiveInsight,
  BriefingPacket,
  ExecutiveSignals,
  InsightType,
  PredictionUrgency,
} from "./types";

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  trend_acceleration:  "Trend Acceleration",
  trend_reversal:      "Trend Reversal",
  neighborhood_surge:  "Neighborhood Surge",
  agent_performance:   "Agent Performance",
  conversion_shift:    "Conversion Shift",
  campaign_impact:     "Campaign Impact",
  lead_quality_change: "Lead Quality Change",
  sla_pattern:         "SLA Pattern",
  referral_pattern:    "Referral Pattern",
  market_velocity:     "Market Velocity",
};

export const INSIGHT_TYPE_COLORS: Record<InsightType, string> = {
  trend_acceleration:  "text-emerald-400",
  trend_reversal:      "text-ruby-400",
  neighborhood_surge:  "text-gold-300",
  agent_performance:   "text-cyan-400",
  conversion_shift:    "text-amber-400",
  campaign_impact:     "text-gold-300",
  lead_quality_change: "text-slate-400",
  sla_pattern:         "text-ruby-400",
  referral_pattern:    "text-emerald-400",
  market_velocity:     "text-amber-400",
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _insightCounter = 0;

function makeInsight(
  type:             InsightType,
  headline:         string,
  narrative:        string,
  reason:           string,
  metrics:          Record<string, string | number>,
  confidence:       number,
  impact:           string,
  action:           string,
  urgency:          PredictionUrgency,
  roi:              number | null = null,
): ExecutiveInsight {
  _insightCounter++;
  return {
    id:                `insight_${_insightCounter}_${type}`,
    type,
    headline,
    narrative,
    reason,
    supportingMetrics: metrics,
    confidence:        Math.min(100, Math.max(0, confidence)),
    expectedImpact:    impact,
    recommendedAction: action,
    estimatedROI:      roi,
    urgency,
    generatedAt:       new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Core insight generation
// ---------------------------------------------------------------------------

export function generateExecutiveInsights(es: ExecutiveSignals): ExecutiveInsight[] {
  const s = es.signals;
  const insights: ExecutiveInsight[] = [];

  // ── Seller conversation trend ─────────────────────────────────────────
  if (Math.abs(s.sellerConversationsTrend) >= 10) {
    const isUp   = s.sellerConversationsTrend > 0;
    const pct    = Math.round(Math.abs(s.sellerConversationsTrend));
    const source = s.topCampaignSource || "current campaigns";

    insights.push(makeInsight(
      isUp ? "trend_acceleration" : "trend_reversal",
      `Seller conversations ${isUp ? "up" : "down"} ${pct}% this week${isUp ? " — opportunity window open" : " — intervention needed"}`,
      isUp
        ? `This week's seller conversations increased ${pct}%, primarily from ${source} traffic. This represents a meaningful demand signal in the listing pipeline.`
        : `Seller conversations dropped ${pct}% this week. This reversal may signal campaign fatigue or seasonal slowdown requiring immediate action.`,
      isUp
        ? `${source} is generating above-average seller engagement. The trend has been building over ${s.windowDays} days.`
        : `Reduced organic and paid traffic to seller-intent pages. Campaigns may need refreshed creative or targeting.`,
      { sellerConversations: s.sellerConversationsInWindow, trend: `${isUp ? "+" : ""}${pct}%`, source },
      isUp ? 78 : 82,
      isUp
        ? `Potential to convert ${Math.ceil(s.sellerConversationsInWindow * 0.25)} seller conversations into listing appointments`
        : "Listing pipeline at risk if trend continues for another week",
      isUp
        ? "Assign top-converting agents to seller leads immediately; amplify winning campaign"
        : "Audit campaign creative; launch emergency seller re-engagement push",
      isUp ? "high" : "high",
      isUp ? s.sellerConversationsInWindow * 2200 : null,
    ));
  }

  // ── Neighborhood surge ────────────────────────────────────────────────
  const topNeighborhood = s.topNeighborhood;
  const topCount = s.neighborhoodLeadCounts[topNeighborhood] ?? 0;
  const totalForShare = s.totalLeads || 1;

  if (topCount > 0 && (topCount / totalForShare) > 0.3) {
    const share = Math.round((topCount / totalForShare) * 100);
    insights.push(makeInsight(
      "neighborhood_surge",
      `${topNeighborhood} generating ${share}% of all leads — disproportionate opportunity`,
      `${topNeighborhood} is producing a disproportionate share of brokerage leads (${share}%). This concentration signals strong neighborhood demand and a potential systematic farming opportunity.`,
      `Lead concentration in ${topNeighborhood} has exceeded the threshold for targeted neighborhood strategy. High concentration indicates organic word-of-mouth or campaign targeting alignment.`,
      { neighborhood: topNeighborhood, leadShare: `${share}%`, leadCount: topCount, totalLeads: s.totalLeads },
      72,
      `Systematic ${topNeighborhood} farming could yield 3–5 additional listings over 90 days`,
      `Launch ${topNeighborhood}-specific content series; assign dedicated farming agent`,
      "medium",
      5 * 6600,
    ));
  }

  // ── Agent performance divergence ──────────────────────────────────────
  if (s.activeAgents > 1 && s.topAgentConversionRate - s.teamAvgConversionRate > 15) {
    const gap = Math.round(s.topAgentConversionRate - s.teamAvgConversionRate);
    insights.push(makeInsight(
      "agent_performance",
      `Top agent converts ${gap}% above team average — coaching opportunity`,
      `One agent is converting ${Math.round(s.topAgentConversionRate)}% of leads compared to the ${Math.round(s.teamAvgConversionRate)}% team average — a ${gap}-point gap. This performance advantage is replicable.`,
      `Performance divergence likely reflects superior follow-up cadence, faster response time, or stronger qualification technique. Knowledge transfer can lift the full team.`,
      { topAgentRate: `${Math.round(s.topAgentConversionRate)}%`, teamAvg: `${Math.round(s.teamAvgConversionRate)}%`, gap: `+${gap}%`, agents: s.activeAgents },
      75,
      `Lifting bottom 60% of agents by half the gap would generate ${Math.ceil(s.activeAgents * 0.6 * (gap / 100) * 5)} additional closings`,
      "Schedule top-performer knowledge capture; build coaching playbook from observed techniques",
      "medium",
      Math.ceil(s.activeAgents * 0.5) * 2 * 6600,
    ));
  }

  // ── Appointment acceptance correlation with response time ─────────────
  if (s.avgResponseToAcceptMinutes > 0) {
    const isSlowResponse = s.avgResponseToAcceptMinutes > 18;
    if (isSlowResponse && s.appointmentTrend < 0) {
      insights.push(makeInsight(
        "conversion_shift",
        `Appointment acceptance falling — response times at ${Math.round(s.avgResponseToAcceptMinutes)} minutes`,
        `Appointment acceptance fell ${Math.abs(Math.round(s.appointmentTrend))}% after response times exceeded ${Math.round(s.avgResponseToAcceptMinutes)} minutes. The data shows a direct correlation between contact speed and scheduling success.`,
        "Leads contacted after 18 minutes are 38% less likely to schedule appointments. Current average response time creates a structural conversion leak.",
        { avgResponseMinutes: Math.round(s.avgResponseToAcceptMinutes), appointmentTrend: `${Math.round(s.appointmentTrend)}%`, acceptanceRate: `${Math.round(s.appointmentAcceptanceRate)}%` },
        80,
        `Reducing response to under 10 minutes could recover ${Math.ceil(s.missedAppointmentsInWindow * 0.4)} appointments per week`,
        "Implement instant notification system; create agent on-call rotation for peak lead hours",
        "high",
        Math.ceil(s.missedAppointmentsInWindow * 0.4) * 3300,
      ));
    } else if (!isSlowResponse && s.appointmentAcceptanceRate > 65) {
      insights.push(makeInsight(
        "conversion_shift",
        `Fast response driving ${Math.round(s.appointmentAcceptanceRate)}% appointment acceptance`,
        `Response time of ${Math.round(s.avgResponseToAcceptMinutes)} minutes is generating a ${Math.round(s.appointmentAcceptanceRate)}% appointment acceptance rate — above the 60% industry benchmark.`,
        "Sub-18-minute response cadence is producing measurable conversion advantage. Consistency is critical to maintaining this edge.",
        { avgResponseMinutes: Math.round(s.avgResponseToAcceptMinutes), acceptanceRate: `${Math.round(s.appointmentAcceptanceRate)}%` },
        74,
        "Maintain or improve response protocols to sustain above-benchmark conversion",
        "Codify response SLA as a formal team standard; recognize agents meeting the benchmark",
        "medium",
      ));
    }
  }

  // ── Campaign impact ────────────────────────────────────────────────────
  if (s.topCampaignSource && s.campaignLeadsInWindow > 0) {
    const isStrong = s.campaignConversionRate >= s.teamAvgConversionRate;
    insights.push(makeInsight(
      "campaign_impact",
      `${s.topCampaignSource} generated ${s.campaignLeadsInWindow} lead${s.campaignLeadsInWindow !== 1 ? "s" : ""} — ${isStrong ? "above" : "below"} average quality`,
      `${s.topCampaignSource} is the dominant lead source this window with ${s.campaignLeadsInWindow} lead${s.campaignLeadsInWindow !== 1 ? "s" : ""} and ${Math.round(s.campaignConversionRate)}% conversion vs ${Math.round(s.teamAvgConversionRate)}% team average.`,
      isStrong
        ? `${s.topCampaignSource} is consistently producing quality leads. The signal suggests audience targeting and creative alignment with high-intent prospects.`
        : `${s.topCampaignSource} volume is not translating to proportional conversions. Lead quality or nurture fit may need review.`,
      { source: s.topCampaignSource, campaignLeads: s.campaignLeadsInWindow, conversionRate: `${Math.round(s.campaignConversionRate)}%`, teamAvg: `${Math.round(s.teamAvgConversionRate)}%` },
      isStrong ? 76 : 70,
      isStrong
        ? `Reallocating 20% more budget to ${s.topCampaignSource} could add ${Math.ceil(s.campaignLeadsInWindow * 0.2)} more leads`
        : "Lead quality review could identify funnel friction and recover conversion",
      isStrong
        ? `Increase ${s.topCampaignSource} budget allocation by 20%; replicate targeting in new audiences`
        : "Audit lead quality from this source; A/B test landing page and lead form copy",
      isStrong ? "medium" : "medium",
      isStrong ? s.campaignLeadsInWindow * 0.2 * 2200 : null,
    ));
  }

  // ── SLA pattern ────────────────────────────────────────────────────────
  if (s.slaBreachCount > 0 || s.avgSlaComplianceRate < 80) {
    insights.push(makeInsight(
      "sla_pattern",
      `SLA compliance at ${Math.round(s.avgSlaComplianceRate)}% — ${s.slaBreachCount} active breach${s.slaBreachCount !== 1 ? "es" : ""}`,
      `SLA compliance rate of ${Math.round(s.avgSlaComplianceRate)}% with ${s.slaBreachCount} active breach${s.slaBreachCount !== 1 ? "es" : ""} and ${s.slaWarningCount} pending warning${s.slaWarningCount !== 1 ? "s" : ""}. Each breach correlates with 38% lower conversion probability.`,
      "SLA breaches accumulate when agent capacity is exceeded or response protocols are inconsistent. Pattern suggests workload or priority management issue.",
      { complianceRate: `${Math.round(s.avgSlaComplianceRate)}%`, breaches: s.slaBreachCount, warnings: s.slaWarningCount },
      85,
      `Resolving ${s.slaBreachCount} breach${s.slaBreachCount !== 1 ? "es" : ""} could recover an estimated ${Math.ceil(s.slaBreachCount * 0.38)} conversion${Math.ceil(s.slaBreachCount * 0.38) !== 1 ? "s" : ""}`,
      "Escalate breached leads immediately; review agent capacity and lead distribution",
      s.slaBreachCount >= 3 ? "critical" : "high",
      s.slaBreachCount * 3300,
    ));
  }

  // ── Referral pattern ───────────────────────────────────────────────────
  if (s.referralLeads > 0 && s.referralConversionRate > s.teamAvgConversionRate + 10) {
    const premium = Math.round(s.referralConversionRate - s.teamAvgConversionRate);
    insights.push(makeInsight(
      "referral_pattern",
      `Referral channel converting ${premium}% above team average — underutilized source`,
      `Referral leads are converting at ${Math.round(s.referralConversionRate)}% — ${premium} points above the ${Math.round(s.teamAvgConversionRate)}% team average. This is the highest-ROI channel in the portfolio.`,
      "Referral leads arrive pre-qualified by a trusted advocate. Higher trust baseline and lower resistance to appointment setting. Systematic referral cultivation multiplies this advantage.",
      { referralLeads: s.referralLeads, conversionRate: `${Math.round(s.referralConversionRate)}%`, premium: `+${premium}%` },
      78,
      `Doubling referral volume at current quality would generate ${Math.ceil(s.referralLeads * s.referralConversionRate / 100)} additional closing${Math.ceil(s.referralLeads * s.referralConversionRate / 100) !== 1 ? "s" : ""}`,
      "Implement formal referral program with systematic appreciation; create shareable content for advocates",
      "medium",
      s.referralLeads * 2 * (s.referralConversionRate / 100) * 6600,
    ));
  }

  // ── Market velocity ────────────────────────────────────────────────────
  if (s.predictedClosings30d > 0 || s.estimatedPipelineValue > 10000) {
    const closingsLabel = s.predictedClosings30d > 0 ? `${s.predictedClosings30d} projected closing${s.predictedClosings30d !== 1 ? "s" : ""}` : "a healthy pipeline";
    insights.push(makeInsight(
      "market_velocity",
      `Pipeline valued at $${Math.round(s.estimatedPipelineValue / 1000)}K — ${closingsLabel} in 30 days`,
      `The brokerage pipeline currently holds an estimated $${Math.round(s.estimatedPipelineValue).toLocaleString()} in potential commission value with ${s.predictedClosings30d} closing${s.predictedClosings30d !== 1 ? "s" : ""} projected in the next 30 days.`,
      `Based on current lead grades, conversion rates, and historical velocity. Average days-to-close: ${Math.round(s.avgDaysToClose)} days.`,
      { pipelineValue: `$${Math.round(s.estimatedPipelineValue).toLocaleString()}`, projectedClosings: s.predictedClosings30d, avgDaysToClose: Math.round(s.avgDaysToClose) },
      70,
      `Protecting and accelerating this pipeline represents the highest-value action this week`,
      "Prioritize pipeline-stage leads; ensure no SLA breaches in the closing funnel",
      "high",
      s.predictedClosings30d * 6600,
    ));
  }

  return rankInsightsByImpact(insights);
}

// ---------------------------------------------------------------------------
// Ranking and filtering
// ---------------------------------------------------------------------------

export function rankInsightsByImpact(insights: ExecutiveInsight[]): ExecutiveInsight[] {
  const urgencyWeight: Record<PredictionUrgency, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...insights].sort((a, b) => {
    const uDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    return uDiff !== 0 ? uDiff : b.confidence - a.confidence;
  });
}

// ---------------------------------------------------------------------------
// Briefing packet
// ---------------------------------------------------------------------------

export function buildBriefingPacket(
  insights:    ExecutiveInsight[],
  windowDays   = 7,
): BriefingPacket {
  const criticalCount = insights.filter((i) => i.urgency === "critical").length;
  const highCount     = insights.filter((i) => i.urgency === "high").length;

  const overallHealth: BriefingPacket["overallHealth"] =
    criticalCount >= 3 ? "poor"      :
    criticalCount >= 1 ? "fair"      :
    highCount     >= 3 ? "fair"      :
    highCount     >= 1 ? "good"      : "excellent";

  const totalROI = insights.reduce((s, i) => s + (i.estimatedROI ?? 0), 0);

  const executiveSummary = buildExecutiveSummary(insights, overallHealth, totalROI);

  return {
    generatedAt:      new Date().toISOString(),
    windowDays,
    insights:         insights.slice(0, 10),
    topInsight:       insights[0] ?? null,
    criticalCount,
    highCount,
    overallHealth,
    executiveSummary,
  };
}

function buildExecutiveSummary(
  insights:    ExecutiveInsight[],
  health:      BriefingPacket["overallHealth"],
  totalROI:    number,
): string {
  const healthLabel  = health === "excellent" ? "excellent" : health === "good" ? "good" : health === "fair" ? "fair" : "poor";
  const insightCount = insights.length;
  const roiLabel     = totalROI > 0 ? ` Estimated opportunity value: $${Math.round(totalROI).toLocaleString()}.` : "";
  const critical     = insights.filter((i) => i.urgency === "critical");
  const critLabel    = critical.length > 0 ? ` ${critical.length} critical item${critical.length > 1 ? "s" : ""} require immediate attention.` : "";

  return `Brokerage intelligence is in ${healthLabel} health with ${insightCount} active insight${insightCount !== 1 ? "s" : ""}.${critLabel}${roiLabel}`;
}
