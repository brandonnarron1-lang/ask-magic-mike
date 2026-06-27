/**
 * Phase 11 — Property Intelligence Engine
 * Derives interest scores, market velocity, and listing predictions
 * from engagement signals. Pure functions — no MLS, no external APIs.
 */

import type {
  PropertyIntelligence,
  PropertySignals,
  MarketVelocity,
  ActivityTrend,
  IntelligenceSignals,
} from "./types";

// ---------------------------------------------------------------------------
// Core scoring
// ---------------------------------------------------------------------------

export function scorePropertyIntelligence(s: PropertySignals): PropertyIntelligence {
  // Interest score — weighted engagement composite
  const interestScore = Math.min(100, Math.round(
    (s.valuationRequests       * 18) +
    (s.conversationCount       * 8)  +
    (s.appointmentRequests     * 14) +
    (s.repeatVisitLeads        * 6)  +
    (Math.min(s.propertyViews, 20)   * 2) +
    (s.listingInterestLeads    * 10)
  ));

  // Seller probability — driven by valuation requests + conversation depth
  const sellerProbability = Math.min(100, Math.round(
    (s.valuationRequests  * 25) +
    (s.conversationCount  * 10) +
    (s.repeatVisitLeads   * 8)  +
    (s.appointmentRequests * 15)
  ));

  // Buyer demand — driven by views and inquiries
  const buyerDemandScore = Math.min(100, Math.round(
    (Math.min(s.propertyViews, 30) * 2.5) +
    (s.conversationCount * 5) +
    (s.listingInterestLeads * 8)
  ));

  // Market velocity
  const marketVelocity: MarketVelocity =
    (s.daysOnMarket === null)            ? "fast"   :
    (s.daysOnMarket <= 14)               ? "fast"   :
    (s.daysOnMarket <= 45)               ? "normal" :
    (s.daysOnMarket <= 90)               ? "slow"   : "stalled";

  // Activity trend — recent engagement vs. baseline
  const recentActivity = s.conversationCount + s.propertyViews;
  const activityTrend: ActivityTrend =
    recentActivity > 8  ? "rising"   :
    recentActivity > 2  ? "stable"   : "declining";

  // Predictions
  const predictedListingProbability = Math.min(100, Math.round(
    sellerProbability * 0.6 +
    interestScore     * 0.3 +
    (marketVelocity === "fast" ? 10 : 0)
  ));

  const predictedClosingProbability = Math.min(100, Math.round(
    predictedListingProbability * 0.55 +
    buyerDemandScore            * 0.35 +
    (marketVelocity === "fast" ? 10 : 0)
  ));

  const predictedMarketingOpportunity = Math.min(100, Math.round(
    interestScore  * 0.5 +
    buyerDemandScore * 0.3 +
    (activityTrend === "rising" ? 20 : activityTrend === "stable" ? 10 : 0)
  ));

  // Confidence — data richness
  const dataPoints = [
    s.valuationRequests > 0,
    s.conversationCount > 0,
    s.propertyViews > 0,
    s.appointmentRequests > 0,
    s.listingInterestLeads > 0,
  ].filter(Boolean).length;
  const confidence = Math.min(95, 40 + dataPoints * 11);

  // Signals
  const signals: string[] = [];
  if (s.valuationRequests > 0)    signals.push(`${s.valuationRequests} valuation request${s.valuationRequests > 1 ? "s" : ""}`);
  if (s.appointmentRequests > 0)  signals.push(`${s.appointmentRequests} appointment request${s.appointmentRequests > 1 ? "s" : ""}`);
  if (s.repeatVisitLeads > 0)     signals.push(`${s.repeatVisitLeads} repeat visitor${s.repeatVisitLeads > 1 ? "s" : ""}`);
  if (s.conversationCount > 2)    signals.push("Multiple conversations");
  if (marketVelocity === "fast")  signals.push("Fast-moving market segment");
  if (activityTrend === "rising") signals.push("Rising engagement trend");

  // Recommended actions
  const recommendedActions: string[] = [];
  if (sellerProbability > 60)             recommendedActions.push("Schedule seller consultation");
  if (s.appointmentRequests > 0)          recommendedActions.push("Confirm pending appointments");
  if (predictedMarketingOpportunity > 50) recommendedActions.push("Launch targeted marketing campaign");
  if (s.valuationRequests > 2)            recommendedActions.push("Deliver CMA to owner");
  if (activityTrend === "declining")      recommendedActions.push("Re-engage with new campaign");

  return {
    propertyId:                    s.propertyId,
    address:                       s.address,
    interestScore,
    sellerProbability,
    buyerDemandScore,
    marketingExposureCount:        s.marketingExposureCount,
    conversationCount:             s.conversationCount,
    valuationRequestCount:         s.valuationRequests,
    appointmentRequestCount:       s.appointmentRequests,
    marketVelocity,
    activityTrend,
    predictedListingProbability,
    predictedClosingProbability,
    predictedMarketingOpportunity,
    confidence,
    signals,
    recommendedActions,
    lastActivityAt:                s.lastActivityAt,
  };
}

// ---------------------------------------------------------------------------
// Rank properties by composite opportunity score
// ---------------------------------------------------------------------------

export function rankPropertiesByOpportunity(
  properties: PropertyIntelligence[],
): PropertyIntelligence[] {
  return [...properties].sort((a, b) => {
    const scoreA = a.interestScore * 0.4 + a.predictedListingProbability * 0.35 + a.confidence * 0.25;
    const scoreB = b.interestScore * 0.4 + b.predictedListingProbability * 0.35 + b.confidence * 0.25;
    return scoreB - scoreA;
  });
}

// ---------------------------------------------------------------------------
// Filter to hot properties (high interest + prediction)
// ---------------------------------------------------------------------------

export function identifyHotProperties(
  properties: PropertyIntelligence[],
  threshold = 60,
): PropertyIntelligence[] {
  return properties.filter(
    (p) => p.interestScore >= threshold || p.predictedListingProbability >= threshold
  );
}

// ---------------------------------------------------------------------------
// Human narrative
// ---------------------------------------------------------------------------

export function buildPropertyNarrative(p: PropertyIntelligence): string {
  const trend   = p.activityTrend === "rising" ? "gaining interest" : p.activityTrend === "declining" ? "cooling" : "steady";
  const listing = p.predictedListingProbability >= 70 ? "High listing probability." :
                  p.predictedListingProbability >= 40 ? "Moderate listing potential." : "";
  return `${p.address} is ${trend} with an interest score of ${p.interestScore}/100. ${listing} ${p.signals.join(". ")}.`.trim();
}

// ---------------------------------------------------------------------------
// Derive property signal summaries from brokerage intelligence signals
// ---------------------------------------------------------------------------

export function derivePropertySignalsFromBrokerage(
  signals: IntelligenceSignals,
): PropertySignals[] {
  // Without a real property table, synthesize synthetic representative records
  const topNeighborhood = signals.topNeighborhood || "Wilson, NC";
  const valuationShare = signals.valuationRequestsInWindow;
  const convShare      = signals.sellerConversationsInWindow;

  return [
    {
      propertyId:            "prop_primary",
      address:               topNeighborhood,
      valuationRequests:     Math.ceil(valuationShare * 0.4),
      propertyViews:         signals.propertyViewsInWindow,
      conversationCount:     Math.ceil(convShare * 0.5),
      appointmentRequests:   Math.ceil(signals.appointmentsInWindow * 0.3),
      marketingExposureCount: signals.campaignLeadsInWindow,
      daysOnMarket:          null,
      listingInterestLeads:  signals.listingInterestLeads,
      repeatVisitLeads:      Math.ceil(signals.totalLeads * 0.1),
      lastActivityAt:        signals.generatedAt,
    },
    {
      propertyId:            "prop_secondary",
      address:               `${topNeighborhood} Area`,
      valuationRequests:     Math.floor(valuationShare * 0.3),
      propertyViews:         Math.floor(signals.propertyViewsInWindow * 0.5),
      conversationCount:     Math.floor(convShare * 0.3),
      appointmentRequests:   Math.floor(signals.appointmentsInWindow * 0.2),
      marketingExposureCount: Math.floor(signals.campaignLeadsInWindow * 0.6),
      daysOnMarket:          30,
      listingInterestLeads:  Math.floor(signals.listingInterestLeads * 0.5),
      repeatVisitLeads:      Math.floor(signals.totalLeads * 0.05),
      lastActivityAt:        signals.generatedAt,
    },
  ];
}
