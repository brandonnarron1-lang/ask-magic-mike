import { neon } from "@neondatabase/serverless";
import {
  buildGrowthIntelligence,
  normalizeGrowthKey,
  type GrowthChannelEconomics,
  type GrowthExperimentFact,
  type GrowthIntelligence,
  type GrowthLeadFact,
  type GrowthOpportunity,
  type GrowthOutcomeFact,
  type GrowthSpendFact,
} from "../growth/intelligence";
import {
  OWNED_DEMAND_CAMPAIGN_KEY,
  type OwnedDemandAttributionSignal,
} from "../growth/owned-demand";

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
  evidence: Record<string, unknown>;
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

export interface GrowthOutcomeMetricsSnapshot {
  configured: boolean;
  appointmentSetLeads: number;
  signedClientLeads: number;
  error?: string;
}

export interface GrowthDeliverySnapshot {
  configured: boolean;
  terminalInternalNotifications: number;
  permanentInternalFailures: number;
  eligibleEmailSends: number;
  emailBounces: number;
  deliveredCustomerMessages: number;
  customerComplaints: number;
  error?: string;
}

export interface GrowthWebVitalMetricSnapshot {
  p75: number | null;
  sampleSize: number;
  mobileP75: number | null;
  mobileSampleSize: number;
  desktopP75: number | null;
  desktopSampleSize: number;
}

export interface GrowthWebVitalsSnapshot {
  configured: boolean;
  lcp: GrowthWebVitalMetricSnapshot;
  inp: GrowthWebVitalMetricSnapshot;
  cls: GrowthWebVitalMetricSnapshot;
  error?: string;
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
  ownedDemandSignals: OwnedDemandAttributionSignal[];
  outcomeMetrics: GrowthOutcomeMetricsSnapshot;
  delivery: GrowthDeliverySnapshot;
  webVitals: GrowthWebVitalsSnapshot;
  sourceRowsRead: number;
  spendRowsRead: number;
  outcomeRowsRead: number;
  webVitalRowsRead: number;
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

function boundedObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 64));
}

function responseOwnerBasis(value: unknown): GrowthLeadFact["firstResponseOwnerBasis"] {
  return value === "responder_agent" || value === "responder_user" ||
    value === "assigned_owner_snapshot" || value === "unattributed"
    ? value
    : null;
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
    ownedDemandSignals: [],
    outcomeMetrics: {
      configured: false,
      appointmentSetLeads: 0,
      signedClientLeads: 0,
    },
    delivery: {
      configured: false,
      terminalInternalNotifications: 0,
      permanentInternalFailures: 0,
      eligibleEmailSends: 0,
      emailBounces: 0,
      deliveredCustomerMessages: 0,
      customerComplaints: 0,
    },
    webVitals: normalizeGrowthWebVitals([], false),
    sourceRowsRead: 0,
    spendRowsRead: 0,
    outcomeRowsRead: 0,
    webVitalRowsRead: 0,
    ...(error ? { error } : {}),
  };
}

async function detectGrowthSchema(sql: Query) {
  const rows = await sql.query(
    `SELECT
       to_regclass('public.marketing_spend_daily') IS NOT NULL AS has_spend,
       to_regclass('public.lead_outcomes') IS NOT NULL AS has_outcomes,
       to_regclass('public.lead_response_milestones') IS NOT NULL AS has_responses,
       to_regclass('public.growth_experiments') IS NOT NULL AS has_experiments,
       to_regclass('public.market_opportunities') IS NOT NULL AS has_opportunities,
       to_regclass('public.growth_recommendations') IS NOT NULL AS has_recommendations,
       to_regclass('public.lead_notifications') IS NOT NULL AS has_notifications,
       to_regclass('public.communication_events') IS NOT NULL AS has_communication_events,
       to_regclass('public.analytics_events') IS NOT NULL AS has_analytics`,
  ) as Row[];
  const row = rows[0] ?? {};
  return {
    spend: booleanValue(row.has_spend),
    outcomes: booleanValue(row.has_outcomes),
    responses: booleanValue(row.has_responses),
    experiments: booleanValue(row.has_experiments),
    opportunities: booleanValue(row.has_opportunities),
    recommendations: booleanValue(row.has_recommendations),
    notifications: booleanValue(row.has_notifications),
    communicationEvents: booleanValue(row.has_communication_events),
    analytics: booleanValue(row.has_analytics),
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
    firstHumanResponseAt: nullableText(row.first_human_response_at),
    firstResponseOwnerKey: nullableText(row.first_response_owner_key),
    firstResponseOwnerLabel: nullableText(row.first_response_owner_label),
    firstResponseOwnerBasis: responseOwnerBasis(row.first_response_owner_basis),
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
    evidence: boundedObject(row.evidence),
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

export function buildGrowthOutcomeMetrics(
  leads: GrowthLeadFact[],
  outcomes: GrowthOutcomeFact[],
  configured: boolean,
  error?: string,
): GrowthOutcomeMetricsSnapshot {
  const eligibleLeadIds = new Set(leads.map((lead) => lead.id));
  const appointmentSetLeads = new Set<string>();
  const signedClientLeads = new Set<string>();

  for (const outcome of outcomes) {
    if (!eligibleLeadIds.has(outcome.leadId)) continue;
    const outcomeType = normalizeGrowthKey(outcome.outcomeType);
    if (outcomeType === "appointment") appointmentSetLeads.add(outcome.leadId);
    if (outcomeType === "agreement_signed") signedClientLeads.add(outcome.leadId);
  }

  return {
    configured: configured && !error,
    appointmentSetLeads: appointmentSetLeads.size,
    signedClientLeads: signedClientLeads.size,
    ...(error ? { error } : {}),
  };
}

export function normalizeGrowthDeliverySnapshot(
  rows: Row[],
  configured: boolean,
  error?: string,
): GrowthDeliverySnapshot {
  const row = rows[0] ?? {};
  return {
    configured: configured && !error,
    terminalInternalNotifications: numberValue(row.terminal_internal_notifications),
    permanentInternalFailures: numberValue(row.permanent_internal_failures),
    eligibleEmailSends: numberValue(row.eligible_email_sends),
    emailBounces: numberValue(row.email_bounces),
    deliveredCustomerMessages: numberValue(row.delivered_customer_messages),
    customerComplaints: numberValue(row.customer_complaints),
    ...(error ? { error } : {}),
  };
}

function emptyWebVitalMetric(): GrowthWebVitalMetricSnapshot {
  return {
    p75: null,
    sampleSize: 0,
    mobileP75: null,
    mobileSampleSize: 0,
    desktopP75: null,
    desktopSampleSize: 0,
  };
}

export function normalizeGrowthWebVitals(
  rows: Row[],
  configured: boolean,
  error?: string,
): GrowthWebVitalsSnapshot {
  const byMetricAndDevice = new Map(
    rows.map((row) => [
      `${text(row.metric_name).toUpperCase()}:${text(row.device_category).toLowerCase()}`,
      row,
    ]),
  );
  const metric = (metricName: "LCP" | "INP" | "CLS"): GrowthWebVitalMetricSnapshot => {
    const all = byMetricAndDevice.get(`${metricName}:all`);
    const mobile = byMetricAndDevice.get(`${metricName}:mobile`);
    const desktop = byMetricAndDevice.get(`${metricName}:desktop`);
    return {
      ...emptyWebVitalMetric(),
      p75: nullableNumber(all?.p75),
      sampleSize: numberValue(all?.sample_size),
      mobileP75: nullableNumber(mobile?.p75),
      mobileSampleSize: numberValue(mobile?.sample_size),
      desktopP75: nullableNumber(desktop?.p75),
      desktopSampleSize: numberValue(desktop?.sample_size),
    };
  };

  return {
    configured: configured && !error,
    lcp: metric("LCP"),
    inp: metric("INP"),
    cls: metric("CLS"),
    ...(error ? { error } : {}),
  };
}

function normalizeAttributionDimension(value: unknown) {
  return text(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const LEGACY_WORDPRESS_SOURCE_ALIASES = new Set([
  "ourtown_wp",
  "ourtownproperties",
  "ourtownproperties_com",
]);

const LEGACY_WORDPRESS_REFERRER_MAP: Record<string, {
  medium: string;
  content: string;
}> = {
  "/": {
    medium: "homepage_cta",
    content: "wordpress_homepage_ask_mike",
  },
  "/how-much-is-your-home-worth/": {
    medium: "home_value_page",
    content: "wordpress_home_value_page",
  },
  "/we-buy-homes/": {
    medium: "seller_page_cta",
    content: "wordpress_we_buy_homes",
  },
  "/ask-magic-mike/": {
    medium: "referral",
    content: "wordpress_ask_magic_mike_embed",
  },
  "/ask-mike/": {
    medium: "referral",
    content: "wordpress_ask_magic_mike_embed",
  },
};

function legacyWordPressReferrerPath(value: unknown) {
  try {
    const parsed = new URL(text(value));
    const host = parsed.hostname.toLowerCase();
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      (host !== "ourtownproperties.com" && host !== "www.ourtownproperties.com")
    ) {
      return null;
    }
    return parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  } catch {
    return null;
  }
}

function legacyWordPressCompatibilitySignal(row: Row): OwnedDemandAttributionSignal | null {
  const source = normalizeAttributionDimension(row.utm_source);
  const medium = normalizeAttributionDimension(row.utm_medium);
  const campaign = normalizeAttributionDimension(row.utm_campaign);
  const content = normalizeAttributionDimension(row.utm_content);
  const referrerPath = legacyWordPressReferrerPath(row.referrer_url);
  const mapped = referrerPath ? LEGACY_WORDPRESS_REFERRER_MAP[referrerPath] : null;

  if (
    content ||
    !mapped ||
    !LEGACY_WORDPRESS_SOURCE_ALIASES.has(source) ||
    campaign !== "website_widget" ||
    medium !== mapped.medium
  ) {
    return null;
  }

  return {
    source: "ourtownproperties",
    medium: "owned_media",
    campaign: OWNED_DEMAND_CAMPAIGN_KEY,
    content: mapped.content,
    leads: 1,
    basis: "legacy_wordpress_compatibility",
  };
}

export function buildOwnedDemandAttributionSignals(
  rows: Row[],
): OwnedDemandAttributionSignal[] {
  const signals = new Map<string, OwnedDemandAttributionSignal>();

  for (const row of rows) {
    const compatibility = legacyWordPressCompatibilitySignal(row);
    const source = compatibility?.source ?? normalizeAttributionDimension(row.utm_source);
    const medium = compatibility?.medium ?? normalizeAttributionDimension(row.utm_medium);
    const campaign = compatibility?.campaign ?? normalizeAttributionDimension(row.utm_campaign);
    const content = compatibility?.content ?? normalizeAttributionDimension(row.utm_content);
    if (!source || !medium || !campaign || !content) continue;

    const basis = compatibility?.basis ?? "exact";
    const key = `${basis}|${source}|${medium}|${campaign}|${content}`;
    const existing = signals.get(key);
    if (existing) {
      existing.leads += 1;
    } else {
      signals.set(key, {
        source,
        medium,
        campaign,
        content,
        leads: 1,
        ...(compatibility?.basis ? { basis: compatibility.basis } : {}),
      });
    }
  }

  return [...signals.values()].sort((a, b) => {
    if (b.leads !== a.leads) return b.leads - a.leads;
    return `${a.source}|${a.medium}|${a.campaign}|${a.content}`.localeCompare(
      `${b.source}|${b.medium}|${b.campaign}|${b.content}`,
    );
  });
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
    const responseSelect = schema.responses
      ? `rm.first_human_response_at,
         CASE
           WHEN rm.responder_agent_id IS NOT NULL THEN 'agent:' || rm.responder_agent_id::text
           WHEN rm.responder_user_id IS NOT NULL THEN 'user:' || rm.responder_user_id
           WHEN rm.assigned_agent_id_at_response IS NOT NULL THEN 'agent:' || rm.assigned_agent_id_at_response::text
           ELSE 'unattributed'
         END AS first_response_owner_key,
         COALESCE(
           response_agent.name,
           response_user.name,
           response_assigned.name,
           CASE WHEN rm.responder_agent_id IS NOT NULL OR rm.responder_user_id IS NOT NULL
             OR rm.assigned_agent_id_at_response IS NOT NULL
             THEN 'Former or removed response owner'
             ELSE 'Unattributed responder'
           END
         )
           AS first_response_owner_label,
         CASE
           WHEN rm.responder_agent_id IS NOT NULL THEN 'responder_agent'
           WHEN rm.responder_user_id IS NOT NULL THEN 'responder_user'
           WHEN rm.assigned_agent_id_at_response IS NOT NULL THEN 'assigned_owner_snapshot'
           ELSE 'unattributed'
         END AS first_response_owner_basis`
      : `NULL::timestamptz AS first_human_response_at,
         NULL::text AS first_response_owner_key,
         NULL::text AS first_response_owner_label,
         NULL::text AS first_response_owner_basis`;
    const responseJoin = schema.responses
      ? `LEFT JOIN public.lead_response_milestones rm
           ON rm.lead_id = l.id
          AND rm.is_test = false
          AND rm.communication_suppressed = false
         LEFT JOIN public.lead_center_users response_user
           ON response_user.id = rm.responder_user_id
         LEFT JOIN public.agents response_agent
           ON response_agent.id = rm.responder_agent_id
         LEFT JOIN public.agents response_assigned
           ON response_assigned.id = rm.assigned_agent_id_at_response`
      : "";
    const leadRows = await sql.query(
      `SELECT l.id, l.created_at, l.status, l.conversion_stage,
              l.source, l.source_detail, l.score, l.lead_type,
              l.timeline_months, l.last_contacted_at,
              ${responseSelect},
              sa.utm_source, sa.utm_medium, sa.utm_campaign, sa.utm_content,
              sa.referrer_url, sa.is_paid
         FROM public.leads l
         ${responseJoin}
         LEFT JOIN LATERAL (
           SELECT utm_source, utm_medium, utm_campaign, utm_content, referrer_url, is_paid
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
                  confidence, action_class, status, geography, segment, detected_at,
                  evidence
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

    let deliveryRows: Row[] = [];
    let deliveryError: string | undefined;
    const deliveryConfigured = schema.notifications && schema.communicationEvents;
    if (deliveryConfigured) {
      try {
        deliveryRows = await sql.query(
          `WITH eligible_notifications AS (
             SELECT n.id, n.status, n.channel, n.recipient_type,
                    n.provider_message_id, n.attempt_count
               FROM public.lead_notifications n
               JOIN public.leads l ON l.id = n.lead_id
              WHERE n.created_at >= $1::timestamptz
                AND l.is_test = false
                AND l.communication_suppressed = false
           ), event_flags AS (
             SELECT ce.lead_notification_id,
                    BOOL_OR(ce.event_type = 'bounced') AS bounced,
                    BOOL_OR(ce.event_type = 'complained') AS complained,
                    BOOL_OR(ce.event_type IN ('delivered', 'opened', 'clicked', 'complained'))
                      AS delivery_confirmed
               FROM public.communication_events ce
               JOIN eligible_notifications eligible
                 ON eligible.id = ce.lead_notification_id
              GROUP BY ce.lead_notification_id
           )
           SELECT
             COUNT(*) FILTER (
               WHERE n.recipient_type IN ('agent', 'internal')
                 AND n.attempt_count > 0
                 AND n.status IN ('sent', 'permanently_failed')
             )::integer AS terminal_internal_notifications,
             COUNT(*) FILTER (
               WHERE n.recipient_type IN ('agent', 'internal')
                 AND n.attempt_count > 0
                 AND n.status = 'permanently_failed'
             )::integer AS permanent_internal_failures,
             COUNT(*) FILTER (
               WHERE n.channel = 'email'
                 AND n.attempt_count > 0
                 AND n.provider_message_id IS NOT NULL
                 AND n.status IN ('sent', 'permanently_failed')
             )::integer AS eligible_email_sends,
             COUNT(*) FILTER (
               WHERE n.channel = 'email'
                 AND n.attempt_count > 0
                 AND n.provider_message_id IS NOT NULL
                 AND COALESCE(e.bounced, false)
             )::integer AS email_bounces,
             COUNT(*) FILTER (
               WHERE n.channel = 'email'
                 AND n.recipient_type = 'customer'
                 AND COALESCE(e.delivery_confirmed, false)
             )::integer AS delivered_customer_messages,
             COUNT(*) FILTER (
               WHERE n.channel = 'email'
                 AND n.recipient_type = 'customer'
                 AND COALESCE(e.complained, false)
             )::integer AS customer_complaints
             FROM eligible_notifications n
             LEFT JOIN event_flags e ON e.lead_notification_id = n.id`,
          [cutoff],
        ) as Row[];
      } catch {
        deliveryError = "Canonical notification-delivery aggregate query failed";
      }
    }

    let webVitalRows: Row[] = [];
    let webVitalError: string | undefined;
    if (schema.analytics) {
      try {
        webVitalRows = await sql.query(
          `WITH candidates AS (
             SELECT UPPER(properties->>'metric_code') AS metric_name,
                    properties->>'metric_id' AS metric_id,
                    (properties->>'metric_value')::double precision AS metric_value,
                    properties->>'device_category' AS device_category,
                    occurred_at
               FROM public.analytics_events
              WHERE event_name = 'web_vital_observed'
                AND occurred_at >= $1::timestamptz
                AND properties->>'traffic_class' = 'public_production'
                AND UPPER(properties->>'metric_code') IN ('LCP', 'INP', 'CLS')
                AND jsonb_typeof(properties->'metric_value') = 'number'
                AND COALESCE(properties->>'metric_id', '') ~ '^[a-zA-Z0-9._:-]{1,160}$'
                AND COALESCE(properties->>'device_category', '') IN ('mobile', 'desktop')
                AND COALESCE(user_agent, '') ~ '^browser/(mobile|desktop)$'
                AND (properties->>'metric_value')::double precision >= 0
                AND (
                  (UPPER(properties->>'metric_code') IN ('LCP', 'INP')
                    AND (properties->>'metric_value')::double precision <= 600000)
                  OR
                  (UPPER(properties->>'metric_code') = 'CLS'
                    AND (properties->>'metric_value')::double precision <= 100)
                )
              ORDER BY occurred_at DESC
              LIMIT 25000
           ), deduplicated AS (
             SELECT DISTINCT ON (metric_name, metric_id)
                    metric_name, metric_id, metric_value, device_category, occurred_at
               FROM candidates
              ORDER BY metric_name, metric_id, occurred_at DESC
           )
           SELECT metric_name,
                  CASE WHEN GROUPING(device_category) = 1 THEN 'all' ELSE device_category END
                    AS device_category,
                  COUNT(*)::integer AS sample_size,
                  percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value)::double precision AS p75
             FROM deduplicated
            GROUP BY GROUPING SETS ((metric_name), (metric_name, device_category))
            ORDER BY metric_name, device_category`,
          [cutoff],
        ) as Row[];
      } catch {
        webVitalError = "Canonical field-experience aggregate query failed";
      }
    }

    const leads = leadRows.map(normalizeLead);
    const spend = spendRows.map(normalizeSpend);
    const outcomes = outcomeRows.map(normalizeOutcome);
    const experiments = experimentRows.map(normalizeExperiment);
    const intelligence = buildGrowthIntelligence({ leads, spend, outcomes, experiments, now });

    return {
      ...intelligence,
      configured: true,
      schemaReady: schema.spend && schema.outcomes && schema.responses &&
        schema.experiments && schema.opportunities && schema.recommendations,
      windowDays,
      generatedAt: now.toISOString(),
      experiments,
      persistedOpportunities: opportunityRows.map(normalizePersistedOpportunity),
      recommendations: recommendationRows.map(normalizeRecommendation),
      ownedDemandSignals: buildOwnedDemandAttributionSignals(leadRows),
      outcomeMetrics: buildGrowthOutcomeMetrics(leads, outcomes, schema.outcomes),
      delivery: normalizeGrowthDeliverySnapshot(
        deliveryRows,
        deliveryConfigured,
        deliveryError,
      ),
      webVitals: normalizeGrowthWebVitals(webVitalRows, schema.analytics, webVitalError),
      sourceRowsRead: leadRows.length,
      spendRowsRead: spendRows.length,
      outcomeRowsRead: outcomeRows.length,
      webVitalRowsRead: webVitalRows
        .filter((row) => text(row.device_category).toLowerCase() === "all")
        .reduce((total, row) => total + numberValue(row.sample_size), 0),
    };
  } catch {
    return emptyView(true, windowDays, now, "Canonical Neon growth intelligence query failed");
  }
}

export type {
  GrowthChannelEconomics,
  GrowthOpportunity,
};
