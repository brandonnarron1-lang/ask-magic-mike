/**
 * Phase 11 — Opportunity Engine
 * Discovers, ranks, and narrates brokerage opportunities.
 * Deterministic. No external APIs. Pure computation.
 */

import type {
  Opportunity,
  Risk,
  OpportunitySignals,
  OpportunityCategory,
  PredictionUrgency,
} from "./types";

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const OPPORTUNITY_CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  seller_listing:       "Seller Listing",
  buyer_purchase:       "Buyer Purchase",
  campaign_optimization: "Campaign Optimization",
  agent_coaching:       "Agent Coaching",
  lead_reactivation:    "Lead Reactivation",
  referral_capture:     "Referral Capture",
  market_expansion:     "Market Expansion",
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _oppCounter = 0;

function makeOpportunity(
  category:           OpportunityCategory,
  title:              string,
  description:        string,
  businessValue:      number,
  confidence:         number,
  urgency:            PredictionUrgency,
  ease:               "easy" | "moderate" | "complex",
  expectedCommission: number,
  expectedAppts:      number,
  expectedListings:   number,
  expectedBuyers:     number,
  effortHours:        number,
  actions:            string[],
  data:               Record<string, string | number | boolean>,
): Opportunity {
  _oppCounter++;
  const roi = businessValue > 0 && effortHours > 0
    ? Math.round((businessValue / (effortHours * 50)) * 10) / 10
    : 0;

  return {
    id:                   `opp_${_oppCounter}`,
    category,
    title,
    description,
    businessValue:        Math.round(businessValue),
    confidence:           Math.min(100, Math.max(0, confidence)),
    urgency,
    ease,
    expectedCommission:   Math.round(expectedCommission),
    expectedAppointments: expectedAppts,
    expectedListings,
    expectedBuyers,
    estimatedEffortHours: effortHours,
    recommendedActions:   actions,
    supportingData:       data,
    rank:                 _oppCounter,
    roi,
  };
}

// ---------------------------------------------------------------------------
// Core discovery
// ---------------------------------------------------------------------------

const AVG_COMMISSION = 6_600;   // 3% of ~$220K average home
const LEAD_VALUE     = 2_200;   // avg lead-to-commission attribution

export function discoverOpportunities(os: OpportunitySignals): Opportunity[] {
  const s = os.signals;
  const opps: Opportunity[] = [];

  // ── 1. Seller listing opportunity ─────────────────────────────────────
  if (s.sellerLeads > 0 || s.valuationRequestsInWindow > 0) {
    const listingCount = Math.max(1, Math.ceil(s.sellerLeads * 0.35));
    const value        = listingCount * AVG_COMMISSION;
    const conf         = Math.min(88, 45 + s.valuationRequestsInWindow * 10 + s.sellerLeads * 4);

    opps.push(makeOpportunity(
      "seller_listing",
      "Convert Seller Leads to Listing Agreements",
      `${s.sellerLeads} seller lead${s.sellerLeads !== 1 ? "s" : ""} in the pipeline with ${s.valuationRequestsInWindow} valuation request${s.valuationRequestsInWindow !== 1 ? "s" : ""} this week. High-readiness segment ready for conversion.`,
      value,
      conf,
      s.valuationRequestsInWindow >= 3 ? "high" : "medium",
      "easy",
      AVG_COMMISSION * listingCount,
      Math.ceil(listingCount * 0.8),
      listingCount,
      0,
      listingCount * 2,
      [
        "Deliver CMA to top valuation request leads",
        "Schedule listing appointments",
        "Prepare seller checklist packets",
        "Assign highest-converting agent",
      ],
      { sellerLeads: s.sellerLeads, valuationRequests: s.valuationRequestsInWindow, projectedListings: listingCount },
    ));
  }

  // ── 2. Buyer purchase opportunity ──────────────────────────────────────
  if (s.buyerLeads > 0) {
    const closeCount = Math.max(1, Math.ceil(s.buyerLeads * (s.teamAvgConversionRate / 100)));
    const value      = closeCount * AVG_COMMISSION;
    const conf       = Math.min(82, 40 + s.buyerLeads * 3 + (s.avgLeadScore > 60 ? 12 : 0));

    opps.push(makeOpportunity(
      "buyer_purchase",
      "Close Active Buyer Pipeline",
      `${s.buyerLeads} buyer lead${s.buyerLeads !== 1 ? "s" : ""} with ${Math.round(s.teamAvgConversionRate)}% historical conversion rate. ${closeCount} projected closing${closeCount !== 1 ? "s" : ""}.`,
      value,
      conf,
      "medium",
      "moderate",
      AVG_COMMISSION * closeCount,
      Math.ceil(s.buyerLeads * 0.6),
      0,
      closeCount,
      closeCount * 3,
      [
        "Send curated property selections",
        "Introduce preferred lender partners",
        "Schedule buyer consultations",
        "Follow up on property views",
      ],
      { buyerLeads: s.buyerLeads, projectedClosings: closeCount, pipelineValue: s.estimatedPipelineValue },
    ));
  }

  // ── 3. Campaign optimization ───────────────────────────────────────────
  if (s.activeCampaigns > 0 && s.topCampaignSource) {
    const currentValue = s.campaignLeadsInWindow * LEAD_VALUE;
    const upliftValue  = currentValue * 0.35;   // 35% improvement potential
    const conf         = Math.min(78, 50 + (s.campaignConversionRate > s.teamAvgConversionRate ? 15 : 0) + (s.campaignPerformanceTrend > 5 ? 10 : 0));

    opps.push(makeOpportunity(
      "campaign_optimization",
      `Amplify ${s.topCampaignSource} Campaign Performance`,
      `${s.topCampaignSource} is the top-performing source with ${s.campaignLeadsInWindow} lead${s.campaignLeadsInWindow !== 1 ? "s" : ""} this week. Increasing investment could deliver 35% more volume.`,
      upliftValue,
      conf,
      "medium",
      "easy",
      upliftValue * 0.4,
      Math.ceil(s.campaignLeadsInWindow * 0.25),
      Math.ceil(s.campaignLeadsInWindow * 0.08),
      Math.ceil(s.campaignLeadsInWindow * 0.12),
      4,
      [
        `Increase budget allocation to ${s.topCampaignSource}`,
        "A/B test ad creative variations",
        "Review landing page conversion rates",
        "Build lookalike audiences from converted leads",
      ],
      { topSource: s.topCampaignSource, campaignLeads: s.campaignLeadsInWindow, projectedUplift: Math.round(upliftValue) },
    ));
  }

  // ── 4. Lead reactivation ───────────────────────────────────────────────
  if (s.stalledLeads > 0) {
    const reactivateCount = Math.ceil(s.stalledLeads * 0.35);   // 35% reactivation rate
    const value           = reactivateCount * LEAD_VALUE;
    const conf            = Math.min(75, 50 + s.stalledLeads * 4);

    opps.push(makeOpportunity(
      "lead_reactivation",
      "Reactivate Stalled Lead Pipeline",
      `${s.stalledLeads} lead${s.stalledLeads !== 1 ? "s" : ""} with no recent activity. A targeted re-engagement campaign could recover ${reactivateCount}.`,
      value,
      conf,
      s.stalledLeads >= 5 ? "high" : "medium",
      "easy",
      reactivateCount * AVG_COMMISSION * 0.4,
      reactivateCount,
      0,
      reactivateCount,
      2,
      [
        "Launch re-engagement email sequence",
        "Assign to different agent for fresh contact",
        "Send market update with relevant listings",
        "Offer new valuation or buyer consultation",
      ],
      { stalledLeads: s.stalledLeads, projectedReactivations: reactivateCount },
    ));
  }

  // ── 5. Referral capture ────────────────────────────────────────────────
  if (s.referralLeads > 0 || s.referralConversionRate > s.teamAvgConversionRate) {
    const value = s.referralLeads * LEAD_VALUE * 1.5;   // Referrals worth 1.5x
    const conf  = Math.min(85, 55 + s.referralLeads * 8);

    opps.push(makeOpportunity(
      "referral_capture",
      "Expand Referral Network",
      `Referral channel converting at ${Math.round(s.referralConversionRate)}% — above average. ${s.referralLeads} active referral lead${s.referralLeads !== 1 ? "s" : ""}.`,
      value,
      conf,
      "medium",
      "easy",
      s.referralLeads * AVG_COMMISSION * 0.5,
      Math.ceil(s.referralLeads * 0.8),
      Math.ceil(s.referralLeads * 0.2),
      Math.ceil(s.referralLeads * 0.3),
      2,
      [
        "Implement referral recognition program",
        "Send thank-you packages to referral sources",
        "Create shareable market content for advocates",
        "Track referral attribution meticulously",
      ],
      { referralLeads: s.referralLeads, referralConversionRate: s.referralConversionRate },
    ));
  }

  // ── 6. Agent coaching ──────────────────────────────────────────────────
  if (s.activeAgents > 1 && s.topAgentConversionRate - s.teamAvgConversionRate > 10) {
    const gap       = s.topAgentConversionRate - s.teamAvgConversionRate;
    const agentsBelow = Math.ceil(s.activeAgents * 0.6);
    const uplift    = agentsBelow * (gap / 100) * 5 * LEAD_VALUE;   // potential lift
    const conf      = Math.min(80, 50 + gap);

    opps.push(makeOpportunity(
      "agent_coaching",
      "Replicate Top Agent Performance Across Team",
      `Top agent converts ${Math.round(gap)}% above team average. Codifying their approach could lift ${agentsBelow} agent${agentsBelow !== 1 ? "s" : ""}.`,
      uplift,
      conf,
      "medium",
      "moderate",
      uplift * 0.5,
      Math.ceil(agentsBelow * 2),
      Math.ceil(agentsBelow * 0.3),
      Math.ceil(agentsBelow * 0.5),
      agentsBelow * 3,
      [
        "Conduct top-performer knowledge capture session",
        "Build coaching playbook from best practices",
        "Schedule weekly performance review",
        "Pair lowest-converting agents for mentorship",
      ],
      { topConversionRate: s.topAgentConversionRate, teamAvg: s.teamAvgConversionRate, gap: Math.round(gap) },
    ));
  }

  // ── 7. Market expansion ────────────────────────────────────────────────
  if (s.totalLeads > 50 && s.topNeighborhood) {
    const neighborCount = Object.keys(s.neighborhoodLeadCounts).length;
    if (neighborCount < 5) {
      const value = 8 * AVG_COMMISSION;   // 8 listings from expansion
      opps.push(makeOpportunity(
        "market_expansion",
        `Expand Presence in ${s.topNeighborhood} Area`,
        `${Math.round((s.neighborhoodLeadCounts[s.topNeighborhood] ?? 0) / Math.max(1, s.totalLeads) * 100)}% of leads concentrate in ${s.topNeighborhood}. Systematic neighborhood farming can deepen market share.`,
        value,
        65,
        "low",
        "complex",
        value * 0.5,
        8,
        4,
        4,
        20,
        [
          `Launch ${s.topNeighborhood} targeted campaign`,
          "Create neighborhood market report",
          "Schedule door-knocking events",
          "Build social proof through local testimonials",
        ],
        { topNeighborhood: s.topNeighborhood, leadConcentration: s.neighborhoodLeadCounts[s.topNeighborhood] ?? 0 },
      ));
    }
  }

  // Rank by composite score (business value × confidence)
  return rankByROI(opps).map((opp, i) => ({ ...opp, rank: i + 1 }));
}

// ---------------------------------------------------------------------------
// Ranking helpers
// ---------------------------------------------------------------------------

export function rankByROI(opportunities: Opportunity[]): Opportunity[] {
  return [...opportunities].sort((a, b) => {
    const scoreA = a.roi * 0.4 + a.confidence * 0.35 + (a.ease === "easy" ? 15 : a.ease === "moderate" ? 8 : 0) * 0.25;
    const scoreB = b.roi * 0.4 + b.confidence * 0.35 + (b.ease === "easy" ? 15 : b.ease === "moderate" ? 8 : 0) * 0.25;
    return scoreB - scoreA;
  });
}

export function getTopOpportunities(opportunities: Opportunity[], n = 5): Opportunity[] {
  return rankByROI(opportunities).slice(0, n);
}

export function getFastestWin(opportunities: Opportunity[]): Opportunity | null {
  const easy = opportunities.filter((o) => o.ease === "easy");
  if (easy.length === 0) return opportunities[0] ?? null;
  return easy.sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}

export function getLargestPipelineOpportunity(opportunities: Opportunity[]): Opportunity | null {
  return [...opportunities].sort((a, b) => b.businessValue - a.businessValue)[0] ?? null;
}

// ---------------------------------------------------------------------------
// Risk discovery
// ---------------------------------------------------------------------------

export function getTopRisks(os: OpportunitySignals): Risk[] {
  const s = os.signals;
  const risks: Risk[] = [];

  if (s.slaBreachCount > 0) {
    risks.push({
      id:          "risk_sla",
      category:    "Compliance",
      title:       "Active SLA Breaches",
      description: `${s.slaBreachCount} SLA breach${s.slaBreachCount !== 1 ? "es" : ""} detected. Leads at risk of permanent loss.`,
      severity:    s.slaBreachCount >= 3 ? "critical" : "high",
      confidence:  90,
      likelihood:  88,
      mitigation:  "Escalate immediately via tpl_escalate_overdue_lead workflow",
    });
  }

  if (s.stalledLeads > 2) {
    risks.push({
      id:          "risk_stale",
      category:    "Lead Quality",
      title:       "Stalling Lead Pipeline",
      description: `${s.stalledLeads} lead${s.stalledLeads !== 1 ? "s" : ""} with no recent activity. Permanent abandonment risk rising.`,
      severity:    "high",
      confidence:  82,
      likelihood:  75,
      mitigation:  "Launch re-engagement campaign within 24 hours",
    });
  }

  if (s.avgResponseToAcceptMinutes > 18) {
    risks.push({
      id:          "risk_response",
      category:    "Operations",
      title:       "Slow Response Degrading Appointments",
      description: `Average response time ${Math.round(s.avgResponseToAcceptMinutes)} minutes exceeds 18-minute optimal threshold.`,
      severity:    "medium",
      confidence:  78,
      likelihood:  70,
      mitigation:  "Implement auto-response rules and agent alert system",
    });
  }

  if (s.campaignConversionRate < s.teamAvgConversionRate * 0.5) {
    risks.push({
      id:          "risk_campaign",
      category:    "Marketing",
      title:       "Under-Performing Campaign Spend",
      description: "Active campaigns converting well below team average. Budget burning without return.",
      severity:    "medium",
      confidence:  72,
      likelihood:  65,
      mitigation:  "Pause worst-performing campaigns, redirect budget to proven channels",
    });
  }

  if (s.missedAppointmentsInWindow > 2) {
    risks.push({
      id:          "risk_missed_appt",
      category:    "Revenue",
      title:       "Appointment No-Show Pattern",
      description: `${s.missedAppointmentsInWindow} missed appointment${s.missedAppointmentsInWindow !== 1 ? "s" : ""} this week. Conversion pipeline leaking.`,
      severity:    "high",
      confidence:  85,
      likelihood:  80,
      mitigation:  "Implement 24h/2h appointment reminder sequence",
    });
  }

  if (s.avgHealthScore < 60) {
    risks.push({
      id:          "risk_health",
      category:    "Operations",
      title:       "Below-Target Brokerage Health Score",
      description: `Overall health score ${Math.round(s.avgHealthScore)}/100. Multiple systems underperforming.`,
      severity:    s.avgHealthScore < 40 ? "critical" : "high",
      confidence:  80,
      likelihood:  85,
      mitigation:  "Review all SLA, conversion, and response time metrics",
    });
  }

  if (s.newLeadsInWindow === 0 && s.totalLeads > 10) {
    risks.push({
      id:          "risk_lead_drought",
      category:    "Marketing",
      title:       "Zero New Leads This Window",
      description: "No new leads captured this week. Marketing pipeline may be broken.",
      severity:    "critical",
      confidence:  88,
      likelihood:  90,
      mitigation:  "Audit lead capture forms, ad campaigns, and funnel tracking immediately",
    });
  }

  return risks.sort((a, b) => {
    const sev: Record<PredictionUrgency, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return sev[b.severity] - sev[a.severity] || b.confidence - a.confidence;
  }).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Highest confidence opportunity
// ---------------------------------------------------------------------------

export function getHighestConfidenceOpportunity(opportunities: Opportunity[]): Opportunity | null {
  return [...opportunities].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}
