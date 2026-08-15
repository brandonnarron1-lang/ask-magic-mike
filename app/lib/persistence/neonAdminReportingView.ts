import { neon } from "@neondatabase/serverless";
import {
  normalizeReportingLeadRow,
  summarizeReportingRows,
  type AdminReportingSummary,
} from "./supabase/adminReportingView";

type Query = ReturnType<typeof neon>;

export function filterOperationalRowsForLiveLeads<T extends Record<string, unknown>>(
  rows: T[],
  liveLeadIds: ReadonlySet<string>,
): T[] {
  return rows.filter((row) => typeof row.lead_id === "string" && liveLeadIds.has(row.lead_id));
}

function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

function emptySummary(
  configured: boolean,
  windowDays: 7 | 30 | 90,
  now: Date,
  error?: string,
): AdminReportingSummary {
  return {
    ...summarizeReportingRows([], now, windowDays),
    configured,
    ...(error ? { error } : {}),
  };
}

/** Canonical Lead Center reporting reads. Test and suppressed records are
 * excluded in SQL before any KPI, source, or agent aggregation is built. */
export async function loadNeonAdminReportingSummary(
  windowDays: 7 | 30 | 90 = 30,
): Promise<AdminReportingSummary> {
  const sql = queryFromEnv();
  const now = new Date();
  if (!sql) return emptySummary(false, windowDays, now);

  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  try {
    const [leadRows, appointmentRows, followupRows] = await Promise.all([
      sql.query(
        `SELECT id, created_at, status, lead_type, source, source_detail,
                page_url, timeline_months, primary_intent, assigned_agent_id,
                assigned_at, last_contacted_at, lead_grade, conversion_stage,
                address_raw, email, phone, widget_session_id, is_test,
                communication_suppressed
           FROM public.leads
          WHERE created_at >= $1::timestamptz
            AND is_test = false
            AND communication_suppressed = false
          ORDER BY created_at DESC
          LIMIT 1000`,
        [cutoff],
      ),
      sql.query(
        `SELECT a.id, a.status, a.starts_at, a.lead_id, a.assigned_agent_id, a.created_at
           FROM public.lead_appointments a
           JOIN public.leads l ON l.id = a.lead_id
          WHERE a.created_at >= $1::timestamptz
            AND l.is_test = false
            AND l.communication_suppressed = false
          ORDER BY a.created_at DESC
          LIMIT 1000`,
        [cutoff],
      ),
      sql.query(
        `SELECT t.id, t.status, t.due_at, t.lead_id, t.agent_id, t.category, t.created_at
           FROM public.tasks t
           JOIN public.leads l ON l.id = t.lead_id
          WHERE t.category LIKE 'followup:%'
            AND t.created_at >= $1::timestamptz
            AND l.is_test = false
            AND l.communication_suppressed = false
          ORDER BY t.created_at DESC
          LIMIT 1000`,
        [cutoff],
      ),
    ]);

    const normalized = (leadRows as Array<Record<string, unknown>>).map(normalizeReportingLeadRow);
    const liveLeadIds = new Set(normalized.map((row) => row.id));
    const liveAppointmentRows = filterOperationalRowsForLiveLeads(
      appointmentRows as Array<Record<string, unknown>>,
      liveLeadIds,
    );
    const liveFollowupRows = filterOperationalRowsForLiveLeads(
      followupRows as Array<Record<string, unknown>>,
      liveLeadIds,
    );
    const agentIds = [...new Set(normalized.map((row) => row.assigned_agent_id).filter(Boolean))] as string[];
    const agentRows = agentIds.length
      ? await sql.query(
          `SELECT id, name FROM public.agents WHERE id = ANY($1::uuid[]) LIMIT 100`,
          [agentIds],
        )
      : [];
    const agentNames = new Map<string, string>();
    for (const row of agentRows as Array<Record<string, unknown>>) {
      if (typeof row.id === "string" && typeof row.name === "string") {
        agentNames.set(row.id, row.name);
      }
    }

    return summarizeReportingRows(
      normalized,
      now,
      windowDays,
      agentNames,
      liveAppointmentRows,
      liveFollowupRows,
    );
  } catch {
    return emptySummary(true, windowDays, now, "Canonical Neon reporting query failed");
  }
}
