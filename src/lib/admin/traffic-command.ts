/**
 * Traffic Command Center — data loader.
 *
 * Derives all traffic metrics from the existing Supabase schema:
 *   leads, source_attribution, analytics_events, lead_scores
 *
 * No schema changes. No writes. No outbound calls.
 * Degrades gracefully on missing optional tables.
 */

import { buildSourceRollup } from "./source-attribution-rollup";
import type { SourceRollupSummary, AttrInputRow } from "./source-attribution-rollup";
import { buildQuestionIntelligence } from "./question-intelligence";
import type { QuestionIntelligence, QuestionInputRow } from "./question-intelligence";
import { buildContentOpportunities } from "./content-opportunity";
import type { ContentOpportunity } from "./content-opportunity";
import { buildViralPostSet } from "./viral-post-builder";
import type { ViralPostSet } from "./viral-post-builder";
import { buildMarketHeatmap } from "./market-heatmap";
import type { MarketHeatmap, HeatmapInputRow } from "./market-heatmap";
import { isSyntheticEmail } from "@/lib/leads/synthetic-detection";

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface TrafficSummary {
  /** Unique sessions in the last 24h (from analytics_events, or leads as fallback). */
  sessions24h: number;
  sessions7d: number;
  returning7d: number;
  leads24h: number;
  leads7d: number;
  leads30d: number;
  highIntent24h: number;
  unattributed7d: number;
  widgetLeads7d: number;
  widgetLeads24h: number;
  /** Synthetic/test leads in 30d window. */
  synthetic7d: number;
  topSource: string | null;
  topCampaign: string | null;
  topLandingPage: string | null;
  topQuestion: string | null;
  conversionRate: number | null; // 0–100 (percent)
}

export type SocialPreviewStatus = "clear" | "blocked" | "unknown";

export interface TrafficCommandData {
  summary: TrafficSummary;
  sourceRollup: SourceRollupSummary;
  questionIntel: QuestionIntelligence;
  contentOpportunities: ContentOpportunity[];
  viralPosts: ViralPostSet;
  marketHeatmap: MarketHeatmap;
  socialPreviewStatus: SocialPreviewStatus;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Raw DB row shapes
// ---------------------------------------------------------------------------

type AnyRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadTrafficCommand(client: any): Promise<TrafficCommandData> {
  const now = new Date();
  const ago24h = new Date(now.getTime() - 24  * 60 * 60 * 1000).toISOString();
  const ago7d  = new Date(now.getTime() - 7   * 24 * 60 * 60 * 1000).toISOString();
  const ago30d = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000).toISOString();

  // -------------------------------------------------------------------------
  // 1. Leads (30d)
  // -------------------------------------------------------------------------
  const { data: leadsRaw, error: leadsError } = await client
    .from("leads")
    .select(
      "id, created_at, email, primary_intent, lead_type, cta_chip_used, question_raw, page_url"
    )
    .gte("created_at", ago30d)
    .order("created_at", { ascending: false })
    .limit(2000);

  const leads: AnyRow[] = leadsError ? [] : (leadsRaw ?? []);
  const leadIds = leads.map((l) => l.id as string).filter(Boolean);

  // -------------------------------------------------------------------------
  // 2. Source attribution
  // -------------------------------------------------------------------------
  let attrRows: AnyRow[] = [];
  if (leadIds.length > 0) {
    try {
      const { data } = await client
        .from("source_attribution")
        .select(
          "lead_id, utm_source, utm_medium, utm_campaign, utm_content, referrer_type, landing_page, is_paid"
        )
        .in("lead_id", leadIds);
      attrRows = data ?? [];
    } catch {
      // Non-fatal
    }
  }

  const attrByLeadId = new Map<string, AnyRow>();
  for (const r of attrRows) {
    attrByLeadId.set(r.lead_id as string, r);
  }

  // -------------------------------------------------------------------------
  // 3. Analytics events (sessions) — non-fatal on missing table
  // -------------------------------------------------------------------------
  let sessionEvents: AnyRow[] = [];
  try {
    const { data: evRaw } = await client
      .from("analytics_events")
      .select("occurred_at, session_id, event_name, utm_source, utm_medium, utm_campaign")
      .in("event_name", ["session_start", "page_view"])
      .gte("occurred_at", ago7d)
      .order("occurred_at", { ascending: false })
      .limit(5000);
    sessionEvents = evRaw ?? [];
  } catch {
    // analytics_events may not be populated
  }

  // -------------------------------------------------------------------------
  // 4. Lead scores (optional)
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
      // Non-fatal
    }
  }
  const scoreByLeadId = new Map<string, AnyRow>();
  for (const r of scoreRows) {
    scoreByLeadId.set(r.lead_id as string, r);
  }

  // -------------------------------------------------------------------------
  // 5. Compute summary metrics
  // -------------------------------------------------------------------------
  const HOT_URGENT = new Set(["hot", "urgent"]);

  let leads24h = 0;
  let leads7d = 0;
  const leads30d = leads.length;
  let unattributed7d = 0;
  let widgetLeads7d = 0;
  let widgetLeads24h = 0;
  let highIntent24h = 0;
  let synthetic7d = 0;

  for (const l of leads) {
    const createdAt = l.created_at as string;
    const is7d  = createdAt >= ago7d;
    const is24h = createdAt >= ago24h;
    const isSynth = isSyntheticEmail(l.email as string | null);

    if (is7d  && isSynth) synthetic7d++;

    if (is24h) {
      leads24h++;
      const sc = scoreByLeadId.get(l.id as string);
      const temp = (sc?.temperature as string | null) ?? null;
      if (temp && HOT_URGENT.has(temp)) highIntent24h++;
      const attr24 = attrByLeadId.get(l.id as string);
      if (attr24 && (attr24.utm_campaign as string | null) === "website_widget") widgetLeads24h++;
    }
    if (is7d) {
      leads7d++;
      const attr7 = attrByLeadId.get(l.id as string);
      if (!attr7) unattributed7d++;
      if (attr7 && (attr7.utm_campaign as string | null) === "website_widget") widgetLeads7d++;
    }
  }

  // Sessions: prefer analytics_events; fallback to unique session_id in leads
  let sessions7d = 0;
  let returning7d = 0;

  if (sessionEvents.length > 0) {
    const uniqueSessions = new Set(sessionEvents.map((e) => e.session_id as string).filter(Boolean));
    sessions7d = uniqueSessions.size;
    // Sessions that appear more than once across event rows are "returning"
    const sessionCounts = new Map<string, number>();
    for (const e of sessionEvents) {
      const sid = e.session_id as string;
      if (sid) sessionCounts.set(sid, (sessionCounts.get(sid) ?? 0) + 1);
    }
    returning7d = Array.from(sessionCounts.values()).filter((c) => c > 1).length;
  } else {
    // No session event data yet — conversion rate is not computable
    sessions7d = leads7d;
    returning7d = 0;
  }

  const sessions24h = Math.max(
    leads24h,
    sessionEvents.filter((e) => (e.occurred_at as string) >= ago24h).length
  );

  // Only compute a conversion rate when we have real session event data;
  // the leads7d fallback would produce 100% which is misleading.
  const conversionRate =
    sessionEvents.length > 0 && sessions7d > 0
      ? Math.round((leads7d / sessions7d) * 1000) / 10
      : null;

  // -------------------------------------------------------------------------
  // 6. Top source / campaign / landing page / question
  // -------------------------------------------------------------------------
  const sourceCounts: Record<string, number> = {};
  const campaignCounts: Record<string, number> = {};
  const landingPageCounts: Record<string, number> = {};

  for (const r of attrRows) {
    const src = (r.utm_source as string | null) ?? null;
    const cmp = (r.utm_campaign as string | null) ?? null;
    const lp  = (r.landing_page as string | null) ?? null;
    if (src) sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
    if (cmp) campaignCounts[cmp] = (campaignCounts[cmp] ?? 0) + 1;
    if (lp)  landingPageCounts[lp] = (landingPageCounts[lp] ?? 0) + 1;
  }

  function topKey(map: Record<string, number>): string | null {
    const entries = Object.entries(map);
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  const topSource       = topKey(sourceCounts);
  const topCampaign     = topKey(campaignCounts);
  const topLandingPage  = topKey(landingPageCounts);

  // -------------------------------------------------------------------------
  // 7. Source rollup
  // -------------------------------------------------------------------------
  const attrInputRows: AttrInputRow[] = attrRows.map((r) => ({
    utm_source:    (r.utm_source    as string | null) ?? null,
    utm_medium:    (r.utm_medium    as string | null) ?? null,
    referrer_type: (r.referrer_type as string | null) ?? null,
    is_paid:       Boolean(r.is_paid),
  }));
  const sourceRollup = buildSourceRollup(attrInputRows);

  // -------------------------------------------------------------------------
  // 8. Question intelligence
  // -------------------------------------------------------------------------
  const questionInputRows: QuestionInputRow[] = leads.map((l) => ({
    question_raw: (l.question_raw as string | null) ?? null,
    utm_source: attrByLeadId.get(l.id as string)?.utm_source as string | null ?? null,
  }));
  const questionIntel = buildQuestionIntelligence(questionInputRows, 10);

  const topQuestion = questionIntel.topQuestions[0]?.text ?? null;

  // -------------------------------------------------------------------------
  // 9. Content opportunities
  // -------------------------------------------------------------------------
  const contentOpportunities = buildContentOpportunities(questionIntel, sourceRollup, 25);

  // -------------------------------------------------------------------------
  // 10. Viral posts
  // -------------------------------------------------------------------------
  const topQ = questionIntel.topQuestions[0];
  const viralPosts = buildViralPostSet(
    topQ?.text ?? null,
    topQ?.category ?? null
  );

  // -------------------------------------------------------------------------
  // 11. Market heatmap
  // -------------------------------------------------------------------------
  const heatmapInputRows: HeatmapInputRow[] = leads.map((l) => {
    const attr = attrByLeadId.get(l.id as string);
    return {
      primary_intent: (l.primary_intent as string | null) ?? null,
      lead_type:      (l.lead_type      as string | null) ?? null,
      cta_chip_used:  (l.cta_chip_used  as string | null) ?? null,
      question_raw:   (l.question_raw   as string | null) ?? null,
      utm_source:    (attr?.utm_source    as string | null) ?? null,
      referrer_type: (attr?.referrer_type as string | null) ?? null,
    };
  });
  const marketHeatmap = buildMarketHeatmap(heatmapInputRows);

  // -------------------------------------------------------------------------
  // 12. Social preview status (derived from known FB WAF state)
  //     Hardcoded based on RUN_STATE — no live check here (that's the verifier)
  // -------------------------------------------------------------------------
  const socialPreviewStatus: SocialPreviewStatus = "blocked";

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  const summary: TrafficSummary = {
    sessions24h,
    sessions7d,
    returning7d,
    leads24h,
    leads7d,
    leads30d,
    highIntent24h,
    unattributed7d,
    widgetLeads7d,
    widgetLeads24h,
    synthetic7d,
    topSource,
    topCampaign,
    topLandingPage,
    topQuestion,
    conversionRate,
  };

  return {
    summary,
    sourceRollup,
    questionIntel,
    contentOpportunities,
    viralPosts,
    marketHeatmap,
    socialPreviewStatus,
    generatedAt: now.toISOString(),
  };
}
