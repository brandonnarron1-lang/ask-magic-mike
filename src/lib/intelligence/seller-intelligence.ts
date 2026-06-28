/**
 * Phase 11 — Seller Intelligence Engine
 * Readiness scoring, intent grading, and listing window prediction.
 * Pure functions — complements existing seller-score.ts (does not replace it).
 */

import type {
  SellerReadiness,
  SellerSignalInput,
  SellerSignal,
  SellerIntentGrade,
  SellerListingWindow,
  OpportunityLevel,
  IntelligenceSignals,
} from "./types";

// ---------------------------------------------------------------------------
// Core readiness scoring
// ---------------------------------------------------------------------------

const AVG_COMMISSION_RATE = 0.03;   // 3% of sale price (listing side)
const AVG_HOME_PRICE      = 220_000; // Our Town Properties market average

export function scoreSellerReadiness(s: SellerSignalInput): SellerReadiness {
  // Build active signal list
  const activeSignals: SellerSignal[] = [];
  if (s.valuationRequests > 0)     activeSignals.push("valuation_requested");
  if (s.repeatVisits > 1)           activeSignals.push("repeat_visit");
  if (s.returnFrequency > 2)        activeSignals.push("high_return_frequency");
  if (s.hasPricingQuestion)         activeSignals.push("pricing_question");
  if (s.hasTimelineDiscussion)      activeSignals.push("timeline_discussion");
  if (s.hasEquityConversation)      activeSignals.push("equity_conversation");
  if (s.hasCashOfferInterest)       activeSignals.push("cash_offer_interest");
  if (s.hasAppointmentRequest)      activeSignals.push("appointment_requested");
  if (s.followUpEngagements > 0)    activeSignals.push("follow_up_engaged");
  if (s.hasSellerObjection)         activeSignals.push("seller_objection");
  if (s.conversationDepth >= 7)     activeSignals.push("deep_conversation");

  // Weighted readiness score
  const readinessScore = Math.min(100, Math.round(
    (s.valuationRequests      * 20) +
    (s.repeatVisits           * 6)  +
    (s.returnFrequency        * 4)  +
    (s.conversationDepth      * 5)  +
    (s.hasPricingQuestion    ? 12 : 0) +
    (s.hasTimelineDiscussion ? 15 : 0) +
    (s.hasEquityConversation ? 10 : 0) +
    (s.hasCashOfferInterest  ? 8  : 0) +
    (s.hasAppointmentRequest ? 18 : 0) +
    (s.followUpEngagements    * 4)  +
    (s.hasSellerObjection    ? -5 : 0)
  ));

  // Intent grade
  const intentGrade: SellerIntentGrade =
    readinessScore >= 85 ? "A+" :
    readinessScore >= 70 ? "A"  :
    readinessScore >= 55 ? "B"  :
    readinessScore >= 35 ? "C"  : "D";

  // Predicted listing window
  const predictedListingWindow: SellerListingWindow =
    readinessScore >= 80 && s.hasAppointmentRequest                           ? "0-30d"   :
    readinessScore >= 65 && (s.hasTimelineDiscussion || s.hasPricingQuestion) ? "30-90d"  :
    readinessScore >= 45                                                       ? "90-180d" :
    readinessScore >= 25                                                       ? "180d+"   : "unknown";

  // Confidence
  const dataPoints = activeSignals.length;
  const confidence = Math.min(95, 35 + dataPoints * 7 + (s.daysSinceFirstContact > 0 ? 5 : 0));

  // Risk
  const risk: "low" | "medium" | "high" =
    s.hasSellerObjection && readinessScore < 40 ? "high"   :
    readinessScore < 50                          ? "medium" : "low";

  // Opportunity level
  const opportunity: OpportunityLevel =
    readinessScore >= 80 ? "exceptional" :
    readinessScore >= 60 ? "strong"      :
    readinessScore >= 40 ? "moderate"    : "weak";

  // Commission estimate
  const avgPrice = s.avgPropertyValue > 0 ? s.avgPropertyValue : AVG_HOME_PRICE;
  const estimatedCommission = Math.round(avgPrice * AVG_COMMISSION_RATE);

  // Recommendations
  const recommendations: string[] = [];
  if (readinessScore >= 70)               recommendations.push("Schedule listing appointment immediately");
  if (s.valuationRequests > 0 && !s.hasAppointmentRequest) recommendations.push("Deliver CMA and request appointment");
  if (s.hasEquityConversation)            recommendations.push("Present equity analysis and net sheet");
  if (s.hasCashOfferInterest)             recommendations.push("Provide cash offer comparison");
  if (s.hasSellerObjection)               recommendations.push("Address objections — schedule follow-up call");
  if (predictedListingWindow === "30-90d") recommendations.push("Begin pre-listing checklist");
  if (risk === "high")                    recommendations.push("Reassign or escalate — cold risk detected");

  // Reasoning narrative
  const topSignals = activeSignals.slice(0, 3).map((s) => SELLER_SIGNAL_LABELS[s]).join(", ");
  const reasoning = `Score ${readinessScore}/100 based on ${activeSignals.length} signal${activeSignals.length !== 1 ? "s" : ""}: ${topSignals || "initial contact"}. Predicted listing window: ${predictedListingWindow}.`;

  return {
    leadId:                 s.leadId,
    readinessScore,
    intentGrade,
    predictedListingWindow,
    confidence,
    risk,
    opportunity,
    signals:                activeSignals,
    recommendations,
    estimatedCommission,
    reasoning,
  };
}

// ---------------------------------------------------------------------------
// Rank sellers by readiness
// ---------------------------------------------------------------------------

export function rankSellersByReadiness(sellers: SellerReadiness[]): SellerReadiness[] {
  return [...sellers].sort((a, b) => b.readinessScore - a.readinessScore);
}

// ---------------------------------------------------------------------------
// Identify hot sellers (high readiness + strong opportunity)
// ---------------------------------------------------------------------------

export function identifyHotSellers(
  sellers: SellerReadiness[],
  minScore = 65,
): SellerReadiness[] {
  return sellers.filter(
    (s) => s.readinessScore >= minScore || s.opportunity === "exceptional"
  );
}

// ---------------------------------------------------------------------------
// Human narrative
// ---------------------------------------------------------------------------

export function buildSellerNarrative(r: SellerReadiness): string {
  const grade    = r.intentGrade;
  const window   = r.predictedListingWindow;
  const topRec   = r.recommendations[0] ?? "Monitor engagement";
  const commission = r.estimatedCommission.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return `Grade ${grade} seller with ${r.readinessScore}/100 readiness. Predicted listing window: ${window}. Estimated commission: ${commission}. Recommended: ${topRec}.`;
}

// ---------------------------------------------------------------------------
// Derive seller signal inputs from brokerage intelligence
// ---------------------------------------------------------------------------

export function deriveSellerSignalsFromBrokerage(
  signals: IntelligenceSignals,
): SellerSignalInput[] {
  if (signals.sellerLeads === 0) return [];

  const perLead = (total: number) => Math.max(0, Math.round(total / Math.max(1, signals.sellerLeads)));

  // Synthesize representative seller profiles
  return [
    {
      leadId:                "seller_hot",
      valuationRequests:     Math.ceil(signals.valuationRequestsInWindow * 0.4),
      repeatVisits:          3,
      returnFrequency:       3,
      conversationDepth:     8,
      hasPricingQuestion:    true,
      hasTimelineDiscussion: true,
      hasEquityConversation: signals.avgConversationDepth > 5,
      hasCashOfferInterest:  signals.sellerConversationsInWindow > 2,
      hasAppointmentRequest: signals.appointmentsInWindow > 0,
      followUpEngagements:   perLead(signals.totalQuestionsAsked),
      hasSellerObjection:    false,
      avgPropertyValue:      AVG_HOME_PRICE,
      daysSinceFirstContact: 14,
    },
    {
      leadId:                "seller_warm",
      valuationRequests:     Math.floor(signals.valuationRequestsInWindow * 0.2),
      repeatVisits:          1,
      returnFrequency:       1,
      conversationDepth:     5,
      hasPricingQuestion:    signals.sellerConversationsInWindow > 1,
      hasTimelineDiscussion: false,
      hasEquityConversation: false,
      hasCashOfferInterest:  false,
      hasAppointmentRequest: false,
      followUpEngagements:   1,
      hasSellerObjection:    false,
      avgPropertyValue:      AVG_HOME_PRICE,
      daysSinceFirstContact: 30,
    },
  ];
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const SELLER_SIGNAL_LABELS: Record<SellerSignal, string> = {
  valuation_requested:  "Valuation Requested",
  repeat_visit:         "Repeat Visit",
  high_return_frequency: "High Return Frequency",
  pricing_question:     "Pricing Question",
  timeline_discussion:  "Timeline Discussion",
  equity_conversation:  "Equity Conversation",
  cash_offer_interest:  "Cash Offer Interest",
  appointment_requested: "Appointment Requested",
  follow_up_engaged:    "Follow-Up Engaged",
  seller_objection:     "Seller Objection",
  deep_conversation:    "Deep Conversation",
};

export const LISTING_WINDOW_LABELS: Record<SellerListingWindow, string> = {
  "0-30d":   "Within 30 Days",
  "30-90d":  "1–3 Months",
  "90-180d": "3–6 Months",
  "180d+":   "6+ Months",
  "unknown": "Unknown",
};

export const INTENT_GRADE_COLORS: Record<SellerIntentGrade, string> = {
  "A+": "text-emerald-400",
  "A":  "text-gold-300",
  "B":  "text-amber-400",
  "C":  "text-slate-400",
  "D":  "text-ruby-400",
};

export const OPPORTUNITY_COLORS: Record<OpportunityLevel, string> = {
  exceptional: "text-emerald-400",
  strong:      "text-gold-300",
  moderate:    "text-amber-400",
  weak:        "text-slate-500",
};
