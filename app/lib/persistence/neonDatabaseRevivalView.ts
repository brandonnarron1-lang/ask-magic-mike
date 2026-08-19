import { neon } from "@neondatabase/serverless";
import {
  buildDatabaseRevivalIntelligence,
  type DatabaseRevivalIntelligence,
  type RevivalLeadFact,
  type RevivalPermissionState,
} from "../revival/intelligence";
import {
  hasLeadCenterPermission,
  type LeadCenterPrincipal,
} from "../../../src/lib/admin/rbac-policy";

type Row = Record<string, unknown>;
type DatabaseQuery = {
  query(query: string, params?: unknown[]): Promise<unknown>;
};

export interface DatabaseRevivalView extends DatabaseRevivalIntelligence {
  configured: boolean;
  schemaReady: boolean;
  detailsVisible: boolean;
  scopedToAssignedLeads: boolean;
  retentionPolicyConfigured: boolean;
  retentionMaxAgeDays: number | null;
  rowsRead: number;
  rowsCapped: boolean;
  error?: string;
}

const PERMISSION_STATES = new Set<RevivalPermissionState>([
  "allowed",
  "denied",
  "ambiguous",
  "opted_out",
  "held",
  "not_recorded",
]);

function queryFromEnv(): DatabaseQuery | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) as DatabaseQuery : null;
}

function retentionMaxAgeDays(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function nullableText(value: unknown) {
  const normalized = text(value).trim();
  return normalized || null;
}

function numberValue(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function permissionState(value: unknown): RevivalPermissionState {
  const normalized = text(value, "not_recorded") as RevivalPermissionState;
  return PERMISSION_STATES.has(normalized) ? normalized : "not_recorded";
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return [];
}

function timestamp(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value);
}

function normalizeRevivalLead(row: Row): RevivalLeadFact {
  return {
    id: text(row.id),
    createdAt: timestamp(row.created_at),
    status: text(row.status, "unknown"),
    conversionStage: nullableText(row.conversion_stage),
    leadType: nullableText(row.lead_type),
    primaryIntent: nullableText(row.primary_intent),
    timelineMonths: numberValue(row.timeline_months),
    score: numberValue(row.score),
    city: nullableText(row.city),
    zip: nullableText(row.zip),
    source: nullableText(row.source),
    sourceDetail: nullableText(row.source_detail),
    lastContactedAt: nullableText(row.last_contacted_at),
    lastResponseAt: nullableText(row.last_response_at),
    nextFollowUpAt: nullableText(row.next_follow_up_at),
    assignedAgentId: nullableText(row.assigned_agent_id),
    assignedAgentName: nullableText(row.assigned_agent_name),
    assignedAgentActive: booleanValue(row.assigned_agent_active),
    hasEmail: booleanValue(row.has_email),
    hasPhone: booleanValue(row.has_phone),
    emailSuppressed: booleanValue(row.email_suppressed),
    smsSuppressed: booleanValue(row.sms_suppressed),
    marketingEmailState: permissionState(row.marketing_email_state),
    marketingSmsState: permissionState(row.marketing_sms_state),
    propertyAlertEmailState: permissionState(row.property_alert_email_state),
    sequenceStatuses: stringArray(row.sequence_statuses),
    openTaskCount: numberValue(row.open_task_count) || 0,
    appointmentRequested: booleanValue(row.appointment_requested),
    isTest: booleanValue(row.is_test),
    communicationSuppressed: booleanValue(row.communication_suppressed),
    isDuplicate: booleanValue(row.is_duplicate),
  };
}

function emptyView(input: {
  configured: boolean;
  schemaReady?: boolean;
  detailsVisible: boolean;
  scopedToAssignedLeads: boolean;
  retentionMaxAgeDays: number | null;
  now: Date;
  error?: string;
}): DatabaseRevivalView {
  return {
    ...buildDatabaseRevivalIntelligence({
      leads: [],
      now: input.now,
      retentionMaxAgeDays: input.retentionMaxAgeDays,
    }),
    configured: input.configured,
    schemaReady: input.schemaReady || false,
    detailsVisible: input.detailsVisible,
    scopedToAssignedLeads: input.scopedToAssignedLeads,
    retentionPolicyConfigured: input.retentionMaxAgeDays !== null,
    retentionMaxAgeDays: input.retentionMaxAgeDays,
    rowsRead: 0,
    rowsCapped: false,
    ...(input.error ? { error: input.error } : {}),
  };
}

async function detectSchema(sql: DatabaseQuery) {
  const rows = await sql.query(
    `SELECT
       to_regclass('public.leads') IS NOT NULL AS has_leads,
       to_regclass('public.communication_permissions') IS NOT NULL AS has_permissions,
       to_regclass('public.message_sequence_instances') IS NOT NULL AS has_sequences,
       to_regclass('public.tasks') IS NOT NULL AS has_tasks,
       to_regclass('public.agents') IS NOT NULL AS has_agents`,
  ) as Row[];
  const row = rows[0] || {};
  return ["has_leads", "has_permissions", "has_sequences", "has_tasks", "has_agents"]
    .every((key) => booleanValue(row[key]));
}

export async function loadNeonDatabaseRevivalView(
  principal: LeadCenterPrincipal | null,
  options: { query?: DatabaseQuery; now?: Date; retentionMaxAgeDays?: number | null } = {},
): Promise<DatabaseRevivalView> {
  const sql = options.query || queryFromEnv();
  const now = options.now || new Date();
  const configuredRetentionMaxAgeDays = retentionMaxAgeDays(
    options.retentionMaxAgeDays === undefined
      ? process.env.REVIVAL_RETENTION_MAX_AGE_DAYS
      : options.retentionMaxAgeDays,
  );
  const canViewAll = Boolean(principal && hasLeadCenterPermission(principal.role, "lead:view_all"));
  const canViewAssigned = Boolean(
    principal
    && hasLeadCenterPermission(principal.role, "lead:view_assigned")
    && principal.agentId,
  );
  const detailsVisible = canViewAll || canViewAssigned;
  const scopedToAssignedLeads = Boolean(principal && !canViewAll && canViewAssigned);
  if (!sql) return emptyView({
    configured: false,
    detailsVisible,
    scopedToAssignedLeads,
    retentionMaxAgeDays: configuredRetentionMaxAgeDays,
    now,
  });

  try {
    const schemaReady = await detectSchema(sql);
    if (!schemaReady) {
      return emptyView({
        configured: true,
        schemaReady: false,
        detailsVisible,
        scopedToAssignedLeads,
        retentionMaxAgeDays: configuredRetentionMaxAgeDays,
        now,
        error: "Database revival dependencies are not ready",
      });
    }
    const params = scopedToAssignedLeads ? [principal?.agentId] : [];
    const assignedScope = scopedToAssignedLeads ? " AND l.assigned_agent_id = $1::uuid" : "";
    const rows = await sql.query(
      `SELECT
         l.id, l.created_at, l.status, l.conversion_stage, l.lead_type,
         l.primary_intent, l.timeline_months, l.score, l.city, l.zip,
         l.source, l.source_detail, l.last_contacted_at, l.last_response_at,
         l.next_follow_up_at, l.assigned_agent_id, a.name AS assigned_agent_name,
         COALESCE(a.is_active, false) AS assigned_agent_active,
         (NULLIF(trim(l.email), '') IS NOT NULL) AS has_email,
         (NULLIF(trim(COALESCE(l.phone, l.phone_normalized)), '') IS NOT NULL) AS has_phone,
         l.email_suppressed, l.sms_suppressed, l.appointment_requested,
         l.is_test, l.communication_suppressed, l.is_duplicate,
         COALESCE(p.marketing_email_state, 'not_recorded') AS marketing_email_state,
         COALESCE(p.marketing_sms_state, 'not_recorded') AS marketing_sms_state,
         COALESCE(p.property_alert_email_state, 'not_recorded') AS property_alert_email_state,
         COALESCE(s.sequence_statuses, ARRAY[]::text[]) AS sequence_statuses,
         COALESCE(t.open_task_count, 0) AS open_task_count
       FROM public.leads l
       LEFT JOIN public.agents a ON a.id = l.assigned_agent_id
       LEFT JOIN LATERAL (
         SELECT
           max(state) FILTER (WHERE channel = 'email' AND purpose = 'marketing_nurture') AS marketing_email_state,
           max(state) FILTER (WHERE channel = 'sms' AND purpose = 'marketing_nurture') AS marketing_sms_state,
           max(state) FILTER (WHERE channel = 'email' AND purpose = 'property_alert_subscription') AS property_alert_email_state
         FROM public.communication_permissions
         WHERE lead_id = l.id
       ) p ON true
       LEFT JOIN LATERAL (
         SELECT array_agg(DISTINCT status) AS sequence_statuses
         FROM public.message_sequence_instances
         WHERE lead_id = l.id
           AND status IN ('draft', 'approval_required', 'test', 'scheduled', 'active', 'paused')
       ) s ON true
       LEFT JOIN LATERAL (
         SELECT count(*)::integer AS open_task_count
         FROM public.tasks
         WHERE lead_id = l.id AND status IN ('open', 'in_progress')
       ) t ON true
       WHERE l.is_test = false
         AND l.communication_suppressed = false
         AND COALESCE(l.is_duplicate, false) = false
         AND l.duplicate_of_lead_id IS NULL
         AND l.status NOT IN ('dead', 'converted', 'spam')
         AND COALESCE(l.conversion_stage, '') NOT IN ('closed', 'closed_won', 'closed_lost', 'disqualified', 'spam_test')
         ${assignedScope}
       ORDER BY COALESCE(l.last_response_at, l.last_contacted_at, l.created_at) ASC
       LIMIT 1000`,
      params,
    ) as Row[];
    const intelligence = buildDatabaseRevivalIntelligence({
      leads: rows.map(normalizeRevivalLead),
      now,
      retentionMaxAgeDays: configuredRetentionMaxAgeDays,
    });
    return {
      ...intelligence,
      configured: true,
      schemaReady: true,
      detailsVisible,
      scopedToAssignedLeads,
      retentionPolicyConfigured: configuredRetentionMaxAgeDays !== null,
      retentionMaxAgeDays: configuredRetentionMaxAgeDays,
      rowsRead: rows.length,
      rowsCapped: rows.length === 1000,
      candidates: detailsVisible ? intelligence.candidates : [],
    };
  } catch {
    return emptyView({
      configured: true,
      schemaReady: false,
      detailsVisible,
      scopedToAssignedLeads,
      retentionMaxAgeDays: configuredRetentionMaxAgeDays,
      now,
      error: "Canonical Neon database revival query failed",
    });
  }
}
