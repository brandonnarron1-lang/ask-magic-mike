/**
 * Phase 11 — Buyer Intelligence Engine
 * Purchase probability, time horizon, and next best action.
 * Pure functions — complements existing buyer-score.ts (does not replace it).
 */

import type {
  BuyerReadiness,
  BuyerSignalInput,
  BuyerSignal,
  BuyerTimeHorizon,
  IntelligenceSignals,
} from "./types";

// ---------------------------------------------------------------------------
// Core readiness scoring
// ---------------------------------------------------------------------------

export function scoreBuyerReadiness(s: BuyerSignalInput): BuyerReadiness {
  // Build active signal list
  const activeSignals: BuyerSignal[] = [];
  if (s.hasFinancingQuestion)    activeSignals.push("financing_question");
  if (s.hasLocationQuestion)     activeSignals.push("location_question");
  if (s.hasSchoolQuestion)       activeSignals.push("school_question");
  if (s.hasPriceRange)           activeSignals.push("price_range_specified");
  if (s.savedPropertyCount > 0)  activeSignals.push("saved_properties");
  if (s.conversationCount > 2)   activeSignals.push("multiple_conversations");
  if (s.hasAppointmentRequest)   activeSignals.push("appointment_requested");
  if (s.repeatSearchCount > 0)   activeSignals.push("repeat_search");
  if (s.hasMarketTimingQuestion) activeSignals.push("market_timing_question");
  if (s.hasUrgencySignal)        activeSignals.push("urgency_indicated");

  // Weighted readiness score
  const readinessScore = Math.min(100, Math.round(
    (s.hasFinancingQuestion   ? 15 : 0) +
    (s.hasLocationQuestion    ? 8  : 0) +
    (s.hasSchoolQuestion      ? 6  : 0) +
    (s.hasPriceRange          ? 12 : 0) +
    (s.savedPropertyCount     * 5)      +
    (s.conversationCount      * 4)      +
    (s.hasAppointmentRequest  ? 20 : 0) +
    (s.repeatSearchCount      * 6)      +
    (s.hasMarketTimingQuestion ? 8 : 0) +
    (s.hasUrgencySignal       ? 15 : 0)
  ));

  // Purchase probability
  const purchaseProbability = Math.min(100, Math.round(
    readinessScore * 0.75 +
    (s.hasFinancingQuestion ? 10 : 0) +
    (s.hasPriceRange        ? 8  : 0) +
    (s.hasUrgencySignal     ? 7  : 0)
  ));

  // Time horizon
  const timeHorizon: BuyerTimeHorizon =
    readinessScore >= 85 && s.hasUrgencySignal                            ? "immediate"  :
    readinessScore >= 75 && s.hasAppointmentRequest                       ? "0-30d"     :
    readinessScore >= 60 && (s.hasFinancingQuestion || s.hasPriceRange)   ? "30-90d"    :
    readinessScore >= 40                                                   ? "90-180d"   :
    readinessScore >= 20                                                   ? "180d+"     : "browsing";

  // Confidence — data richness
  const confidence = Math.min(95, 35 + activeSignals.length * 7);

  // Next best action
  const nextBestAction: string =
    s.hasAppointmentRequest ? "Confirm appointment and send property selections" :
    s.hasPriceRange && !s.hasFinancingQuestion ? "Schedule lender introduction call" :
    s.savedPropertyCount > 2 ? "Send curated property list matching saved searches" :
    s.conversationCount > 1  ? "Schedule buyer consultation" :
    "Send market update and follow-up check-in";

  // Recommendations
  const recommendations: string[] = [];
  if (readinessScore >= 70)          recommendations.push("Schedule buyer consultation immediately");
  if (!s.hasFinancingQuestion && readinessScore >= 50) recommendations.push("Introduce preferred lender");
  if (s.savedPropertyCount > 0)      recommendations.push("Match saved searches to active listings");
  if (s.hasAppointmentRequest)       recommendations.push("Confirm showings and prepare tour packet");
  if (s.hasMarketTimingQuestion)     recommendations.push("Send market timing analysis");
  if (timeHorizon === "browsing")    recommendations.push("Add to nurture campaign");

  // Reasoning
  const topSignals = activeSignals.slice(0, 3).map((sg) => BUYER_SIGNAL_LABELS[sg]).join(", ");
  const reasoning = `Score ${readinessScore}/100 with ${activeSignals.length} active signal${activeSignals.length !== 1 ? "s" : ""}: ${topSignals || "initial contact"}. Time horizon: ${timeHorizon}.`;

  return {
    leadId:              s.leadId,
    readinessScore,
    purchaseProbability,
    timeHorizon,
    confidence,
    signals:             activeSignals,
    recommendations,
    nextBestAction,
    reasoning,
  };
}

// ---------------------------------------------------------------------------
// Rank buyers by purchase probability
// ---------------------------------------------------------------------------

export function rankBuyersByPurchaseProbability(buyers: BuyerReadiness[]): BuyerReadiness[] {
  return [...buyers].sort((a, b) => b.purchaseProbability - a.purchaseProbability);
}

// ---------------------------------------------------------------------------
// Filter to active buyers (high probability)
// ---------------------------------------------------------------------------

export function identifyActiveBuyers(
  buyers: BuyerReadiness[],
  minProbability = 60,
): BuyerReadiness[] {
  return buyers.filter((b) => b.purchaseProbability >= minProbability);
}

// ---------------------------------------------------------------------------
// Human narrative
// ---------------------------------------------------------------------------

export function buildBuyerNarrative(r: BuyerReadiness): string {
  return `${r.purchaseProbability}% purchase probability, time horizon: ${r.timeHorizon}. Next action: ${r.nextBestAction}.`;
}

// ---------------------------------------------------------------------------
// Derive buyer signal inputs from brokerage intelligence
// ---------------------------------------------------------------------------

export function deriveBuyerSignalsFromBrokerage(
  signals: IntelligenceSignals,
): BuyerSignalInput[] {
  if (signals.buyerLeads === 0) return [];

  return [
    {
      leadId:                  "buyer_hot",
      hasFinancingQuestion:    signals.avgConversationDepth > 5,
      hasLocationQuestion:     true,
      hasSchoolQuestion:       signals.buyerConversationsInWindow > 1,
      hasPriceRange:           signals.avgLeadScore > 50,
      savedPropertyCount:      Math.ceil(signals.propertyViewsInWindow * 0.15),
      conversationCount:       Math.min(signals.buyerConversationsInWindow, 5),
      hasAppointmentRequest:   signals.appointmentsInWindow > 0,
      repeatSearchCount:       Math.ceil(signals.propertyViewsInWindow * 0.2),
      hasMarketTimingQuestion: signals.avgConversationDepth > 4,
      hasUrgencySignal:        signals.hotLeads > 0,
      daysSinceFirstContact:   14,
    },
    {
      leadId:                  "buyer_warm",
      hasFinancingQuestion:    false,
      hasLocationQuestion:     true,
      hasSchoolQuestion:       false,
      hasPriceRange:           false,
      savedPropertyCount:      1,
      conversationCount:       2,
      hasAppointmentRequest:   false,
      repeatSearchCount:       1,
      hasMarketTimingQuestion: false,
      hasUrgencySignal:        false,
      daysSinceFirstContact:   45,
    },
  ];
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const BUYER_SIGNAL_LABELS: Record<BuyerSignal, string> = {
  financing_question:     "Financing Question",
  location_question:      "Location Question",
  school_question:        "School Question",
  price_range_specified:  "Price Range Specified",
  saved_properties:       "Saved Properties",
  multiple_conversations: "Multiple Conversations",
  appointment_requested:  "Appointment Requested",
  repeat_search:          "Repeat Search",
  market_timing_question: "Market Timing Question",
  urgency_indicated:      "Urgency Indicated",
};

export const TIME_HORIZON_LABELS: Record<BuyerTimeHorizon, string> = {
  immediate: "Immediate",
  "0-30d":   "Within 30 Days",
  "30-90d":  "1–3 Months",
  "90-180d": "3–6 Months",
  "180d+":   "6+ Months",
  browsing:  "Browsing",
};

export const TIME_HORIZON_COLORS: Record<BuyerTimeHorizon, string> = {
  immediate: "text-ruby-400",
  "0-30d":   "text-gold-300",
  "30-90d":  "text-amber-400",
  "90-180d": "text-slate-400",
  "180d+":   "text-slate-500",
  browsing:  "text-slate-600",
};
