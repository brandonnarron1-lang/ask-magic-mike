/**
 * Revenue Command Center — pure data loader.
 *
 * Accepts a Supabase admin client as a parameter so it is fully testable
 * without environment variables. All reads are non-mutating. Degrades
 * gracefully when optional tables (lead_routing, lead_scores) are absent.
 *
 * NEVER logs secrets. NEVER performs writes.
 */

import { isSyntheticEmail } from "@/lib/leads/synthetic-detection";
<<<<<<< HEAD
=======
import type { LeadPipelineRow } from "./revenue-forecast";

>>>>>>> origin/main
// Re-export so existing callers don't break.
export { isSyntheticEmail };

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface TrafficPathRow {
  leads7d: number;
  leads30d: number;
  avgScore: number | null;
  hotUrgentCount: number;
  missingAttribution30d: number;
}

export interface RevenueCommandData {
  funnelHealth: {
    leads24h: number;
    leads7d: number;
    leads30d: number;
    unattributed7d: number;
    wordpressWidget24h: number;
    wordpressWidget7d: number;
    highIntent24h: number;
  };
  trafficPathScorecard: {
    website_widget: TrafficPathRow;
    homepage_cta: TrafficPathRow;
    agent_profile_cta: TrafficPathRow;
    direct_unknown: TrafficPathRow;
  };
  sourceAttribution: {
    byReferrerType: Record<string, number>;
    byUtmSource: Record<string, number>;
    byUtmMedium: Record<string, number>;
    byCampaign: Record<string, number>;
  };
  qualification: {
    byTemperature: Record<string, number>;
    byScoreBand: { "0-25": number; "26-50": number; "51-75": number; "76-100": number };
    missingScore: number;
  };
  routing: {
    assigned: number;
    unassigned: number;
    statusCounts: Record<string, number>;
    oldestUnassignedAge: string | null;
  } | null;
  followUpQueue: Array<{
    id: string;
    createdAt: string;
    firstName: string | null;
    hasEmail: boolean;
    hasPhone: boolean;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    referrerType: string | null;
    score: number | null;
    temperature: string | null;
    assigned: boolean;
    grade: string | null;
    leadType: string | null;
    leadDetailUrl: string;
  }>;
  pipelineLeads: LeadPipelineRow[];
  attributionIntegrity: {
    missingAttribution7d: number;
    missingReferrerType: number;
    websiteWidgetCount: number;
    latestAttributionAt: string | null;
    latestLeadAt: string | null;
  };
  syntheticResidues: Array<{
    id: string;
    email: string;
    createdAt: string;
  }>;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Raw DB row shapes (loose — avoids dependency on generated database.types)
// ---------------------------------------------------------------------------

type AnyRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadRevenueCommand(client: any): Promise<RevenueCommandData> {
  const now = new Date();
  const ago24h  = new Date(now.getTime() - 24  * 60 * 60 * 1000).toISOString();
  const ago7d   = new Date(now.getTime() - 7   * 24 * 60 * 60 * 1000).toISOString();
  const ago30d  = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000).toISOString();

  // -------------------------------------------------------------------------
  // 1. Fetch leads (last 30 days + a tail for queue)
  // -------------------------------------------------------------------------
  const { data: leadsRaw, error: leadsError } = await client
    .from("leads")
    .select("id, created_at, first_name, email, phone, assigned_agent_id, status, lead_grade, lead_type")
    .gte("created_at", ago30d)
    .order("created_at", { ascending: false })
    .limit(1000);

  const leads: AnyRow[] = leadsError ? [] : (leadsRaw ?? []);
  const leadIds = leads.map((l) => l.id as string).filter(Boolean);

  // -------------------------------------------------------------------------
  // 2. Fetch source_attribution for those leads
  // -------------------------------------------------------------------------
  let attrRows: AnyRow[] = [];
  if (leadIds.length > 0) {
    try {
      const { data } = await client
        .from("source_attribution")
        .select(
          "lead_id, utm_source, utm_medium, utm_campaign, referrer_type, created_at"
        )
        .in("lead_id", leadIds);
      attrRows = data ?? [];
    } catch {
      // Non-fatal
    }
  }

  const attrByLeadId = new Map<string, AnyRow>();
  for (const row of attrRows) {
    attrByLeadId.set(row.lead_id as string, row);
  }

  // -------------------------------------------------------------------------
  // 3. Fetch lead_scores (optional — non-fatal on missing table)
  // -------------------------------------------------------------------------
  let scoreRows: AnyRow[] = [];
  if (leadIds.length > 0) {
    try {
      const { data } = await client
        .from("lead_scores")
        .select("lead_id, composite_score, temperature")
        .in("lead_id", leadIds);
      scoreRows = data ?? [];
    } catch {
      // Non-fatal: lead_scores may not exist
    }
  }

  const scoreByLeadId = new Map<string, AnyRow>();
  for (const row of scoreRows) {
    scoreByLeadId.set(row.lead_id as string, row);
  }

  // -------------------------------------------------------------------------
  // 4. Fetch lead_routing (optional — returns null section on error)
  // -------------------------------------------------------------------------
  let routingData: RevenueCommandData["routing"] = null;
  try {
    const { data: routingRaw, error: routingError } = await client
      .from("lead_routing")
      .select("lead_id, assigned_agent_id, status, created_at")
      .limit(1000);

    if (!routingError && routingRaw) {
      const routingRows = routingRaw as AnyRow[];
      let assigned = 0;
      let unassigned = 0;
      const statusCounts: Record<string, number> = {};
      let oldestUnassignedDate: Date | null = null;

      for (const r of routingRows) {
        const isAssigned = Boolean(r.assigned_agent_id);
        if (isAssigned) {
          assigned++;
        } else {
          unassigned++;
          const createdAt = new Date(r.created_at as string);
          if (!oldestUnassignedDate || createdAt < oldestUnassignedDate) {
            oldestUnassignedDate = createdAt;
          }
        }
        const status = (r.status as string | null) ?? "unknown";
        statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      }

      routingData = {
        assigned,
        unassigned,
        statusCounts,
        oldestUnassignedAge: oldestUnassignedDate ? oldestUnassignedDate.toISOString() : null,
      };
    }
  } catch {
    // Non-fatal: lead_routing table may not exist
  }

  // -------------------------------------------------------------------------
  // 5. Compute funnel health
  // -------------------------------------------------------------------------
  const HOT_URGENT = new Set(["hot", "urgent"]);

  let leads24h = 0;
  let leads7d = 0;
  const leads30d = leads.length;
  let unattributed7d = 0;
  let wordpressWidget24h = 0;
  let wordpressWidget7d = 0;
  let highIntent24h = 0;

  for (const l of leads) {
    const createdAt = l.created_at as string;
    const is7d = createdAt >= ago7d;
    const is24h = createdAt >= ago24h;
    if (is24h) {
      leads24h++;
      const sc = scoreByLeadId.get(l.id as string);
      const temp = (sc?.temperature as string | null) ?? null;
      if (temp && HOT_URGENT.has(temp)) highIntent24h++;
      const attr24 = attrByLeadId.get(l.id as string);
      if (attr24 && (attr24.utm_campaign as string | null) === "website_widget") {
        wordpressWidget24h++;
      }
    }
    if (is7d) {
      leads7d++;
      const attr = attrByLeadId.get(l.id as string);
      if (!attr) {
        unattributed7d++;
      }
      if (attr && (attr.utm_campaign as string | null) === "website_widget") {
        wordpressWidget7d++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. Source attribution aggregates (using all attrRows, not just 7d)
  // -------------------------------------------------------------------------
  const byReferrerType: Record<string, number> = {};
  const byUtmSource: Record<string, number> = {};
  const byUtmMedium: Record<string, number> = {};
  const byCampaign: Record<string, number> = {};

  for (const row of attrRows) {
    const rt = (row.referrer_type as string | null) ?? "(none)";
    byReferrerType[rt] = (byReferrerType[rt] ?? 0) + 1;

    const us = (row.utm_source as string | null) ?? "(none)";
    byUtmSource[us] = (byUtmSource[us] ?? 0) + 1;

    const um = (row.utm_medium as string | null) ?? "(none)";
    byUtmMedium[um] = (byUtmMedium[um] ?? 0) + 1;

    const uc = (row.utm_campaign as string | null) ?? "(none)";
    byCampaign[uc] = (byCampaign[uc] ?? 0) + 1;
  }

  // -------------------------------------------------------------------------
  // 6b. Traffic path scorecard (by utm_medium for known OTP paths)
  // -------------------------------------------------------------------------
  const KNOWN_PATHS = ["website_widget", "homepage_cta", "agent_profile_cta"] as const;

  function emptyPathRow(): TrafficPathRow {
    return { leads7d: 0, leads30d: 0, avgScore: null, hotUrgentCount: 0, missingAttribution30d: 0 };
  }

  const pathRows: Record<string, TrafficPathRow> = {
    website_widget:    emptyPathRow(),
    homepage_cta:      emptyPathRow(),
    agent_profile_cta: emptyPathRow(),
    direct_unknown:    emptyPathRow(),
  };
  const pathScoreAccum: Record<string, number[]> = {
    website_widget: [], homepage_cta: [], agent_profile_cta: [], direct_unknown: [],
  };

  for (const l of leads) {
    const createdAt = l.created_at as string;
    const is7d = createdAt >= ago7d;
    const attr = attrByLeadId.get(l.id as string);
    const medium = (attr?.utm_medium as string | null) ?? null;
    const sc = scoreByLeadId.get(l.id as string);
    const temp = (sc?.temperature as string | null) ?? null;
    const score = typeof sc?.composite_score === "number" ? (sc.composite_score as number) : null;

    let pathKey: string;
    if (medium && (KNOWN_PATHS as readonly string[]).includes(medium)) {
      pathKey = medium;
    } else {
      pathKey = "direct_unknown";
    }

    const row = pathRows[pathKey];
    row.leads30d++;
    if (is7d) row.leads7d++;
    if (!attr) row.missingAttribution30d++;
    if (temp && HOT_URGENT.has(temp)) row.hotUrgentCount++;
    if (score !== null) pathScoreAccum[pathKey].push(score);
  }

  for (const key of Object.keys(pathRows)) {
    const scores = pathScoreAccum[key];
    pathRows[key].avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  }

  const trafficPathScorecard: RevenueCommandData["trafficPathScorecard"] = {
    website_widget:    pathRows["website_widget"],
    homepage_cta:      pathRows["homepage_cta"],
    agent_profile_cta: pathRows["agent_profile_cta"],
    direct_unknown:    pathRows["direct_unknown"],
  };

  // -------------------------------------------------------------------------
  // 7. Qualification
  // -------------------------------------------------------------------------
  const byTemperature: Record<string, number> = {};
  const byScoreBand: RevenueCommandData["qualification"]["byScoreBand"] = {
    "0-25": 0,
    "26-50": 0,
    "51-75": 0,
    "76-100": 0,
  };
  let missingScore = 0;

  for (const l of leads) {
    const sc = scoreByLeadId.get(l.id as string);
    const temp = (sc?.temperature as string | null) ?? null;
    if (temp) {
      byTemperature[temp] = (byTemperature[temp] ?? 0) + 1;
    }
    const score = typeof sc?.composite_score === "number" ? (sc.composite_score as number) : null;
    if (score === null) {
      missingScore++;
    } else if (score <= 25) {
      byScoreBand["0-25"]++;
    } else if (score <= 50) {
      byScoreBand["26-50"]++;
    } else if (score <= 75) {
      byScoreBand["51-75"]++;
    } else {
      byScoreBand["76-100"]++;
    }
  }

  // -------------------------------------------------------------------------
  // 8. Follow-up queue — top 20 non-synthetic, priority-sorted
  //    Priority: urgent/hot first → score desc → newest first
  // -------------------------------------------------------------------------
  const TEMP_PRIORITY: Record<string, number> = { urgent: 0, hot: 1, warm: 2, low: 3 };

  const queueCandidates: RevenueCommandData["followUpQueue"] = [];
  for (const l of leads) {
    const email = (l.email as string | null) ?? null;
    if (isSyntheticEmail(email)) continue;

    const attr = attrByLeadId.get(l.id as string) ?? null;
    const sc = scoreByLeadId.get(l.id as string) ?? null;

    queueCandidates.push({
      id: l.id as string,
      createdAt: l.created_at as string,
      firstName: (l.first_name as string | null) ?? null,
      hasEmail: Boolean(email),
      hasPhone: Boolean(l.phone),
      utmSource: (attr?.utm_source as string | null) ?? null,
      utmMedium: (attr?.utm_medium as string | null) ?? null,
      utmCampaign: (attr?.utm_campaign as string | null) ?? null,
      referrerType: (attr?.referrer_type as string | null) ?? null,
      score: typeof sc?.composite_score === "number" ? (sc.composite_score as number) : null,
      temperature: (sc?.temperature as string | null) ?? null,
      assigned: Boolean(l.assigned_agent_id),
      grade: (l.lead_grade as string | null) ?? null,
      leadType: (l.lead_type as string | null) ?? null,
      leadDetailUrl: `/admin/leads/${l.id as string}`,
    });
  }

  queueCandidates.sort((a, b) => {
    const ta = TEMP_PRIORITY[a.temperature ?? ""] ?? 4;
    const tb = TEMP_PRIORITY[b.temperature ?? ""] ?? 4;
    if (ta !== tb) return ta - tb;
    const sa = a.score ?? -1;
    const sb = b.score ?? -1;
    if (sa !== sb) return sb - sa;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const followUpQueue = queueCandidates.slice(0, 20);

  // -------------------------------------------------------------------------
  // 9. Attribution integrity
  // -------------------------------------------------------------------------
  const leadsIn7d = leads.filter((l) => (l.created_at as string) >= ago7d);
  const missingAttribution7d = leadsIn7d.filter(
    (l) => !attrByLeadId.has(l.id as string)
  ).length;
  const missingReferrerType = attrRows.filter(
    (r) => !(r.referrer_type as string | null)
  ).length;
  const websiteWidgetCount = attrRows.filter(
    (r) => (r.utm_campaign as string | null) === "website_widget"
  ).length;

  const latestAttrRow = attrRows[0] ?? null;
  const latestAttrRaw = latestAttrRow?.created_at as string | null;
  // latestLeadAt from leads (already sorted desc)
  const latestLeadAtRaw = (leads[0]?.created_at as string | null) ?? null;

  // -------------------------------------------------------------------------
  // 10. Synthetic residues
  // -------------------------------------------------------------------------
  // Fetch broadly (not limited to 30d) so old test seeds are visible
  let allLeadsForSynthetic: AnyRow[] = [];
  try {
    const { data: synRaw } = await client
      .from("leads")
      .select("id, email, created_at")
      .limit(2000);
    allLeadsForSynthetic = synRaw ?? [];
  } catch {
    // Non-fatal
  }

  const syntheticResidues: RevenueCommandData["syntheticResidues"] = [];
  for (const l of allLeadsForSynthetic) {
    const email = (l.email as string | null) ?? null;
    if (isSyntheticEmail(email)) {
      syntheticResidues.push({
        id: l.id as string,
        email: email ?? "",
        createdAt: l.created_at as string,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 11. Pipeline leads for revenue forecast
  // -------------------------------------------------------------------------
  const pipelineLeads: LeadPipelineRow[] = leads
    .filter((l) => !isSyntheticEmail(l.email as string | null))
    .map((l): LeadPipelineRow => {
      const attr = attrByLeadId.get(l.id as string) ?? null;
      const sc   = scoreByLeadId.get(l.id as string) ?? null;
      return {
        id: l.id as string,
        grade:            (l.lead_grade as string | null) ?? null,
        temperature:      (sc?.temperature as string | null) ?? null,
        leadType:         (l.lead_type as string | null) ?? null,
        status:           (l.status as string | null) ?? null,
        estimatedHomeValue: null,
        utmSource:        (attr?.utm_source as string | null) ?? null,
        utmCampaign:      (attr?.utm_campaign as string | null) ?? null,
        assignedAgentId:  (l.assigned_agent_id as string | null) ?? null,
        createdAt:        (l.created_at as string | null) ?? null,
      };
    });

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    funnelHealth: {
      leads24h,
      leads7d,
      leads30d,
      unattributed7d,
      wordpressWidget24h,
      wordpressWidget7d,
      highIntent24h,
    },
    trafficPathScorecard,
    sourceAttribution: {
      byReferrerType,
      byUtmSource,
      byUtmMedium,
      byCampaign,
    },
    qualification: {
      byTemperature,
      byScoreBand,
      missingScore,
    },
    routing: routingData,
    followUpQueue,
    attributionIntegrity: {
      missingAttribution7d,
      missingReferrerType,
      websiteWidgetCount,
      latestAttributionAt: latestAttrRaw ?? null,
      latestLeadAt: latestLeadAtRaw,
    },
    syntheticResidues,
    pipelineLeads,
    generatedAt: now.toISOString(),
  };
}
