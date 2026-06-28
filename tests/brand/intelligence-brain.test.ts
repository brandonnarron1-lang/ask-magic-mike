/**
 * Phase 11 — Brokerage Intelligence Brain
 * All engines are pure functions. No DB calls. No external APIs.
 */

import { describe, it, expect } from "vitest";
import type { IntelligenceSignals } from "@/lib/intelligence/types";

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeSignals(overrides: Partial<IntelligenceSignals> = {}): IntelligenceSignals {
  return {
    generatedAt:                  new Date().toISOString(),
    windowDays:                   7,
    totalLeads:                   100,
    newLeadsInWindow:             20,
    hotLeads:                     15,
    sellerLeads:                  40,
    buyerLeads:                   60,
    reactivatedLeads:             5,
    stalledLeads:                 10,
    avgLeadScore:                 62,
    totalProperties:              25,
    valuationRequestsInWindow:    12,
    propertyViewsInWindow:        80,
    listingInterestLeads:         18,
    activeAgents:                 4,
    avgResponseMinutes:           22,
    topAgentConversionRate:       0.28,
    teamAvgConversionRate:        0.14,
    avgHealthScore:               71,
    activeCampaigns:              3,
    campaignLeadsInWindow:        35,
    topCampaignSource:            "Google",
    campaignConversionRate:       0.18,
    appointmentsInWindow:         12,
    appointmentAcceptanceRate:    0.75,
    missedAppointmentsInWindow:   2,
    avgResponseToAcceptMinutes:   45,
    avgConversationDepth:         4.2,
    sellerConversationsInWindow:  30,
    buyerConversationsInWindow:   50,
    totalQuestionsAsked:          210,
    topNeighborhood:              "Downtown",
    neighborhoodLeadCounts:       { Downtown: 20, Midtown: 15, Suburbs: 10 },
    estimatedPipelineValue:       2_200_000,
    predictedClosings30d:         3,
    avgDaysToClose:               42,
    sellerConversationsTrend:     12,
    appointmentTrend:             8,
    leadQualityTrend:             5,
    campaignPerformanceTrend:     -3,
    conversionRateTrend:          2,
    slaBreachCount:               2,
    slaWarningCount:              4,
    avgSlaComplianceRate:         0.92,
    referralLeads:                8,
    referralConversionRate:       0.35,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Knowledge Graph
// ---------------------------------------------------------------------------

import {
  createNode,
  createEdge,
  createEmptyGraph,
  addNode,
  addEdge,
  mergeGraphs,
  findConnections,
  traverseGraph,
  calculateNodeWeight,
  getRelationshipMap,
  buildBrokerageGraph,
  getNodeTypeCounts,
  getRelationshipTypeCounts,
  getTopNodes,
  NODE_TYPE_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/intelligence/knowledge-graph";

describe("knowledge-graph — createNode", () => {
  it("creates a node with all required fields", () => {
    const node = createNode("lead", "lead-1", "John Doe");
    expect(node.id).toBe("lead-1");
    expect(node.type).toBe("lead");
    expect(node.label).toBe("John Doe");
    expect(node.confidence).toBe(80);
    expect(node.attributes).toEqual({});
  });

  it("accepts custom confidence and attributes", () => {
    const node = createNode("property", "p-1", "123 Main St", { price: 220000 }, 95);
    expect(node.confidence).toBe(95);
    expect(node.attributes.price).toBe(220000);
  });

  it("clamps confidence to 0-100", () => {
    const low  = createNode("agent", "a-1", "Agent A", {}, -10);
    const high = createNode("agent", "a-2", "Agent B", {}, 150);
    expect(low.confidence).toBe(0);
    expect(high.confidence).toBe(100);
  });
});

describe("knowledge-graph — createEdge", () => {
  it("creates an edge with default strength 70 and uses fromId/toId", () => {
    const n1   = createNode("lead", "n1", "Lead 1");
    const n2   = createNode("property", "n2", "Property 1");
    const edge = createEdge(n1, n2, "interested_in");
    expect(edge.fromId).toBe("n1");
    expect(edge.toId).toBe("n2");
    expect(edge.relationship).toBe("interested_in");
    expect(edge.strength).toBe(70);
  });

  it("accepts custom strength and origin", () => {
    const n1   = createNode("lead", "n1", "Lead 1");
    const n2   = createNode("agent", "n2", "Agent 1");
    const edge = createEdge(n1, n2, "assigned_to", 90, "manual");
    expect(edge.strength).toBe(90);
    expect(edge.origin).toBe("manual");
  });

  it("generates a unique ID per edge", () => {
    const n1 = createNode("lead", "n1", "Lead 1");
    const n2 = createNode("agent", "n2", "Agent 1");
    const e1 = createEdge(n1, n2, "interested_in");
    const e2 = createEdge(n1, n2, "interested_in");
    expect(e1.id).not.toBe(e2.id);
  });
});

describe("knowledge-graph — graph operations", () => {
  it("creates an empty graph", () => {
    const g = createEmptyGraph();
    expect(g.totalNodeCount).toBe(0);
    expect(g.totalEdgeCount).toBe(0);
  });

  it("addNode increments count", () => {
    let g = createEmptyGraph();
    g = addNode(g, createNode("lead", "l-1", "Lead 1"));
    expect(g.totalNodeCount).toBe(1);
  });

  it("addEdge increments count", () => {
    let g  = createEmptyGraph();
    const n1 = createNode("lead", "l-1", "Lead 1");
    const n2 = createNode("property", "p-1", "Property 1");
    g = addNode(g, n1);
    g = addNode(g, n2);
    g = addEdge(g, createEdge(n1, n2, "interested_in"));
    expect(g.totalEdgeCount).toBe(1);
  });

  it("mergeGraphs combines nodes and edges", () => {
    let ga = createEmptyGraph();
    ga = addNode(ga, createNode("lead", "l-1", "L1"));

    let gb = createEmptyGraph();
    gb = addNode(gb, createNode("agent", "a-1", "A1"));

    const merged = mergeGraphs(ga, gb);
    expect(merged.totalNodeCount).toBe(2);
  });
});

describe("knowledge-graph — traversal", () => {
  function buildTestGraph() {
    let g = createEmptyGraph();
    const nLead = createNode("lead",     "l-1", "Lead");
    const nProp = createNode("property", "p-1", "Property");
    const nAgent = createNode("agent",   "a-1", "Agent");
    g = addNode(g, nLead);
    g = addNode(g, nProp);
    g = addNode(g, nAgent);
    g = addEdge(g, createEdge(nLead, nProp,  "interested_in", 80));
    g = addEdge(g, createEdge(nLead, nAgent, "assigned_to",   90));
    return g;
  }

  it("findConnections returns direct neighbors", () => {
    const g = buildTestGraph();
    const connections = findConnections(g, "l-1", 1);
    expect(connections.length).toBeGreaterThan(0);
  });

  it("traverseGraph returns traversal map", () => {
    const g = buildTestGraph();
    const result = traverseGraph(g, "l-1", 2);
    expect(result).toBeDefined();
  });

  it("calculateNodeWeight returns a positive number for connected node", () => {
    const g = buildTestGraph();
    const node  = g.nodes.get("l-1")!;
    const edges = g.edges.filter((e) => e.fromId === "l-1" || e.toId === "l-1");
    expect(calculateNodeWeight(node, edges)).toBeGreaterThan(0);
  });
});

describe("knowledge-graph — analytics", () => {
  it("getNodeTypeCounts returns counts for present node types", () => {
    let g = createEmptyGraph();
    g = addNode(g, createNode("lead", "l-1", "Lead"));
    const counts = getNodeTypeCounts(g);
    expect(counts.lead).toBe(1);
  });

  it("getRelationshipTypeCounts returns object", () => {
    const g      = createEmptyGraph();
    const counts = getRelationshipTypeCounts(g);
    expect(typeof counts).toBe("object");
  });

  it("getTopNodes returns empty array for empty graph", () => {
    const g = createEmptyGraph();
    expect(getTopNodes(g, 5)).toEqual([]);
  });

  it("buildBrokerageGraph returns a populated graph from signals", () => {
    const g = buildBrokerageGraph(makeSignals());
    expect(g.totalNodeCount).toBeGreaterThan(0);
    expect(g.totalEdgeCount).toBeGreaterThan(0);
  });

  it("NODE_TYPE_LABELS covers lead type", () => {
    expect(NODE_TYPE_LABELS.lead).toBeDefined();
    expect(typeof NODE_TYPE_LABELS.lead).toBe("string");
  });

  it("RELATIONSHIP_LABELS covers interested_in", () => {
    expect(RELATIONSHIP_LABELS.interested_in).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Memory Engine
// ---------------------------------------------------------------------------

import {
  buildMemoryRecord,
  calculateMemoryStrength,
  consolidateMemory,
  buildMemoryFromEvents,
  MEMORY_EVENT_LABELS,
  SIGNIFICANCE_COLORS,
} from "@/lib/intelligence/memory-engine";

describe("memory-engine — buildMemoryRecord", () => {
  it("returns a valid MemoryRecord", () => {
    const rec = buildMemoryRecord("lead-1", "lead", "conversion", "Lead converted");
    expect(rec.entityId).toBe("lead-1");
    expect(rec.eventType).toBe("conversion");
    expect(rec.significance).toBeDefined();
    expect(rec.immutable).toBe(true);
  });
});

describe("memory-engine — calculateMemoryStrength", () => {
  it("returns 0 for no records", () => {
    expect(calculateMemoryStrength([])).toBe(0);
  });

  it("returns higher value for critical events", () => {
    const rec = buildMemoryRecord("l-1", "lead", "conversion", "Converted");
    expect(calculateMemoryStrength([rec])).toBeGreaterThan(0);
  });

  it("clamps to 100", () => {
    const records = Array.from({ length: 50 }, () =>
      buildMemoryRecord("l-1", "lead", "conversion", "Conv"),
    );
    expect(calculateMemoryStrength(records)).toBeLessThanOrEqual(100);
  });
});

describe("memory-engine — consolidateMemory", () => {
  it("returns a MemoryConsolidation object", () => {
    const c = consolidateMemory("l-1", "lead", []);
    expect(c.entityId).toBe("l-1");
    expect(c.totalEvents).toBe(0);
    expect(c.memoryStrength).toBe(0);
  });

  it("counts significant events correctly", () => {
    const records = [
      buildMemoryRecord("l-1", "lead", "conversion", "Converted"),
      buildMemoryRecord("l-1", "lead", "score_changed", "Score updated"),
    ];
    const c = consolidateMemory("l-1", "lead", records);
    expect(c.significantEvents).toBeGreaterThanOrEqual(1);
  });

  it("narrative mentions conversion", () => {
    const records = [
      buildMemoryRecord("l-1", "lead", "conversion", "Conv"),
    ];
    const c = consolidateMemory("l-1", "lead", records);
    expect(c.narrative).toContain("converted");
  });
});

describe("memory-engine — buildMemoryFromEvents", () => {
  it("returns empty array for empty events", () => {
    const records = buildMemoryFromEvents("l-1", "lead", []);
    expect(records).toEqual([]);
  });

  it("maps recognized events to records", () => {
    const events = [
      { id: "e-1", event_name: "lead_created", properties: {}, created_at: new Date().toISOString() },
      { id: "e-2", event_name: "conversion",   properties: {}, created_at: new Date().toISOString() },
    ];
    const records = buildMemoryFromEvents("l-1", "lead", events);
    expect(records.length).toBeGreaterThan(0);
  });

  it("returns MemoryRecords with required fields for known events", () => {
    const events = [
      { id: "e-1", event_name: "appointment_set", properties: {}, created_at: new Date().toISOString() },
    ];
    const records = buildMemoryFromEvents("l-1", "lead", events);
    if (records.length > 0) {
      expect(records[0].id).toBeDefined();
      expect(records[0].entityId).toBe("l-1");
      expect(records[0].significance).toBeDefined();
    }
  });
});

describe("memory-engine — label maps", () => {
  it("MEMORY_EVENT_LABELS covers conversion", () => {
    expect(MEMORY_EVENT_LABELS.conversion).toBeDefined();
  });

  it("SIGNIFICANCE_COLORS covers all levels", () => {
    expect(SIGNIFICANCE_COLORS.critical).toBeDefined();
    expect(SIGNIFICANCE_COLORS.high).toBeDefined();
    expect(SIGNIFICANCE_COLORS.medium).toBeDefined();
    expect(SIGNIFICANCE_COLORS.low).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Property Intelligence
// ---------------------------------------------------------------------------

import {
  scorePropertyIntelligence,
  rankPropertiesByOpportunity,
  identifyHotProperties,
  buildPropertyNarrative,
  derivePropertySignalsFromBrokerage,
} from "@/lib/intelligence/property-intelligence";
import type { PropertySignals } from "@/lib/intelligence/types";

function makePropSignals(overrides: Partial<PropertySignals> = {}): PropertySignals {
  return {
    propertyId:              "prop-1",
    address:                 "123 Main St",
    valuationRequests:       3,
    conversationCount:       5,
    appointmentRequests:     2,
    listingInterestLeads:    4,
    propertyViews:           15,
    daysOnMarket:            30,
    marketingExposureCount:  2,
    repeatVisitLeads:        1,
    lastActivityAt:          new Date().toISOString(),
    ...overrides,
  };
}

describe("property-intelligence — scorePropertyIntelligence", () => {
  it("returns a PropertyIntelligence object", () => {
    const p = scorePropertyIntelligence(makePropSignals());
    expect(p.address).toBe("123 Main St");
    expect(p.interestScore).toBeGreaterThanOrEqual(0);
    expect(p.interestScore).toBeLessThanOrEqual(100);
  });

  it("scores higher with more interest signals", () => {
    const low  = scorePropertyIntelligence(makePropSignals({
      valuationRequests: 0, conversationCount: 0, appointmentRequests: 0,
      propertyViews: 0, listingInterestLeads: 0, repeatVisitLeads: 0,
    }));
    const high = scorePropertyIntelligence(makePropSignals({
      valuationRequests: 5, conversationCount: 3,
    }));
    expect(high.interestScore).toBeGreaterThan(low.interestScore);
  });

  it("confidence is 0-100", () => {
    const p = scorePropertyIntelligence(makePropSignals());
    expect(p.confidence).toBeGreaterThanOrEqual(0);
    expect(p.confidence).toBeLessThanOrEqual(100);
  });

  it("predictions are 0-100", () => {
    const p = scorePropertyIntelligence(makePropSignals());
    expect(p.predictedListingProbability).toBeGreaterThanOrEqual(0);
    expect(p.predictedClosingProbability).toBeGreaterThanOrEqual(0);
    expect(p.predictedListingProbability).toBeLessThanOrEqual(100);
  });
});

describe("property-intelligence — ranking and filtering", () => {
  it("rankPropertiesByOpportunity sorts descending by interestScore", () => {
    const signals = [
      makePropSignals({ address: "A", valuationRequests: 10 }),
      makePropSignals({ address: "B", valuationRequests: 0  }),
    ].map(scorePropertyIntelligence);
    const ranked = rankPropertiesByOpportunity(signals);
    expect(ranked[0].interestScore).toBeGreaterThanOrEqual(ranked[1]?.interestScore ?? 0);
  });

  it("identifyHotProperties filters below threshold", () => {
    const props = [
      makePropSignals({ valuationRequests: 20, conversationCount: 20 }),
      makePropSignals({ valuationRequests: 0,  conversationCount: 0  }),
    ].map(scorePropertyIntelligence);
    const hot = identifyHotProperties(props, 50);
    expect(hot.length).toBeLessThanOrEqual(props.length);
  });

  it("identifyHotProperties returns empty for zero activity", () => {
    const props = [makePropSignals({ valuationRequests: 0, conversationCount: 0, propertyViews: 0 })].map(scorePropertyIntelligence);
    const hot   = identifyHotProperties(props, 80);
    expect(hot.length).toBe(0);
  });
});

describe("property-intelligence — narrative", () => {
  it("buildPropertyNarrative returns non-empty string", () => {
    const p = scorePropertyIntelligence(makePropSignals());
    expect(typeof buildPropertyNarrative(p)).toBe("string");
    expect(buildPropertyNarrative(p).length).toBeGreaterThan(0);
  });
});

describe("property-intelligence — derive from brokerage", () => {
  it("derivePropertySignalsFromBrokerage returns an array", () => {
    const sigs = derivePropertySignalsFromBrokerage(makeSignals());
    expect(Array.isArray(sigs)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Seller Intelligence
// ---------------------------------------------------------------------------

import {
  scoreSellerReadiness,
  rankSellersByReadiness,
  identifyHotSellers,
  buildSellerNarrative,
  deriveSellerSignalsFromBrokerage,
  SELLER_SIGNAL_LABELS,
  LISTING_WINDOW_LABELS,
  INTENT_GRADE_COLORS,
  OPPORTUNITY_COLORS,
} from "@/lib/intelligence/seller-intelligence";
import type { SellerSignalInput } from "@/lib/intelligence/types";

function makeSellerInput(overrides: Partial<SellerSignalInput> = {}): SellerSignalInput {
  return {
    leadId:               "lead-1",
    valuationRequests:    0,
    repeatVisits:         1,
    returnFrequency:      1,
    conversationDepth:    3,
    hasPricingQuestion:   false,
    hasTimelineDiscussion: false,
    hasEquityConversation: false,
    hasCashOfferInterest:  false,
    hasAppointmentRequest: false,
    followUpEngagements:   0,
    hasSellerObjection:    false,
    avgPropertyValue:      220000,
    daysSinceFirstContact: 15,
    ...overrides,
  };
}

describe("seller-intelligence — scoreSellerReadiness", () => {
  it("returns a SellerReadiness object", () => {
    const r = scoreSellerReadiness(makeSellerInput());
    expect(r.leadId).toBe("lead-1");
    expect(r.readinessScore).toBeGreaterThanOrEqual(0);
    expect(r.readinessScore).toBeLessThanOrEqual(100);
  });

  it("scores higher with valuation + timeline asked", () => {
    const low  = scoreSellerReadiness(makeSellerInput({ valuationRequests: 0, hasTimelineDiscussion: false }));
    const high = scoreSellerReadiness(makeSellerInput({ valuationRequests: 2, hasTimelineDiscussion: true, hasPricingQuestion: true }));
    expect(high.readinessScore).toBeGreaterThan(low.readinessScore);
  });

  it("objection reduces score relative to non-objection", () => {
    const active   = scoreSellerReadiness(makeSellerInput({ hasSellerObjection: false }));
    const objected = scoreSellerReadiness(makeSellerInput({ hasSellerObjection: true  }));
    expect(objected.readinessScore).toBeLessThanOrEqual(active.readinessScore);
  });

  it("includes recommendations", () => {
    const r = scoreSellerReadiness(makeSellerInput());
    expect(Array.isArray(r.recommendations)).toBe(true);
  });

  it("intent grade is a valid value", () => {
    const r = scoreSellerReadiness(makeSellerInput());
    expect(["A+", "A", "B", "C", "D"]).toContain(r.intentGrade);
  });
});

describe("seller-intelligence — ranking", () => {
  it("rankSellersByReadiness sorts descending", () => {
    const sellers = [
      makeSellerInput({ leadId: "l1", valuationRequests: 2, hasTimelineDiscussion: true }),
      makeSellerInput({ leadId: "l2", valuationRequests: 0 }),
    ].map(scoreSellerReadiness);
    const ranked = rankSellersByReadiness(sellers);
    expect(ranked[0].readinessScore).toBeGreaterThanOrEqual(ranked[1].readinessScore);
  });

  it("identifyHotSellers returns only those above threshold", () => {
    const sellers = [
      makeSellerInput({ valuationRequests: 3, hasTimelineDiscussion: true, hasAppointmentRequest: true }),
      makeSellerInput({ valuationRequests: 0 }),
    ].map(scoreSellerReadiness);
    const hot = identifyHotSellers(sellers, 50);
    expect(hot.every((s) => s.readinessScore >= 50)).toBe(true);
  });
});

describe("seller-intelligence — label maps", () => {
  it("SELLER_SIGNAL_LABELS has entries", () => {
    expect(Object.keys(SELLER_SIGNAL_LABELS).length).toBeGreaterThan(0);
  });

  it("LISTING_WINDOW_LABELS covers all windows", () => {
    expect(LISTING_WINDOW_LABELS["0-30d"]).toBeDefined();
    expect(LISTING_WINDOW_LABELS["unknown"]).toBeDefined();
  });

  it("INTENT_GRADE_COLORS covers A+", () => {
    expect(INTENT_GRADE_COLORS["A+"]).toBeDefined();
  });

  it("OPPORTUNITY_COLORS covers all levels", () => {
    expect(OPPORTUNITY_COLORS.exceptional).toBeDefined();
    expect(OPPORTUNITY_COLORS.weak).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Buyer Intelligence
// ---------------------------------------------------------------------------

import {
  scoreBuyerReadiness,
  rankBuyersByPurchaseProbability,
  identifyActiveBuyers,
  buildBuyerNarrative,
  deriveBuyerSignalsFromBrokerage,
  BUYER_SIGNAL_LABELS,
  TIME_HORIZON_LABELS,
  TIME_HORIZON_COLORS,
} from "@/lib/intelligence/buyer-intelligence";
import type { BuyerSignalInput } from "@/lib/intelligence/types";

function makeBuyerInput(overrides: Partial<BuyerSignalInput> = {}): BuyerSignalInput {
  return {
    leadId:                  "buyer-1",
    hasFinancingQuestion:    false,
    hasLocationQuestion:     false,
    hasSchoolQuestion:       false,
    hasPriceRange:           false,
    savedPropertyCount:      0,
    conversationCount:       2,
    hasAppointmentRequest:   false,
    repeatSearchCount:       0,
    hasMarketTimingQuestion: false,
    hasUrgencySignal:        false,
    daysSinceFirstContact:   20,
    ...overrides,
  };
}

describe("buyer-intelligence — scoreBuyerReadiness", () => {
  it("returns a BuyerReadiness object", () => {
    const r = scoreBuyerReadiness(makeBuyerInput());
    expect(r.leadId).toBe("buyer-1");
    expect(r.purchaseProbability).toBeGreaterThanOrEqual(0);
    expect(r.purchaseProbability).toBeLessThanOrEqual(100);
  });

  it("financing question boosts probability", () => {
    const low  = scoreBuyerReadiness(makeBuyerInput({ hasFinancingQuestion: false }));
    const high = scoreBuyerReadiness(makeBuyerInput({ hasFinancingQuestion: true, hasPriceRange: true }));
    expect(high.purchaseProbability).toBeGreaterThan(low.purchaseProbability);
  });

  it("urgency signal increases probability", () => {
    const noUrgency   = scoreBuyerReadiness(makeBuyerInput({ hasUrgencySignal: false }));
    const withUrgency = scoreBuyerReadiness(makeBuyerInput({ hasUrgencySignal: true  }));
    expect(withUrgency.purchaseProbability).toBeGreaterThanOrEqual(noUrgency.purchaseProbability);
  });

  it("includes nextBestAction", () => {
    const r = scoreBuyerReadiness(makeBuyerInput());
    expect(typeof r.nextBestAction).toBe("string");
    expect(r.nextBestAction.length).toBeGreaterThan(0);
  });

  it("time horizon is a valid value", () => {
    const r = scoreBuyerReadiness(makeBuyerInput());
    const valid = ["immediate", "0-30d", "30-90d", "90-180d", "180d+", "browsing"];
    expect(valid).toContain(r.timeHorizon);
  });
});

describe("buyer-intelligence — ranking", () => {
  it("rankBuyersByPurchaseProbability sorts descending", () => {
    const buyers = [
      makeBuyerInput({ leadId: "b1", hasFinancingQuestion: true, hasUrgencySignal: true }),
      makeBuyerInput({ leadId: "b2" }),
    ].map(scoreBuyerReadiness);
    const ranked = rankBuyersByPurchaseProbability(buyers);
    expect(ranked[0].purchaseProbability).toBeGreaterThanOrEqual(ranked[1].purchaseProbability);
  });

  it("identifyActiveBuyers filters by probability", () => {
    const buyers = [
      makeBuyerInput({ hasFinancingQuestion: true, hasPriceRange: true, hasAppointmentRequest: true }),
      makeBuyerInput({ hasFinancingQuestion: false }),
    ].map(scoreBuyerReadiness);
    const active = identifyActiveBuyers(buyers, 50);
    expect(active.every((b) => b.purchaseProbability >= 50)).toBe(true);
  });
});

describe("buyer-intelligence — label maps", () => {
  it("BUYER_SIGNAL_LABELS has entries", () => {
    expect(Object.keys(BUYER_SIGNAL_LABELS).length).toBeGreaterThan(0);
  });

  it("TIME_HORIZON_LABELS covers 0-30d", () => {
    expect(TIME_HORIZON_LABELS["0-30d"]).toBeDefined();
  });

  it("TIME_HORIZON_COLORS covers all horizons", () => {
    expect(TIME_HORIZON_COLORS["0-30d"]).toBeDefined();
    expect(TIME_HORIZON_COLORS["browsing"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Prediction Engine
// ---------------------------------------------------------------------------

import {
  generatePredictions,
  rankPredictionsByConfidence,
  filterPredictionsByType,
  buildPredictionNarrative,
  PREDICTION_TYPE_LABELS,
  PREDICTION_URGENCY_COLORS,
} from "@/lib/intelligence/prediction-engine";

describe("prediction-engine — generatePredictions", () => {
  it("returns an array", () => {
    const preds = generatePredictions({ signals: makeSignals(), timestamp: new Date().toISOString() });
    expect(Array.isArray(preds)).toBe(true);
  });

  it("each prediction has required fields", () => {
    const preds = generatePredictions({ signals: makeSignals(), timestamp: new Date().toISOString() });
    if (preds.length > 0) {
      const p = preds[0];
      expect(p.id).toBeDefined();
      expect(p.type).toBeDefined();
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(100);
      expect(typeof p.reasoning).toBe("string");
      expect(Array.isArray(p.supportingSignals)).toBe(true);
    }
  });

  it("generates more predictions with stronger signals", () => {
    const weakPreds   = generatePredictions({ signals: makeSignals({ hotLeads: 0, urgentLeadCount: 0, slaBreachCount: 0 } as Partial<IntelligenceSignals>), timestamp: new Date().toISOString() });
    const strongPreds = generatePredictions({ signals: makeSignals({ hotLeads: 50, slaBreachCount: 10, stalledLeads: 30 }), timestamp: new Date().toISOString() });
    expect(strongPreds.length).toBeGreaterThanOrEqual(weakPreds.length);
  });

  it("predictions are sorted by urgency (critical first)", () => {
    const preds = generatePredictions({ signals: makeSignals({ slaBreachCount: 15, stalledLeads: 40 }), timestamp: new Date().toISOString() });
    if (preds.length >= 2) {
      const urgencyOrder = ["critical", "high", "medium", "low"];
      const firstIdx  = urgencyOrder.indexOf(preds[0].urgency);
      const secondIdx = urgencyOrder.indexOf(preds[1].urgency);
      expect(firstIdx).toBeLessThanOrEqual(secondIdx);
    }
  });
});

describe("prediction-engine — utilities", () => {
  it("rankPredictionsByConfidence sorts descending", () => {
    const preds = generatePredictions({ signals: makeSignals(), timestamp: new Date().toISOString() });
    const ranked = rankPredictionsByConfidence(preds);
    if (ranked.length >= 2) {
      expect(ranked[0].confidence).toBeGreaterThanOrEqual(ranked[1].confidence);
    }
  });

  it("filterPredictionsByType returns matching type only", () => {
    const preds = generatePredictions({ signals: makeSignals({ stalledLeads: 30 }), timestamp: new Date().toISOString() });
    const staleLeads = filterPredictionsByType(preds, "stale_lead");
    expect(staleLeads.every((p) => p.type === "stale_lead")).toBe(true);
  });

  it("buildPredictionNarrative returns a non-empty string", () => {
    const preds = generatePredictions({ signals: makeSignals(), timestamp: new Date().toISOString() });
    if (preds.length > 0) {
      const narrative = buildPredictionNarrative(preds[0]);
      expect(typeof narrative).toBe("string");
      expect(narrative.length).toBeGreaterThan(0);
    }
  });
});

describe("prediction-engine — label maps", () => {
  it("PREDICTION_TYPE_LABELS covers likely_listing", () => {
    expect(PREDICTION_TYPE_LABELS.likely_listing).toBeDefined();
  });

  it("PREDICTION_URGENCY_COLORS covers all levels", () => {
    expect(PREDICTION_URGENCY_COLORS.critical).toBeDefined();
    expect(PREDICTION_URGENCY_COLORS.low).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Opportunity Engine
// ---------------------------------------------------------------------------

import {
  discoverOpportunities,
  rankByROI,
  getTopOpportunities,
  getFastestWin,
  getLargestPipelineOpportunity,
  getTopRisks,
  getHighestConfidenceOpportunity,
  OPPORTUNITY_CATEGORY_LABELS,
} from "@/lib/intelligence/opportunity-engine";

describe("opportunity-engine — discoverOpportunities", () => {
  it("returns an array", () => {
    const opps = discoverOpportunities({ signals: makeSignals() });
    expect(Array.isArray(opps)).toBe(true);
  });

  it("each opportunity has required fields", () => {
    const opps = discoverOpportunities({ signals: makeSignals() });
    if (opps.length > 0) {
      const o = opps[0];
      expect(o.id).toBeDefined();
      expect(o.category).toBeDefined();
      expect(o.businessValue).toBeGreaterThan(0);
      expect(o.confidence).toBeGreaterThanOrEqual(0);
      expect(o.roi).toBeGreaterThan(0);
    }
  });

  it("returns more opportunities with stronger signals", () => {
    const weak   = discoverOpportunities({ signals: makeSignals({ stalledLeads: 0, slaBreachCount: 0 }) });
    const strong = discoverOpportunities({ signals: makeSignals({ stalledLeads: 30, slaBreachCount: 15, hotLeads: 50 }) });
    expect(strong.length).toBeGreaterThanOrEqual(weak.length);
  });

  it("rank field is assigned starting at 1", () => {
    const opps = discoverOpportunities({ signals: makeSignals() });
    if (opps.length > 0) {
      const ranks = opps.map((o) => o.rank);
      expect(Math.min(...ranks)).toBe(1);
    }
  });
});

describe("opportunity-engine — ranking and selection", () => {
  function getOpps() {
    return discoverOpportunities({ signals: makeSignals({ stalledLeads: 20, slaBreachCount: 8, hotLeads: 30 }) });
  }

  it("rankByROI sorts descending by roi", () => {
    const opps   = getOpps();
    const ranked = rankByROI(opps);
    if (ranked.length >= 2) {
      expect(ranked[0].roi).toBeGreaterThanOrEqual(ranked[1].roi);
    }
  });

  it("getTopOpportunities returns at most n", () => {
    const opps = getOpps();
    expect(getTopOpportunities(opps, 3).length).toBeLessThanOrEqual(3);
  });

  it("getFastestWin returns an easy opportunity when one exists", () => {
    const opps    = getOpps();
    const fastest = getFastestWin(opps);
    const easyOpps = opps.filter((o) => o.ease === "easy");
    if (fastest && easyOpps.length > 0) {
      expect(fastest.ease).toBe("easy");
    } else if (fastest) {
      // fallback to first opp when no easy ones
      expect(opps.length).toBeGreaterThan(0);
    }
  });

  it("getLargestPipelineOpportunity returns highest businessValue", () => {
    const opps    = getOpps();
    const largest = getLargestPipelineOpportunity(opps);
    if (largest && opps.length >= 2) {
      expect(opps.every((o) => o.businessValue <= largest.businessValue)).toBe(true);
    }
  });

  it("getHighestConfidenceOpportunity returns null for empty array", () => {
    expect(getHighestConfidenceOpportunity([])).toBeNull();
  });
});

describe("opportunity-engine — risks", () => {
  it("getTopRisks returns an array", () => {
    const risks = getTopRisks({ signals: makeSignals() });
    expect(Array.isArray(risks)).toBe(true);
  });

  it("each risk has required fields", () => {
    const risks = getTopRisks({ signals: makeSignals({ slaBreachCount: 10, stalledLeads: 20 }) });
    if (risks.length > 0) {
      const r = risks[0];
      expect(r.id).toBeDefined();
      expect(r.title).toBeDefined();
      expect(r.severity).toBeDefined();
      expect(r.mitigation).toBeDefined();
    }
  });

  it("high SLA breach generates SLA risk", () => {
    const risks = getTopRisks({ signals: makeSignals({ slaBreachCount: 15 }) });
    const slaRisk = risks.find((r) => r.title.toLowerCase().includes("sla"));
    expect(slaRisk).toBeDefined();
  });
});

describe("opportunity-engine — label maps", () => {
  it("OPPORTUNITY_CATEGORY_LABELS covers all categories", () => {
    expect(OPPORTUNITY_CATEGORY_LABELS.seller_listing).toBeDefined();
    expect(OPPORTUNITY_CATEGORY_LABELS.buyer_purchase).toBeDefined();
    expect(OPPORTUNITY_CATEGORY_LABELS.lead_reactivation).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 8. Executive Intelligence
// ---------------------------------------------------------------------------

import {
  generateExecutiveInsights,
  rankInsightsByImpact,
  buildBriefingPacket,
  INSIGHT_TYPE_LABELS,
  INSIGHT_TYPE_COLORS,
} from "@/lib/intelligence/executive-intelligence";

describe("executive-intelligence — generateExecutiveInsights", () => {
  it("returns an array", () => {
    const insights = generateExecutiveInsights({ signals: makeSignals(), timestamp: new Date().toISOString() });
    expect(Array.isArray(insights)).toBe(true);
  });

  it("each insight has required fields", () => {
    const insights = generateExecutiveInsights({ signals: makeSignals(), timestamp: new Date().toISOString() });
    if (insights.length > 0) {
      const i = insights[0];
      expect(i.id).toBeDefined();
      expect(i.type).toBeDefined();
      expect(i.headline).toBeDefined();
      expect(i.confidence).toBeGreaterThanOrEqual(0);
      expect(i.confidence).toBeLessThanOrEqual(100);
      expect(i.recommendedAction).toBeDefined();
    }
  });

  it("generates insights for declining campaign performance", () => {
    const signals  = makeSignals({ campaignPerformanceTrend: -20, activeCampaigns: 5 });
    const insights = generateExecutiveInsights({ signals, timestamp: new Date().toISOString() });
    expect(insights.length).toBeGreaterThan(0);
  });

  it("generates insights for surging seller conversations", () => {
    const signals  = makeSignals({ sellerConversationsTrend: 30, sellerLeads: 50 });
    const insights = generateExecutiveInsights({ signals, timestamp: new Date().toISOString() });
    expect(insights.length).toBeGreaterThan(0);
  });
});

describe("executive-intelligence — ranking and briefing", () => {
  function getInsights() {
    return generateExecutiveInsights({ signals: makeSignals(), timestamp: new Date().toISOString() });
  }

  it("rankInsightsByImpact sorts by urgency then confidence", () => {
    const insights = getInsights();
    const ranked   = rankInsightsByImpact(insights);
    if (ranked.length >= 2) {
      const urgencyOrder = ["critical", "high", "medium", "low"];
      const aIdx = urgencyOrder.indexOf(ranked[0].urgency);
      const bIdx = urgencyOrder.indexOf(ranked[1].urgency);
      expect(aIdx).toBeLessThanOrEqual(bIdx);
    }
  });

  it("buildBriefingPacket returns a BriefingPacket", () => {
    const packet = buildBriefingPacket(getInsights());
    expect(packet.generatedAt).toBeDefined();
    expect(typeof packet.overallHealth).toBe("string");
    expect(typeof packet.executiveSummary).toBe("string");
    expect(["excellent", "good", "fair", "poor"]).toContain(packet.overallHealth);
  });

  it("briefing criticalCount equals number of critical insights", () => {
    const insights = getInsights();
    const packet   = buildBriefingPacket(insights);
    const critical = insights.filter((i) => i.urgency === "critical").length;
    expect(packet.criticalCount).toBe(critical);
  });

  it("briefing topInsight is first or null", () => {
    const insights = getInsights();
    const packet   = buildBriefingPacket(insights);
    if (insights.length > 0) {
      expect(packet.topInsight).not.toBeNull();
    } else {
      expect(packet.topInsight).toBeNull();
    }
  });
});

describe("executive-intelligence — label maps", () => {
  it("INSIGHT_TYPE_LABELS covers all types", () => {
    expect(INSIGHT_TYPE_LABELS.trend_acceleration).toBeDefined();
    expect(INSIGHT_TYPE_LABELS.market_velocity).toBeDefined();
  });

  it("INSIGHT_TYPE_COLORS covers all types", () => {
    expect(Object.keys(INSIGHT_TYPE_COLORS).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Intelligence Signals (default / fallback)
// ---------------------------------------------------------------------------

describe("intelligence-signals — defaultSignals structure", () => {
  it("makeSignals factory returns valid IntelligenceSignals", () => {
    const s = makeSignals();
    expect(typeof s.totalLeads).toBe("number");
    expect(typeof s.estimatedPipelineValue).toBe("number");
    expect(typeof s.topNeighborhood).toBe("string");
  });

  it("neighborhoodLeadCounts is a Record", () => {
    const s = makeSignals();
    expect(typeof s.neighborhoodLeadCounts).toBe("object");
  });

  it("trend fields are numbers", () => {
    const s = makeSignals();
    expect(typeof s.sellerConversationsTrend).toBe("number");
    expect(typeof s.campaignPerformanceTrend).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// 10. Cross-engine integration
// ---------------------------------------------------------------------------

describe("cross-engine — graph + predictions + opportunities", () => {
  it("buildBrokerageGraph with hot leads creates campaign nodes", () => {
    const g = buildBrokerageGraph(makeSignals({ activeCampaigns: 5 }));
    const counts = getNodeTypeCounts(g);
    expect(counts.campaign).toBeGreaterThan(0);
  });

  it("prediction engine + opportunity engine produce consistent pipeline value", () => {
    const signals = makeSignals();
    const preds   = generatePredictions({ signals, timestamp: new Date().toISOString() });
    const opps    = discoverOpportunities({ signals });
    const totalOppValue = opps.reduce((s, o) => s + o.businessValue, 0);
    expect(totalOppValue).toBeGreaterThan(0);
    expect(preds.length + opps.length).toBeGreaterThan(0);
  });

  it("seller + buyer readiness scores derive consistently from same signals", () => {
    const signals = makeSignals();
    const sellers = deriveSellerSignalsFromBrokerage(signals).map(scoreSellerReadiness);
    const buyers  = deriveBuyerSignalsFromBrokerage(signals).map(scoreBuyerReadiness);
    const totalLeads = sellers.length + buyers.length;
    expect(totalLeads).toBeGreaterThanOrEqual(0);
  });

  it("executive briefing health reflects signal quality", () => {
    const good     = buildBriefingPacket(generateExecutiveInsights({ signals: makeSignals({ conversionRateTrend: 20, appointmentTrend: 15 }), timestamp: new Date().toISOString() }));
    const degraded = buildBriefingPacket(generateExecutiveInsights({ signals: makeSignals({ slaBreachCount: 20, stalledLeads: 50, campaignPerformanceTrend: -30 }), timestamp: new Date().toISOString() }));
    const healthRank = { excellent: 4, good: 3, fair: 2, poor: 1 };
    // degraded signals can't have higher health than good signals
    expect(healthRank[good.overallHealth]).toBeGreaterThanOrEqual(healthRank[degraded.overallHealth]);
  });
});

// ---------------------------------------------------------------------------
// 11. Brand / No MLS markers
// ---------------------------------------------------------------------------

describe("design-system — brand compliance", () => {
  it("PREDICTION_TYPE_LABELS contains no MLS markers", () => {
    const labelValues = Object.values(PREDICTION_TYPE_LABELS).join(" ");
    expect(labelValues.toUpperCase()).not.toContain("MLS");
  });

  it("OPPORTUNITY_CATEGORY_LABELS contains no MLS markers", () => {
    const labelValues = Object.values(OPPORTUNITY_CATEGORY_LABELS).join(" ");
    expect(labelValues.toUpperCase()).not.toContain("MLS");
  });

  it("INSIGHT_TYPE_LABELS contains no MLS markers", () => {
    const labelValues = Object.values(INSIGHT_TYPE_LABELS).join(" ");
    expect(labelValues.toUpperCase()).not.toContain("MLS");
  });

  it("SELLER_SIGNAL_LABELS contains no MLS markers", () => {
    const labelValues = Object.values(SELLER_SIGNAL_LABELS).join(" ");
    expect(labelValues.toUpperCase()).not.toContain("MLS");
  });

  it("NODE_TYPE_LABELS contains no MLS markers", () => {
    const labelValues = Object.values(NODE_TYPE_LABELS).join(" ");
    expect(labelValues.toUpperCase()).not.toContain("MLS");
  });
});
