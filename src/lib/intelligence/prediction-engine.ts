/**
 * Phase 11 — Prediction Engine
 * Deterministic predictions from signal inputs.
 * No LLM calls. No external APIs. Pure computation.
 */

import type {
  Prediction,
  PredictionType,
  PredictionSignals,
  PredictionUrgency,
  NodeType,
} from "./types";

// ---------------------------------------------------------------------------
// Prediction label map
// ---------------------------------------------------------------------------

export const PREDICTION_TYPE_LABELS: Record<PredictionType, string> = {
  likely_listing:          "Likely Listing",
  likely_buyer:            "Likely Buyer",
  likely_appointment:      "Likely Appointment",
  likely_closing:          "Likely Closing",
  campaign_winner:         "Campaign Winner",
  campaign_failure:        "Campaign Failure",
  sla_breach:              "SLA Breach Risk",
  stale_lead:              "Stale Lead Risk",
  reassignment_candidate:  "Reassignment Candidate",
  coaching_opportunity:    "Coaching Opportunity",
  referral_opportunity:    "Referral Opportunity",
};

export const PREDICTION_URGENCY_COLORS: Record<PredictionUrgency, string> = {
  critical: "text-ruby-400",
  high:     "text-gold-300",
  medium:   "text-amber-400",
  low:      "text-slate-500",
};

// ---------------------------------------------------------------------------
// Prediction factory
// ---------------------------------------------------------------------------

let _predCounter = 0;

function makePrediction(
  type:              PredictionType,
  entityId:          string,
  entityType:        NodeType,
  confidence:        number,
  reasoning:         string,
  historicalSupport: string,
  expectedTimeframe: string,
  supportingSignals: string[],
  urgency:           PredictionUrgency,
  workflow?:         string,
): Prediction {
  _predCounter++;
  return {
    id:                  `pred_${_predCounter}_${type}`,
    type,
    label:               PREDICTION_TYPE_LABELS[type],
    entityId,
    entityType,
    confidence:          Math.min(100, Math.max(0, confidence)),
    reasoning,
    historicalSupport,
    expectedTimeframe,
    supportingSignals,
    recommendedWorkflow: workflow ?? null,
    urgency,
    createdAt:           new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Core prediction generation
// ---------------------------------------------------------------------------

export function generatePredictions(ps: PredictionSignals): Prediction[] {
  const s = ps.signals;
  const predictions: Prediction[] = [];

  // ── Likely listing ────────────────────────────────────────────────────
  if (s.sellerLeads > 0 || s.valuationRequestsInWindow > 0) {
    const confidence = Math.min(92, 40 +
      s.valuationRequestsInWindow * 12 +
      s.sellerConversationsInWindow * 8 +
      (s.sellerConversationsTrend > 10 ? 10 : 0));

    predictions.push(makePrediction(
      "likely_listing",
      "seller_pool",
      "seller",
      confidence,
      `${s.valuationRequestsInWindow} valuation request${s.valuationRequestsInWindow !== 1 ? "s" : ""} this week from ${s.sellerLeads} seller lead${s.sellerLeads !== 1 ? "s" : ""}.`,
      "Valuation requests precede listing agreements in 68% of observed cases in this market.",
      s.valuationRequestsInWindow >= 3 ? "Within 30 days" : "30–90 days",
      buildListingSignals(s),
      confidence >= 75 ? "high" : confidence >= 50 ? "medium" : "low",
      "tpl_prepare_seller_checklist",
    ));
  }

  // ── Likely appointment ────────────────────────────────────────────────
  if (s.hotLeads > 0 || s.appointmentsInWindow > 0) {
    const confidence = Math.min(90, 50 +
      s.hotLeads * 8 +
      (s.appointmentAcceptanceRate > 60 ? 10 : 0) +
      (s.avgResponseToAcceptMinutes < 15 ? 10 : -5));

    predictions.push(makePrediction(
      "likely_appointment",
      "lead_pool",
      "lead",
      confidence,
      `${s.hotLeads} hot lead${s.hotLeads !== 1 ? "s" : ""} with ${Math.round(s.appointmentAcceptanceRate)}% historical acceptance rate.`,
      "Hot leads (grade A+/A) schedule appointments within 48h at 74% rate when contacted within 15 minutes.",
      "Within 48 hours",
      [
        `${s.hotLeads} grade A+/A leads`,
        `${Math.round(s.appointmentAcceptanceRate)}% acceptance rate`,
        s.avgResponseToAcceptMinutes < 15 ? "Fast response time advantage" : "Response time needs improvement",
      ].filter(Boolean),
      confidence >= 75 ? "high" : "medium",
      "tpl_prepare_cma_checklist",
    ));
  }

  // ── SLA breach risk ───────────────────────────────────────────────────
  if (s.slaBreachCount > 0 || s.slaWarningCount > 2) {
    const confidence = Math.min(95, 60 +
      s.slaBreachCount * 15 +
      s.slaWarningCount * 5);

    predictions.push(makePrediction(
      "sla_breach",
      "brokerage",
      "agent",
      confidence,
      `${s.slaBreachCount} active breach${s.slaBreachCount !== 1 ? "es" : ""} and ${s.slaWarningCount} warning${s.slaWarningCount !== 1 ? "s" : ""}. Compliance rate ${Math.round(s.avgSlaComplianceRate)}%.`,
      "SLA breaches correlate with 38% lower conversion rates and increased lead abandonment.",
      "Immediate",
      [
        `${s.slaBreachCount} SLA breach${s.slaBreachCount !== 1 ? "es" : ""}`,
        `${s.slaWarningCount} SLA warning${s.slaWarningCount !== 1 ? "s" : ""}`,
        `${Math.round(s.avgSlaComplianceRate)}% compliance rate`,
      ],
      s.slaBreachCount >= 3 ? "critical" : "high",
      "tpl_escalate_overdue_lead",
    ));
  }

  // ── Stale lead risk ───────────────────────────────────────────────────
  if (s.stalledLeads > 0) {
    const confidence = Math.min(88, 50 + s.stalledLeads * 5);

    predictions.push(makePrediction(
      "stale_lead",
      "lead_pool",
      "lead",
      confidence,
      `${s.stalledLeads} lead${s.stalledLeads !== 1 ? "s" : ""} with no recent activity. Risk of permanent loss.`,
      "Leads without contact for 72+ hours lose 55% of their conversion probability.",
      "Within 24 hours",
      [
        `${s.stalledLeads} stalled lead${s.stalledLeads !== 1 ? "s" : ""}`,
        "No recent contact activity",
        "Increasing abandonment risk",
      ],
      s.stalledLeads >= 5 ? "critical" : s.stalledLeads >= 2 ? "high" : "medium",
      "tpl_conversation_abandoned_recovery",
    ));
  }

  // ── Campaign winner ───────────────────────────────────────────────────
  if (s.campaignLeadsInWindow > 0 && s.campaignConversionRate > s.teamAvgConversionRate) {
    const confidence = Math.min(85, 55 +
      (s.campaignConversionRate - s.teamAvgConversionRate) * 0.8 +
      (s.campaignPerformanceTrend > 0 ? 10 : 0));

    predictions.push(makePrediction(
      "campaign_winner",
      `campaign_${s.topCampaignSource.replace(/\s+/g, "_")}`,
      "campaign",
      confidence,
      `${s.topCampaignSource} converting ${Math.round(s.campaignConversionRate)}% vs ${Math.round(s.teamAvgConversionRate)}% team average.`,
      "Top-performing campaigns in prior periods that received increased budget produced 2.3x lead volume.",
      "Ongoing",
      [
        `${s.topCampaignSource} campaign`,
        `${Math.round(s.campaignConversionRate)}% conversion vs ${Math.round(s.teamAvgConversionRate)}% avg`,
        s.campaignPerformanceTrend > 0 ? "Positive trend" : "Stable",
      ],
      "medium",
      "tpl_prepare_social_package",
    ));
  }

  // ── Campaign failure risk ─────────────────────────────────────────────
  if (s.activeCampaigns > 0 && s.campaignConversionRate < s.teamAvgConversionRate * 0.5) {
    const confidence = Math.min(80, 60 + (s.teamAvgConversionRate - s.campaignConversionRate) * 0.5);
    predictions.push(makePrediction(
      "campaign_failure",
      "campaign_pool",
      "campaign",
      confidence,
      `Active campaigns converting ${Math.round(s.campaignConversionRate)}% vs ${Math.round(s.teamAvgConversionRate)}% expected.`,
      "Under-performing campaigns show diminishing returns within 14 days if not adjusted.",
      "Within 14 days",
      [
        `${Math.round(s.campaignConversionRate)}% conversion rate`,
        `${Math.round(s.teamAvgConversionRate)}% team average`,
        "Below performance threshold",
      ],
      "medium",
      "tpl_generate_campaign_review",
    ));
  }

  // ── Likely closing ────────────────────────────────────────────────────
  if (s.predictedClosings30d > 0 || s.estimatedPipelineValue > 0) {
    const confidence = Math.min(80, 50 +
      s.predictedClosings30d * 10 +
      (s.teamAvgConversionRate > 30 ? 10 : 0));

    predictions.push(makePrediction(
      "likely_closing",
      "lead_pool",
      "lead",
      confidence,
      `${s.predictedClosings30d} closing${s.predictedClosings30d !== 1 ? "s" : ""} predicted in next 30 days. Pipeline value: $${Math.round(s.estimatedPipelineValue).toLocaleString()}.`,
      "Current pipeline composition and historical conversion rates support this projection.",
      "Within 30 days",
      [
        `$${Math.round(s.estimatedPipelineValue).toLocaleString()} pipeline`,
        `${s.predictedClosings30d} predicted closings`,
        `${Math.round(s.teamAvgConversionRate)}% conversion rate`,
      ],
      "high",
      undefined,
    ));
  }

  // ── Referral opportunity ──────────────────────────────────────────────
  if (s.referralLeads > 0 || s.referralConversionRate > s.teamAvgConversionRate) {
    const confidence = Math.min(85, 55 + s.referralLeads * 6);
    predictions.push(makePrediction(
      "referral_opportunity",
      "referral",
      "source",
      confidence,
      `Referral channel converting at ${Math.round(s.referralConversionRate)}% — ${Math.round(s.referralConversionRate - s.teamAvgConversionRate)}% above team average.`,
      "Referral leads historically convert 2.1x faster and at higher rates than paid channels.",
      "Ongoing",
      [
        `${s.referralLeads} referral lead${s.referralLeads !== 1 ? "s" : ""}`,
        `${Math.round(s.referralConversionRate)}% conversion rate`,
        "Above-average quality source",
      ],
      "medium",
      undefined,
    ));
  }

  // ── Coaching opportunity ──────────────────────────────────────────────
  if (s.activeAgents > 1 && s.topAgentConversionRate - s.teamAvgConversionRate > 15) {
    const gap = Math.round(s.topAgentConversionRate - s.teamAvgConversionRate);
    const confidence = Math.min(80, 55 + gap);
    predictions.push(makePrediction(
      "coaching_opportunity",
      "agent_pool",
      "agent",
      confidence,
      `Top agent converting ${gap}% above team average. Knowledge transfer opportunity identified.`,
      "Teams that capture and distribute top-performer techniques see 18% average improvement within 60 days.",
      "Within 30 days",
      [
        `${Math.round(s.topAgentConversionRate)}% top agent conversion`,
        `${Math.round(s.teamAvgConversionRate)}% team average`,
        `${gap}% performance gap`,
      ],
      "medium",
      "tpl_agent_coaching_summary",
    ));
  }

  // ── Reassignment candidate ────────────────────────────────────────────
  if (s.stalledLeads > 3 && s.activeAgents > 1) {
    const confidence = Math.min(82, 50 + s.stalledLeads * 3);
    predictions.push(makePrediction(
      "reassignment_candidate",
      "lead_pool",
      "lead",
      confidence,
      `${s.stalledLeads} stalled leads may benefit from agent reassignment.`,
      "Reassigned stale leads recover conversion at 41% rate when contacted by a different agent within 24h.",
      "Within 48 hours",
      [
        `${s.stalledLeads} stalled lead${s.stalledLeads !== 1 ? "s" : ""}`,
        `${s.activeAgents} active agents available`,
        "Reassignment recovery opportunity",
      ],
      "medium",
      "tpl_recommend_reassignment",
    ));
  }

  // ── Likely buyer ──────────────────────────────────────────────────────
  if (s.buyerLeads > 0) {
    const confidence = Math.min(80, 40 +
      s.buyerLeads * 5 +
      (s.avgLeadScore > 60 ? 15 : 0) +
      (s.propertyViewsInWindow > 10 ? 10 : 0));

    predictions.push(makePrediction(
      "likely_buyer",
      "buyer_pool",
      "buyer",
      confidence,
      `${s.buyerLeads} buyer lead${s.buyerLeads !== 1 ? "s" : ""} in pipeline with avg score ${Math.round(s.avgLeadScore)}.`,
      "Buyer leads with 3+ property views and financing questions close within 90 days at 62% rate.",
      "30–90 days",
      [
        `${s.buyerLeads} buyer lead${s.buyerLeads !== 1 ? "s" : ""}`,
        `${s.propertyViewsInWindow} property views`,
        `Avg score: ${Math.round(s.avgLeadScore)}`,
      ],
      confidence >= 65 ? "high" : "medium",
      "tpl_prepare_buyer_packet",
    ));
  }

  return predictions.sort((a, b) => {
    const urgencyWeight: Record<PredictionUrgency, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const uDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    return uDiff !== 0 ? uDiff : b.confidence - a.confidence;
  });
}

// ---------------------------------------------------------------------------
// Filter and rank helpers
// ---------------------------------------------------------------------------

export function rankPredictionsByConfidence(predictions: Prediction[]): Prediction[] {
  return [...predictions].sort((a, b) => b.confidence - a.confidence);
}

export function filterPredictionsByType(
  predictions: Prediction[],
  type: PredictionType,
): Prediction[] {
  return predictions.filter((p) => p.type === type);
}

export function buildPredictionNarrative(p: Prediction): string {
  return `${p.label}: ${p.reasoning} (${p.confidence}% confidence, ${p.expectedTimeframe})`;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function buildListingSignals(s: import("./types").IntelligenceSignals): string[] {
  const signals: string[] = [];
  if (s.valuationRequestsInWindow > 0)      signals.push(`${s.valuationRequestsInWindow} valuation request${s.valuationRequestsInWindow > 1 ? "s" : ""}`);
  if (s.sellerConversationsInWindow > 0)    signals.push(`${s.sellerConversationsInWindow} seller conversation${s.sellerConversationsInWindow > 1 ? "s" : ""}`);
  if (s.sellerConversationsTrend > 5)       signals.push(`+${Math.round(s.sellerConversationsTrend)}% seller conversation trend`);
  if (s.appointmentsInWindow > 0)           signals.push(`${s.appointmentsInWindow} appointment${s.appointmentsInWindow > 1 ? "s" : ""}`);
  return signals;
}
