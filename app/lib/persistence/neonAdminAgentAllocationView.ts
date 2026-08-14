import { neon } from "@neondatabase/serverless";
import {
  normalizeAgentRow,
  normalizeAssignableLeadRow,
  summarizeAgentAllocation,
  type AdminAgentAllocationSummary,
} from "./supabase/adminAgentAllocationView";
import { loadRecentNeonAssignmentAuditEvents } from "./neonAssignmentAudit";

type Query = ReturnType<typeof neon>;
function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

function emptySummary(configured: boolean, error?: string): AdminAgentAllocationSummary {
  return {
    ...summarizeAgentAllocation([], []),
    configured,
    ...(error ? { error } : {}),
  };
}

/** Canonical allocation reads. Synthetic and suppressed leads never enter the
 * assignment board or its workload/source aggregates. */
export async function loadNeonAdminAgentAllocationView(
  limit = 200,
): Promise<AdminAgentAllocationSummary> {
  const sql = queryFromEnv();
  if (!sql) return emptySummary(false);
  const capped = Math.max(1, Math.min(limit, 300));
  try {
    const [agentRows, leadRows, audit] = await Promise.all([
      sql.query(
        `SELECT id, name, email, phone, role, is_active, max_daily_leads,
                current_load, priority_score, availability, timezone,
                notification_email, notification_sms
           FROM public.agents
          ORDER BY priority_score DESC NULLS LAST
          LIMIT 100`,
      ),
      sql.query(
        `SELECT id, created_at, status, assigned_agent_id, assigned_at,
                assignment_status, first_name, last_name, email, phone,
                address_raw, primary_intent, timeline_months, lead_type,
                source, source_detail, page_url
           FROM public.leads
          WHERE is_test = false
            AND communication_suppressed = false
          ORDER BY created_at DESC
          LIMIT $1`,
        [capped],
      ),
      loadRecentNeonAssignmentAuditEvents(25),
    ]);
    return summarizeAgentAllocation(
      (agentRows as Array<Record<string, unknown>>).map(normalizeAgentRow),
      (leadRows as Array<Record<string, unknown>>).map(normalizeAssignableLeadRow),
      audit.events,
      audit.configured,
      audit.error,
    );
  } catch {
    return emptySummary(true, "Canonical Neon allocation query failed");
  }
}

