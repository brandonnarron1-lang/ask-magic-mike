import { neon } from "@neondatabase/serverless";
import {
  buildGrowthIntelligence,
  type GrowthChannelEconomics,
  type GrowthExperimentFact,
  type GrowthIntelligence,
  type GrowthLeadFact,
  type GrowthOpportunity,
  type GrowthOutcomeFact,
  type GrowthSpendFact,
} from "../growth/intelligence";

type Query = ReturnType<typeof neon>;
type Row = Record<string, unknown>;

export interface PersistedGrowthOpportunity {
  key: string;
  type: string;
  title: string;
  rationale: string;
  score: number;
  confidence: number;
  actionClass: string;
  status: string;
  geography: string | null;
  segment: string | null;
  detectedAt: string;
}

export interface PersistedGrowthRecommendation {
  key: string;
  scope: string;
  title: string;
  rationale: string;
  priority: number;
  confidence: number;
  actionClass: string;
  status: string;
  generatedBy: string;
  createdAt: string;
}

export interface GrowthIntelligenceView extends GrowthIntelligence {
  configured: boolean;
  schemaReady: boolean;
  windowDays: 30 | 90 | 365;
  generatedAt: string;
  error?: string;
  experiments: GrowthExperimentFact[];
  persistedOpportunities: PersistedGrowthOpportunity[];
  recommendations: PersistedGrowthRecommendation[];
  sourceRowsRead: number;
  spendRowsRead: number;
  outcomeRowsRead: number;
}

function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function nullableText(value: unknown) {
  const valueText = text(value).trim();
  return valueText || null;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function timestamp(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const valueText = text(value).trim();
  return valueText || new Date(0).toISOString();
}

function emptyView(
  configured: boolean,
  windowDays: 30 | 90 | 365,
  now: Date,
  error?: string,
): GrowthIntelligenceView {
  const intelligence = buildGrowthIntelligence({ leads: [], now });
  return {
    ...intelligence,
    configured,
    schemaReady: false,
    windowDays,
    generatedAt: now.toISOString(),
    experiments: [],
    persistedOpportunities: [],
    recommendations: [],
    sourceRowsRead: 0,
    spendRowsRead: 0,
    outcomeRowsRead: 0,
    ...(error ? { error } : {}),
  };
}

async function detectGrowthSchema(sql: Query) {
  const rows = await sql.query(
    `SELECT
       to_regclass('public.marketing_spend_daily') IS NOT NULL AS has_spend,
       to_regclass('public.lead_outcomes') IS NOT NULL AS has_outcomes,
       to_regclass('public.growth_experiments') IS NOT NULL AS has_experiments,
       to_regclass('public.market_opportunities') IS NOT NULL AS has_opportunities,
       to_regclass('public.growth_recommendations') IS NOT NULL AS has_recommendations`,
  ) as Row[];
  const row = rows[0] ?? {};
  return {
    spend: booleanValue(row.has_spend),
    outcomes: booleanValue(row.has_outcomes),
    experiments: booleanValue(row.has_experiments),
    opportunities: booleanValue(row.has_opportunities),
    recommendations: booleanValue(row.has_recommendations),
  };
}

function normalizeLead(row: Row): GrowthLeadFact {
  return {
    id: text(row.id),
    createdAt: timestamp(row.created_at),
    status: text(row.status, "new"),
    conversionStage: nullableText(row.conversion_stage),
    source: nullableText(row.utm_source) ?? nullableText(row.source),
    medium: nullableText(row.utm_medium),
    campaign: nullableText(row.utm_campaign) ?? nullableText(row.source_detail),
    leadType: nullableText(row.lead_type),
    score: nullableNumber(row.score),
    timelineMonths: nullableNumber(row.timeline_months),
    lastContactedAt: nullableText(row.last_contacted_at),
    isPaid: booleanValue(row.is_paid),
  };
}

function normalizeSpend(row: Row): GrowthSpendFact {
  return {
    source: nullableText(row.utm_source) ?? nullableText(row.vendor),
    medium: nullableText(row.utm_medium),
    campaign: nullableText(row.utm_campaign) ?? nullableText(row.campaign_key),
    spendUsd: numberValue(row.spend_usd),
    impressions: numberValue(row.impressions),
    clicks: numberValue(row.clicks),
    platformLeads: numberValue(row.platform_leads),
  };
}

function normalizeOutcome(row: Row): GrowthOutcomeFact {
  return {
    leadId: text(row.lead_id),
    outcomeType: text(row.outcome_type),
    amountUsd: nullableNumber(row.amount_usd),
    occurredAt: nullableText(row.occurred_at),
  };
}

function normalizeExperiment(row: Row): GrowthExperimentFact {
  return {
    experimentKey: text(row.experiment_key),
    name: text(row.name),
    surface: text(row.surface),
    hypothesis: text(row.hypothesis),
    primaryMetric: text(row.primary_metric),
    status: text(row.status),
    approvalStatus: text(row.approval_status),
    minimumSampleSize: numberValue(row.minimum_sample_size, 100),
    variants: row.variants,
    startsAt: nullableText(row.starts_at),
    endsAt: nullableText(row.ends_at),
    decision: nullableText(row.decision),
  };
}

function normalizePersistedOpportunity(row: Row): PersistedGrowthOpportunity {
  return {
    key: text(row.opportunity_key),
    type: text(row.opportunity_type),
    title: text(row.title),
    rationale: text(row.rationale),
    score: numberValue(row.score),
    confidence: numberValue(row.confidence),
    actionClass: text(row.action_class),
    status: text(row.status),
    geography: nullableText(row.geography),
    segment: nullableText(row.segment),
    detectedAt: timestamp(row.detected_at),
  };
}

function normalizeRecommendation(row: Row): PersistedGrowthRecommendation {
  return {
    key: text(row.recommendation_key),
    scope: text(row.scope),
    title: text(row.title),
    rationale: text(row.rationale),
    priority: numberValue(row.priority, 5),
    confidence: numberValue(row.confidence),
    actionClass: text(row.action_class),
    status: text(row.status),
    generatedBy: text(row.generated_by),
    createdAt: timestamp(row.created_at),
  };
}

export async function loadNeonGrowthIntelligence(
  windowDays: 30 | 90 | 365 = 90,
): Promise<GrowthIntelligenceView> {
  const sql = queryFromEnv();
  const now = new Date();
  if (!sql) return emptyView(false, windowDays, now);

  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  try {
    const schema = await detectGrowthSchema(sql);
    const leadRows = await sql.query(
      `SELECT l.id, l.created_at, l.status, l.conversion_stage,
              l.source, l.source_detail, l.score, l.lead_type,
              l.timeline_months, l.last_contacted_at,
              sa.utm_source, sa.utm_medium, sa.utm_campaign, sa.is_paid
         FROM public.leads l
         LEFT JOIN LATERAL (
           SELECT utm_source, utm_medium, utm_campaign, is_paid
             FROM public.source_attribution
            WHERE lead_id = l.id
            ORDER BY created_at DESC
            LIMIT 1
         ) sa ON true
        WHERE l.created_at >= $1::timestamptz
          AND l.is_test = false
          AND l.communication_suppressed = false
        ORDER BY l.created_at DESC
        LIMIT 5000`,
      [cutoff],
    ) as Row[];

    const spendRows = schema.spend
      ? await sql.query(
          `SELECT c.utm_source, c.utm_medium, c.utm_campaign, c.campaign_key,
                  ch.vendor,
                  SUM(s.spend_usd) AS spend_usd,
                  SUM(s.impressions) AS impressions,
                  SUM(s.clicks) AS clicks,
                  SUM(s.platform_leads) AS platform_leads
             FROM public.marketing_spend_daily s
             JOIN public.marketing_campaigns c ON c.id = s.campaign_id
             JOIN public.marketing_channels ch ON ch.id = c.channel_id
            WHERE s.spend_date >= $1::date
            GROUP BY c.utm_source, c.utm_medium, c.utm_campaign, c.campaign_key, ch.vendor
            ORDER BY SUM(s.spend_usd) DESC
            LIMIT 2000`,
          [cutoff.slice(0, 10)],
        ) as Row[]
      : [];

    const outcomeRows = schema.outcomes
      ? await sql.query(
          `SELECT o.lead_id, o.outcome_type, o.amount_usd, o.occurred_at
             FROM public.lead_outcomes o
             JOIN public.leads l ON l.id = o.lead_id
            WHERE o.occurred_at >= $1::timestamptz
              AND o.is_test = false
              AND o.communication_suppressed = false
              AND l.is_test = false
              AND l.communication_suppressed = false
            ORDER BY o.occurred_at DESC
            LIMIT 5000`,
          [cutoff],
        ) as Row[]
      : [];

    const experimentRows = schema.experiments
      ? await sql.query(
          `SELECT experiment_key, name, surface, hypothesis, primary_metric,
                  status, approval_status, minimum_sample_size, variants,
                  starts_at, ends_at, decision
             FROM public.growth_experiments
            WHERE status <> 'archived'
            ORDER BY created_at DESC
            LIMIT 100`,
        ) as Row[]
      : [];

    const opportunityRows = schema.opportunities
      ? await sql.query(
          `SELECT opportunity_key, opportunity_type, title, rationale, score,
                  confidence, action_class, status, geography, segment, detected_at
             FROM public.market_opportunities
            WHERE status IN ('detected', 'accepted', 'planned', 'active')
            ORDER BY score DESC, detected_at DESC
            LIMIT 100`,
        ) as Row[]
      : [];

    const recommendationRows = schema.recommendations
      ? await sql.query(
          `SELECT recommendation_key, scope, title, rationale, priority,
                  confidence, action_class, status, generated_by, created_at
             FROM public.growth_recommendations
            WHERE status IN ('proposed', 'approved')
            ORDER BY priority ASC, created_at DESC
            LIMIT 100`,
        ) as Row[]
      : [];

    const leads = leadRows.map(normalizeLead);
    const spend = spendRows.map(normalizeSpend);
    const outcomes = outcomeRows.map(normalizeOutcome);
    const experiments = experimentRows.map(normalizeExperiment);
    const intelligence = buildGrowthIntelligence({ leads, spend, outcomes, experiments, now });

    return {
      ...intelligence,
      configured: true,
      schemaReady: Object.values(schema).every(Boolean),
      windowDays,
      generatedAt: now.toISOString(),
      experiments,
      persistedOpportunities: opportunityRows.map(normalizePersistedOpportunity),
      recommendations: recommendationRows.map(normalizeRecommendation),
      sourceRowsRead: leadRows.length,
      spendRowsRead: spendRows.length,
      outcomeRowsRead: outcomeRows.length,
    };
  } catch {
    return emptyView(true, windowDays, now, "Canonical Neon growth intelligence query failed");
  }
}

export type {
  GrowthChannelEconomics,
  GrowthOpportunity,
};
