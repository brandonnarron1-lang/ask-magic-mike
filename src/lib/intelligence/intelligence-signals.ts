/**
 * Phase 11 — Intelligence Signal Loader
 * Reads live signals from Supabase; returns safe defaults on failure.
 * Single source of truth for all Phase 11 engine inputs.
 */

import type { IntelligenceSignals } from "./types";

// ---------------------------------------------------------------------------
// Safe defaults — used when Supabase is not configured
// ---------------------------------------------------------------------------

function defaultSignals(): IntelligenceSignals {
  const now = new Date().toISOString();
  return {
    generatedAt:   now,
    windowDays:    7,

    totalLeads:              0,
    newLeadsInWindow:        0,
    hotLeads:                0,
    sellerLeads:             0,
    buyerLeads:              0,
    reactivatedLeads:        0,
    stalledLeads:            0,
    avgLeadScore:            0,

    totalProperties:         0,
    valuationRequestsInWindow: 0,
    propertyViewsInWindow:   0,
    listingInterestLeads:    0,

    activeAgents:            0,
    avgResponseMinutes:      0,
    topAgentConversionRate:  0,
    teamAvgConversionRate:   0,
    avgHealthScore:          0,

    activeCampaigns:         0,
    campaignLeadsInWindow:   0,
    topCampaignSource:       "Organic",
    campaignConversionRate:  0,

    appointmentsInWindow:       0,
    appointmentAcceptanceRate:  0,
    missedAppointmentsInWindow: 0,
    avgResponseToAcceptMinutes: 0,

    avgConversationDepth:       0,
    sellerConversationsInWindow: 0,
    buyerConversationsInWindow:  0,
    totalQuestionsAsked:        0,

    topNeighborhood:         "Wilson, NC",
    neighborhoodLeadCounts:  {},

    estimatedPipelineValue:  0,
    predictedClosings30d:    0,
    avgDaysToClose:          0,

    sellerConversationsTrend: 0,
    appointmentTrend:         0,
    leadQualityTrend:         0,
    campaignPerformanceTrend: 0,
    conversionRateTrend:      0,

    slaBreachCount:          0,
    slaWarningCount:         0,
    avgSlaComplianceRate:    100,

    referralLeads:           0,
    referralConversionRate:  0,
  };
}

// ---------------------------------------------------------------------------
// Signal loader — graceful degradation
// ---------------------------------------------------------------------------

export async function loadIntelligenceSignals(): Promise<IntelligenceSignals> {
  try {
    const { createServerSupabaseClient } = await import("../supabase/server");
    const supabase = await createServerSupabaseClient();

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 7);
    const startIso = windowStart.toISOString();

    const [leadsRes, analyticsRes, agentsRes] = await Promise.all([
      supabase.from("leads").select("id, lead_type, grade, created_at, assigned_agent_id", { count: "exact" }),
      supabase.from("analytics_events").select("event_name, properties, created_at").gte("created_at", startIso),
      supabase.from("agents").select("id, is_active", { count: "exact" }).eq("is_active", true),
    ]);

    if (leadsRes.error || analyticsRes.error) return defaultSignals();

    const leads    = (leadsRes.data    ?? []) as Array<Record<string, string | null>>;
    const events   = (analyticsRes.data ?? []) as Array<Record<string, string | null>>;
    const agents   = (agentsRes.data    ?? []) as Array<Record<string, unknown>>;

    const newLeads      = leads.filter((l) => (l["created_at"] ?? "") >= startIso).length;
    const sellerLeads   = leads.filter((l) => l["lead_type"] === "seller").length;
    const buyerLeads    = leads.filter((l) => l["lead_type"] === "buyer").length;
    const hotLeads      = leads.filter((l) => l["grade"] === "A+" || l["grade"] === "A").length;
    const assignedLeads = leads.filter((l) => l["assigned_agent_id"]).length;

    const valuationEvents = events.filter((e) => e["event_name"]?.includes("valuation")).length;
    const apptEvents      = events.filter((e) => e["event_name"]?.includes("appointment")).length;
    const qaEvents        = events.filter((e) => e["event_name"]?.includes("question")).length;

    const neighborhoodCounts: Record<string, number> = {};
    for (const lead of leads) {
      const city = lead["city"] ?? "Wilson, NC";
      neighborhoodCounts[city] = (neighborhoodCounts[city] ?? 0) + 1;
    }
    const topNeighborhood = Object.entries(neighborhoodCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? "Wilson, NC";

    const convRate = leads.length > 0 ? Math.round((assignedLeads / leads.length) * 100) : 0;

    return {
      ...defaultSignals(),
      generatedAt:              new Date().toISOString(),
      totalLeads:               leads.length,
      newLeadsInWindow:         newLeads,
      hotLeads,
      sellerLeads,
      buyerLeads,
      activeAgents:             agents.length,
      teamAvgConversionRate:    convRate,
      valuationRequestsInWindow: valuationEvents,
      appointmentsInWindow:      apptEvents,
      totalQuestionsAsked:       qaEvents,
      topNeighborhood,
      neighborhoodLeadCounts:    neighborhoodCounts,
    };
  } catch {
    return defaultSignals();
  }
}
