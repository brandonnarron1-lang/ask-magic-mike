import { neon } from "@neondatabase/serverless";
import {
  buildLeadTimeline,
  type AdminLeadTimelineEvent,
} from "../adminLeadTimeline";
import {
  normalizeAppointment,
  normalizeTask,
  type AdminAppointmentRow,
  type AdminFollowupTaskRow,
} from "./supabase/adminAppointmentFollowupOps";
import {
  normalizeAdminLeadRow,
  normalizeAdminLeadRows,
  type AdminLeadDetailResult,
  type AdminLeadInboxResult,
} from "./supabase/adminLeadView";

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

async function optionalRows(
  sql: Query,
  statement: string,
  params: unknown[],
): Promise<Array<Record<string, unknown>>> {
  try {
    return await sql.query(statement, params) as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

/** Provider-neutral Lead Center reads for the canonical Neon database. */
export async function loadNeonAdminLeadInbox(limit = 50): Promise<AdminLeadInboxResult> {
  const sql = queryFromEnv();
  if (!sql) return { configured: false, leads: [] };

  const cappedLimit = Math.max(1, Math.min(limit, 100));
  try {
    const rows = await sql.query(
      `${LEAD_SELECT} ORDER BY l.created_at DESC LIMIT $1`,
      [cappedLimit],
    ) as Array<Record<string, unknown>>;
    return { configured: true, leads: normalizeAdminLeadRows(rows) };
  } catch {
    return { configured: true, leads: [], error: "Lead inbox query failed" };
  }
}

export async function loadNeonAdminLeadDetail(leadId: string): Promise<AdminLeadDetailResult> {
  const sql = queryFromEnv();
  if (!sql) {
    return { configured: false, lead: null, timeline: [], appointments: [], followupTasks: [] };
  }

  try {
    const leadRows = await sql.query(
      `${LEAD_SELECT} WHERE l.id = $1::uuid LIMIT 1`,
      [leadId],
    ) as Array<Record<string, unknown>>;
    if (!leadRows[0]) {
      return { configured: true, lead: null, timeline: [], appointments: [], followupTasks: [], error: "lead_not_found" };
    }

    const [auditRows, notificationRows, appointmentRows, taskRows] = await Promise.all([
      optionalRows(sql,
        `SELECT id, created_at, actor, action, resource_type, resource_id,
                before_state, after_state, metadata
           FROM public.audit_logs
          WHERE resource_type = 'lead' AND resource_id = $1::text
          ORDER BY created_at DESC LIMIT 100`,
        [leadId]),
      optionalRows(sql,
        `SELECT id, created_at, updated_at, sent_at, notification_type,
                channel, status, provider, provider_message_id
           FROM public.lead_notifications
          WHERE lead_id = $1::uuid
          ORDER BY created_at DESC LIMIT 100`,
        [leadId]),
      optionalRows(sql,
        `SELECT * FROM public.lead_appointments
          WHERE lead_id = $1::uuid
          ORDER BY created_at DESC LIMIT 100`,
        [leadId]),
      optionalRows(sql,
        `SELECT * FROM public.tasks
          WHERE lead_id = $1::uuid AND category LIKE 'followup:%'
          ORDER BY due_at ASC NULLS LAST LIMIT 100`,
        [leadId]),
    ]);

    const lead = normalizeAdminLeadRow(leadRows[0]);
    const appointments = appointmentRows
      .map(normalizeAppointment)
      .filter((row): row is AdminAppointmentRow => Boolean(row));
    const followupTasks = taskRows
      .map(normalizeTask)
      .filter((row): row is AdminFollowupTaskRow => Boolean(row));
    const timeline = buildLeadTimeline({
      lead,
      auditRows,
      notificationRows,
      appointmentRows: appointments,
      taskRows: followupTasks,
    }) as AdminLeadTimelineEvent[];

    return { configured: true, lead, timeline, appointments, followupTasks };
  } catch {
    return { configured: true, lead: null, timeline: [], appointments: [], followupTasks: [], error: "Lead detail query failed" };
  }
}
