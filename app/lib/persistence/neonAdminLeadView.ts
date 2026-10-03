import { neon } from "@neondatabase/serverless";
import {
  buildLeadTimelinePage,
} from "../adminLeadTimeline";
import {
  normalizeAppointment,
  normalizeTask,
  type AdminAppointmentRow,
  type AdminFollowupTaskRow,
} from "./supabase/adminAppointmentFollowupOps";
import {
  normalizeAdminLeadRow,
  normalizeAdminLeadFirstResponseRow,
  normalizeAdminLeadOutcomeRow,
  normalizeAdminLeadRows,
  type AdminAiDraftReviewRow,
  type AdminLeadDetailResult,
  type AdminLeadInboxQuery,
  type AdminLeadOutcomeRow,
  type AdminLeadInboxResult,
} from "./supabase/adminLeadView";
import {
  hasLeadCenterPermission,
  type LeadCenterPrincipal,
} from "../../../src/lib/admin/rbac-policy";

type Query = ReturnType<typeof neon>;

function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

const LEAD_SELECT = `
  SELECT l.*,
         jsonb_build_object(
           'source', COALESCE(sa.utm_source, l.source),
           'medium', sa.utm_medium,
           'campaign', sa.utm_campaign,
           'content', sa.utm_content,
           'term', sa.utm_term,
           'referrer', sa.referrer_url,
           'landing_page', sa.landing_page,
           'placement', sa.placement_id,
           'gclid', sa.click_ids->>'gclid',
           'fbclid', sa.click_ids->>'fbclid'
         ) AS attribution
    FROM public.leads AS l
    LEFT JOIN LATERAL (
      SELECT source_attribution.*
        FROM public.source_attribution
       WHERE source_attribution.lead_id = l.id
       ORDER BY source_attribution.created_at DESC
       LIMIT 1
    ) AS sa ON true`;

const TIMELINE_SOURCE_QUERIES = {
  audit: `SELECT id, created_at, actor, action, resource_type, resource_id,
                 before_state, after_state, metadata
            FROM public.audit_logs
           WHERE resource_type = 'lead' AND resource_id = $1::uuid
           ORDER BY created_at DESC, id DESC LIMIT $2`,
  notifications: `SELECT id, created_at, updated_at, sent_at, failed_at,
                          notification_type, channel, status, provider, provider_message_id
                     FROM public.lead_notifications
                    WHERE lead_id = $1::uuid
                    ORDER BY COALESCE(sent_at, failed_at, updated_at, created_at) DESC, id DESC LIMIT $2`,
  appointments: `SELECT * FROM public.lead_appointments
                    WHERE lead_id = $1::uuid
                    ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT $2`,
  tasks: `SELECT * FROM public.tasks
           WHERE lead_id = $1::uuid
           ORDER BY COALESCE(updated_at, created_at, due_at) DESC, id DESC LIMIT $2`,
  outcomes: `SELECT id, outcome_type, amount_usd, occurred_at, source_system,
                    created_at, metadata
               FROM public.lead_outcomes
              WHERE lead_id = $1::uuid
              ORDER BY COALESCE(occurred_at, created_at) DESC, id DESC LIMIT $2`,
  attribution: `SELECT id, created_at, utm_source, utm_medium, utm_campaign,
                       utm_content, placement_id, first_touch, last_touch
                  FROM public.source_attribution
                 WHERE lead_id = $1::uuid
                 ORDER BY created_at DESC, id DESC LIMIT $2`,
  consents: `SELECT id, created_at, consent_type, granted, language_version, collected_at
               FROM public.consents
              WHERE lead_id = $1::uuid
              ORDER BY COALESCE(collected_at, created_at) DESC, id DESC LIMIT $2`,
  assignments: `SELECT id, created_at, assigned_by, assignment_reason, status,
                        accepted_at, declined_at
                   FROM public.agent_assignments
                  WHERE lead_id = $1::uuid
                  ORDER BY COALESCE(accepted_at, declined_at, created_at) DESC, id DESC LIMIT $2`,
  messages: `SELECT id, created_at, role, agent_id
               FROM public.messages
              WHERE lead_id = $1::uuid
              ORDER BY created_at DESC, id DESC LIMIT $2`,
  communications: `SELECT id, event_type, channel, occurred_at, metadata
                      FROM public.communication_events
                     WHERE lead_id = $1::uuid
                     ORDER BY occurred_at DESC, id DESC LIMIT $2`,
  responses: `SELECT id, first_human_response_at, source_system, actor,
                     evidence_audit_id, created_at
                FROM public.lead_response_milestones
               WHERE lead_id = $1::uuid
               ORDER BY first_human_response_at DESC, id DESC LIMIT $2`,
  aiReviews: `SELECT id, draft_key, version, artifact_type, channel, purpose,
                     status, content, content_hash, source_fingerprint,
                     evidence_references, missing_facts, limitations, model,
                     created_by, reviewed_by, reviewed_at, created_at, updated_at
                FROM public.ai_draft_reviews
               WHERE lead_id = $1::uuid
               ORDER BY COALESCE(reviewed_at, updated_at, created_at) DESC, id DESC LIMIT $2`,
} as const;

async function loadTimelineSources(sql: Query, leadId: string, cap: number) {
  const entries = Object.entries(TIMELINE_SOURCE_QUERIES);
  const settled = await Promise.allSettled(
    entries.map(([, statement]) => sql.query(statement, [leadId, cap])),
  );
  const rows: Record<string, Array<Record<string, unknown>>> = {};
  const incompleteSources: string[] = [];
  settled.forEach((result, index) => {
    const name = entries[index][0];
    if (result.status === "fulfilled") rows[name] = result.value as Array<Record<string, unknown>>;
    else {
      rows[name] = [];
      incompleteSources.push(name);
    }
  });
  return { rows, incompleteSources };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeAiDraft(row: Record<string, unknown>): AdminAiDraftReviewRow | null {
  const required = ["id", "draft_key", "artifact_type", "purpose", "status", "content", "content_hash", "source_fingerprint", "model", "created_by", "created_at", "updated_at"];
  if (required.some((key) => typeof row[key] !== "string")) return null;
  const version = Number(row.version);
  if (!Number.isInteger(version) || version < 1) return null;
  return {
    id: String(row.id),
    draft_key: String(row.draft_key),
    version,
    artifact_type: String(row.artifact_type),
    channel: typeof row.channel === "string" ? row.channel : null,
    purpose: String(row.purpose),
    status: String(row.status),
    content: String(row.content),
    content_hash: String(row.content_hash),
    source_fingerprint: String(row.source_fingerprint),
    evidence_references: stringArray(row.evidence_references),
    missing_facts: stringArray(row.missing_facts),
    limitations: stringArray(row.limitations),
    model: String(row.model),
    created_by: String(row.created_by),
    reviewed_by: typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** Provider-neutral Lead Center reads for the canonical Neon database. */
export async function loadNeonAdminLeadInbox(
  input: number | AdminLeadInboxQuery = 50,
  principal: LeadCenterPrincipal | null = null,
): Promise<AdminLeadInboxResult> {
  const sql = queryFromEnv();
  if (!sql) return { configured: false, leads: [] };

  const query = typeof input === "number" ? { limit: input } : input;
  const cappedLimit = Math.max(1, Math.min(Math.floor(query.limit || 25), 100));
  const offset = Math.max(0, Math.min(Math.floor(query.offset || 0), 5_000));
  const filter = ["active", "working", "qualified", "closed", "all"].includes(query.filter || "")
    ? query.filter || "active"
    : "active";
  const sort = ["newest", "oldest", "priority", "followup"].includes(query.sort || "")
    ? query.sort || "newest"
    : "newest";
  if (!principal) {
    return {
      configured: true,
      leads: [],
      page: { offset, limit: cappedLimit, total: 0, hasMore: false },
      error: "lead_center_principal_required",
    };
  }
  try {
    const scoped = !hasLeadCenterPermission(principal.role, "lead:view_all");
    if (scoped && !principal.agentId) {
      return { configured: true, leads: [], page: { offset, limit: cappedLimit, total: 0, hasMore: false } };
    }

    const clauses: string[] = [];
    const params: unknown[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    if (scoped) clauses.push(`l.assigned_agent_id = ${bind(principal?.agentId)}::uuid`);
    if (filter === "active") {
      clauses.push("l.is_test = false", "l.communication_suppressed = false", "l.status = ANY(ARRAY['new','scored','assigned','escalated']::text[])");
    } else if (filter === "working") {
      clauses.push("l.is_test = false", "l.communication_suppressed = false", "l.status = ANY(ARRAY['contacted','nurture']::text[])");
    } else if (filter === "qualified") {
      clauses.push("l.is_test = false", "l.communication_suppressed = false", "l.status = ANY(ARRAY['qualified','appointment_requested','appointment_set']::text[])");
    } else if (filter === "closed") {
      clauses.push("(l.is_test = true OR l.communication_suppressed = true OR l.status = ANY(ARRAY['spam','dead','converted','closed','closed_won','closed_lost']::text[]))");
    }
    const search = typeof query.search === "string" ? query.search.trim().slice(0, 120) : "";
    if (search) {
      const token = bind(`%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
      clauses.push(`(
        l.id::text ILIKE ${token} ESCAPE '\\'
        OR COALESCE(l.name, '') ILIKE ${token} ESCAPE '\\'
        OR COALESCE(l.first_name, '') ILIKE ${token} ESCAPE '\\'
        OR COALESCE(l.last_name, '') ILIKE ${token} ESCAPE '\\'
        OR COALESCE(l.email, '') ILIKE ${token} ESCAPE '\\'
        OR COALESCE(l.phone, '') ILIKE ${token} ESCAPE '\\'
        OR COALESCE(l.address_raw, '') ILIKE ${token} ESCAPE '\\'
      )`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const order = sort === "oldest"
      ? "l.created_at ASC, l.id ASC"
      : sort === "priority"
        ? "l.score DESC NULLS LAST, l.created_at DESC, l.id DESC"
        : sort === "followup"
          ? "l.next_follow_up_at ASC NULLS LAST, l.created_at DESC, l.id DESC"
          : "l.created_at DESC, l.id DESC";
    const limitBind = `$${params.length + 1}`;
    const offsetBind = `$${params.length + 2}`;
    const [countRows, rows] = await Promise.all([
      sql.query(`SELECT count(*)::integer AS total FROM public.leads l${where}`, params),
      sql.query(`${LEAD_SELECT}${where} ORDER BY ${order} LIMIT ${limitBind} OFFSET ${offsetBind}`, [
        ...params,
        cappedLimit,
        offset,
      ]),
    ]);
    const total = Number((countRows as Array<Record<string, unknown>>)[0]?.total || 0);
    return {
      configured: true,
      leads: normalizeAdminLeadRows(rows as Array<Record<string, unknown>>),
      page: { offset, limit: cappedLimit, total, hasMore: offset + cappedLimit < total },
    };
  } catch {
    return {
      configured: true,
      leads: [],
      page: { offset, limit: cappedLimit, total: 0, hasMore: false },
      error: "Lead inbox query failed",
    };
  }
}

export async function loadNeonAdminLeadDetail(
  leadId: string,
  principal: LeadCenterPrincipal | null = null,
  pagination: { offset?: number; limit?: number } = {},
): Promise<AdminLeadDetailResult> {
  const sql = queryFromEnv();
  if (!sql) {
    return { configured: false, lead: null, timeline: [], appointments: [], followupTasks: [], outcomes: [], firstResponse: null };
  }
  if (!principal) {
    return { configured: true, lead: null, timeline: [], appointments: [], followupTasks: [], outcomes: [], firstResponse: null, error: "lead_center_principal_required" };
  }

  try {
    const scoped = !hasLeadCenterPermission(principal.role, "lead:view_all");
    if (scoped && !principal.agentId) {
      return { configured: true, lead: null, timeline: [], appointments: [], followupTasks: [], outcomes: [], firstResponse: null, error: "lead_not_found" };
    }
    const leadRows = await sql.query(
      `${LEAD_SELECT} WHERE l.id = $1::uuid${scoped ? " AND l.assigned_agent_id = $2::uuid" : ""} LIMIT 1`,
      scoped ? [leadId, principal?.agentId] : [leadId],
    ) as Array<Record<string, unknown>>;
    if (!leadRows[0]) {
      return { configured: true, lead: null, timeline: [], appointments: [], followupTasks: [], outcomes: [], firstResponse: null, error: "lead_not_found" };
    }

    const lead = normalizeAdminLeadRow(leadRows[0]);
    const offset = Math.max(0, Math.min(Math.floor(pagination.offset || 0), 1_000));
    const limit = Math.max(1, Math.min(Math.floor(pagination.limit || 30), 100));
    const timelineSources = await loadTimelineSources(sql, leadId, offset + limit + 1);
    const appointmentRows = timelineSources.rows.appointments || [];
    const taskRows = (timelineSources.rows.tasks || []).filter((row) =>
      typeof row.category === "string" && row.category.startsWith("followup:"),
    );
    const outcomeRows = timelineSources.rows.outcomes || [];
    const firstResponseRows = timelineSources.rows.responses || [];
    const appointments = appointmentRows
      .map(normalizeAppointment)
      .filter((row): row is AdminAppointmentRow => Boolean(row));
    const followupTasks = taskRows
      .map(normalizeTask)
      .filter((row): row is AdminFollowupTaskRow => Boolean(row));
    const outcomes = outcomeRows
      .map(normalizeAdminLeadOutcomeRow)
      .filter((row): row is AdminLeadOutcomeRow => Boolean(row));
    const firstResponse = firstResponseRows[0]
      ? normalizeAdminLeadFirstResponseRow(firstResponseRows[0], lead.created_at)
      : null;
    const latestDrafts = new Map<string, AdminAiDraftReviewRow>();
    for (const row of timelineSources.rows.aiReviews || []) {
      const draft = normalizeAiDraft(row);
      if (!draft) continue;
      const current = latestDrafts.get(draft.draft_key);
      if (!current || draft.version > current.version) latestDrafts.set(draft.draft_key, draft);
    }
    const timelinePage = buildLeadTimelinePage({
      lead,
      auditRows: timelineSources.rows.audit,
      notificationRows: timelineSources.rows.notifications,
      appointmentRows: appointments,
      taskRows: followupTasks,
      outcomeRows,
      attributionRows: timelineSources.rows.attribution,
      consentRows: timelineSources.rows.consents,
      assignmentRows: timelineSources.rows.assignments,
      messageRows: timelineSources.rows.messages,
      communicationRows: timelineSources.rows.communications,
      responseRows: timelineSources.rows.responses,
      aiReviewRows: timelineSources.rows.aiReviews,
      incompleteSources: timelineSources.incompleteSources,
    }, { offset, limit });

    return {
      configured: true,
      lead,
      timeline: timelinePage.events,
      timelinePage,
      appointments,
      followupTasks,
      outcomes,
      firstResponse,
      aiDrafts: [...latestDrafts.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    };
  } catch {
    return { configured: true, lead: null, timeline: [], appointments: [], followupTasks: [], outcomes: [], firstResponse: null, error: "Lead detail query failed" };
  }
}
