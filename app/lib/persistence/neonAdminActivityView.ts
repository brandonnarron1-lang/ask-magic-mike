import { neon } from "@neondatabase/serverless";
import {
  hasLeadCenterPermission,
  type LeadCenterPrincipal,
} from "../../../src/lib/admin/rbac-policy";

type Query = ReturnType<typeof neon>;

export const ADMIN_ACTIVITY_SOURCES = [
  "audit",
  "communication",
  "notification",
  "outcome",
  "ai_review",
] as const;

export type AdminActivitySource = (typeof ADMIN_ACTIVITY_SOURCES)[number];

export type AdminActivityEvent = {
  id: string;
  source: AdminActivitySource;
  sourceId: string;
  leadId: string;
  leadLabel: string;
  eventType: string;
  occurredAt: string;
  recordedAt: string;
  actor: string;
  summary: string;
  detail: string | null;
  reference: string;
};

export type AdminActivityResult = {
  configured: boolean;
  events: AdminActivityEvent[];
  offset: number;
  limit: number;
  hasMore: boolean;
  incompleteSources: AdminActivitySource[];
  error?: string;
};

type RawActivityRow = Record<string, unknown> & { activity_source?: AdminActivitySource };

function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function timestamp(value: unknown, fallback?: unknown) {
  return text(value) || text(fallback) || new Date(0).toISOString();
}

function leadLabel(row: RawActivityRow) {
  return text(row.lead_label) || "Lead";
}

function normalizeActivityRow(row: RawActivityRow): AdminActivityEvent | null {
  const source = row.activity_source;
  const sourceId = text(row.source_id);
  const leadId = text(row.lead_id);
  if (!source || !sourceId || !leadId) return null;

  const occurredAt = timestamp(row.occurred_at, row.recorded_at);
  const recordedAt = timestamp(row.recorded_at, row.occurred_at);
  const eventType = text(row.event_type) || "activity.recorded";
  return {
    id: `${source}:${sourceId}`,
    source,
    sourceId,
    leadId,
    leadLabel: leadLabel(row),
    eventType,
    occurredAt,
    recordedAt,
    actor: text(row.actor) || "Unknown / protected actor",
    summary: text(row.summary) || eventType.replaceAll("_", " ").replaceAll(".", " · "),
    detail: text(row.detail),
    reference: text(row.reference) || `${source}:${sourceId}`,
  };
}

function scopedWhere(principal: LeadCenterPrincipal | null) {
  const restricted = Boolean(principal && !hasLeadCenterPermission(principal.role, "lead:view_all"));
  return {
    restricted,
    clause: restricted ? " AND l.assigned_agent_id = $2::uuid" : "",
    args: restricted ? [principal?.agentId] : [],
  };
}

const SOURCE_QUERIES: Record<AdminActivitySource, string> = {
  audit: `
    SELECT 'audit'::text AS activity_source, a.id::text AS source_id,
           l.id::text AS lead_id,
           COALESCE(NULLIF(l.address_raw, ''), NULLIF(concat_ws(' ', l.first_name, l.last_name), ''), 'Lead') AS lead_label,
           a.action AS event_type, a.created_at AS occurred_at, a.created_at AS recorded_at,
           a.actor, a.action AS summary, a.resource_type AS detail,
           concat('audit:', a.id::text) AS reference
      FROM public.audit_logs a
      JOIN public.leads l ON l.id = a.resource_id
     WHERE a.resource_type = 'lead' __SCOPE__
     ORDER BY a.created_at DESC, a.id DESC LIMIT $1`,
  communication: `
    SELECT 'communication'::text AS activity_source, c.id::text AS source_id,
           l.id::text AS lead_id,
           COALESCE(NULLIF(l.address_raw, ''), NULLIF(concat_ws(' ', l.first_name, l.last_name), ''), 'Lead') AS lead_label,
           c.event_type, c.occurred_at, c.occurred_at AS recorded_at,
           COALESCE(c.metadata->>'actor', 'System / provider') AS actor,
           concat(c.channel, ' · ', c.event_type) AS summary,
           c.metadata->>'status' AS detail, concat('communication:', c.id::text) AS reference
      FROM public.communication_events c
      JOIN public.leads l ON l.id = c.lead_id
     WHERE true __SCOPE__
     ORDER BY c.occurred_at DESC, c.id DESC LIMIT $1`,
  notification: `
    SELECT 'notification'::text AS activity_source, n.id::text AS source_id,
           l.id::text AS lead_id,
           COALESCE(NULLIF(l.address_raw, ''), NULLIF(concat_ws(' ', l.first_name, l.last_name), ''), 'Lead') AS lead_label,
           concat('notification.', n.status) AS event_type,
           COALESCE(n.sent_at, n.failed_at, n.updated_at, n.created_at) AS occurred_at,
           COALESCE(n.updated_at, n.created_at) AS recorded_at,
           COALESCE(n.provider, 'notification worker') AS actor,
           concat(n.notification_type, ' · ', n.status) AS summary,
           n.channel AS detail, concat('notification:', n.id::text) AS reference
      FROM public.lead_notifications n
      JOIN public.leads l ON l.id = n.lead_id
     WHERE true __SCOPE__
     ORDER BY COALESCE(n.sent_at, n.failed_at, n.updated_at, n.created_at) DESC, n.id DESC LIMIT $1`,
  outcome: `
    SELECT 'outcome'::text AS activity_source, o.id::text AS source_id,
           l.id::text AS lead_id,
           COALESCE(NULLIF(l.address_raw, ''), NULLIF(concat_ws(' ', l.first_name, l.last_name), ''), 'Lead') AS lead_label,
           concat('outcome.', o.outcome_type) AS event_type,
           COALESCE(o.occurred_at, o.created_at) AS occurred_at, o.created_at AS recorded_at,
           COALESCE(o.source_system, 'Lead Center') AS actor,
           concat('Outcome · ', o.outcome_type) AS summary,
           NULL::text AS detail, concat('outcome:', o.id::text) AS reference
      FROM public.lead_outcomes o
      JOIN public.leads l ON l.id = o.lead_id
     WHERE true __SCOPE__
     ORDER BY COALESCE(o.occurred_at, o.created_at) DESC, o.id DESC LIMIT $1`,
  ai_review: `
    SELECT 'ai_review'::text AS activity_source, d.id::text AS source_id,
           l.id::text AS lead_id,
           COALESCE(NULLIF(l.address_raw, ''), NULLIF(concat_ws(' ', l.first_name, l.last_name), ''), 'Lead') AS lead_label,
           concat('ai_draft.', d.status) AS event_type,
           COALESCE(d.reviewed_at, d.updated_at, d.created_at) AS occurred_at,
           COALESCE(d.updated_at, d.created_at) AS recorded_at,
           COALESCE(d.reviewed_by, d.created_by, 'AI draft worker') AS actor,
           concat(d.artifact_type, ' · ', d.status) AS summary,
           d.channel AS detail, concat('ai_review:', d.id::text) AS reference
      FROM public.ai_draft_reviews d
      JOIN public.leads l ON l.id = d.lead_id
     WHERE true __SCOPE__
     ORDER BY COALESCE(d.reviewed_at, d.updated_at, d.created_at) DESC, d.id DESC LIMIT $1`,
};

export async function loadNeonAdminActivity(input: {
  principal: LeadCenterPrincipal | null;
  offset?: number;
  limit?: number;
  source?: AdminActivitySource | null;
}): Promise<AdminActivityResult> {
  const sql = queryFromEnv();
  const offset = Math.max(0, Math.min(Math.floor(input.offset || 0), 5_000));
  const limit = Math.max(1, Math.min(Math.floor(input.limit || 40), 100));
  if (!sql) return { configured: false, events: [], offset, limit, hasMore: false, incompleteSources: [] };
  if (!input.principal) {
    return { configured: true, events: [], offset, limit, hasMore: false, incompleteSources: [], error: "lead_center_principal_required" };
  }

  const scope = scopedWhere(input.principal);
  if (scope.restricted && !input.principal?.agentId) {
    return { configured: true, events: [], offset, limit, hasMore: false, incompleteSources: [] };
  }

  const sources = input.source ? [input.source] : [...ADMIN_ACTIVITY_SOURCES];
  const cap = offset + limit + 1;
  const settled = await Promise.allSettled(sources.map((source) => {
    const query = SOURCE_QUERIES[source].replace("__SCOPE__", scope.clause);
    return sql.query(query, [cap, ...scope.args]);
  }));

  const rows: RawActivityRow[] = [];
  const incompleteSources: AdminActivitySource[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") rows.push(...result.value as RawActivityRow[]);
    else incompleteSources.push(sources[index]);
  });

  const ordered = rows
    .map(normalizeActivityRow)
    .filter((row): row is AdminActivityEvent => Boolean(row))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)
      || b.recordedAt.localeCompare(a.recordedAt)
      || a.id.localeCompare(b.id));
  const page = ordered.slice(offset, offset + limit);
  return {
    configured: true,
    events: page,
    offset,
    limit,
    hasMore: ordered.length > offset + limit,
    incompleteSources,
    ...(incompleteSources.length === sources.length ? { error: "Activity sources are unavailable" } : {}),
  };
}
