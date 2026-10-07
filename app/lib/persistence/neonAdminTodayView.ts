import { neon } from "@neondatabase/serverless";
import {
  buildAdminTodayQueue,
  emptyAdminTodayQueue,
  type AdminTodayQueueResult,
} from "../adminTodayQueue";
import {
  normalizeAppointment,
  normalizeTask,
  type AdminAppointmentRow,
  type AdminFollowupTaskRow,
} from "./supabase/adminAppointmentFollowupOps";
import { assertDatabaseMutationAllowed } from "../../../src/lib/preview-security";
import {
  hasLeadCenterPermission,
  type LeadCenterPrincipal,
} from "../../../src/lib/admin/rbac-policy";

type Query = ReturnType<typeof neon>;

function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

export async function loadNeonAdminTodayQueue(
  principal: LeadCenterPrincipal | null,
  now = new Date(),
): Promise<AdminTodayQueueResult> {
  const sql = queryFromEnv();
  if (!sql) return emptyAdminTodayQueue(now);
  if (!principal) {
    return { ...emptyAdminTodayQueue(now, "America/New_York", "lead_center_principal_required"), configured: true };
  }
  if (!hasLeadCenterPermission(principal.role, "lead:view_assigned")) {
    return { ...emptyAdminTodayQueue(now, "America/New_York", "lead_center_lead_permission_required"), configured: true };
  }
  const canViewAll = hasLeadCenterPermission(principal.role, "lead:view_all");
  if (!canViewAll && !principal.agentId) return { ...emptyAdminTodayQueue(now), configured: true };

  try {
    const leads = await sql.query(
      `SELECT l.id, l.created_at, l.updated_at::text AS updated_at, l.status, l.score, l.lead_grade,
              l.is_test, l.communication_suppressed, l.assigned_agent_id,
              l.assigned_at, l.last_contacted_at, l.next_follow_up_at,
              l.address_raw, l.first_name, l.last_name,
              aa.id AS assignment_id, aa.status AS assignment_status,
              rm.first_human_response_at
         FROM public.leads l
         LEFT JOIN LATERAL (
           SELECT id, status
             FROM public.agent_assignments
            WHERE lead_id = l.id
            ORDER BY created_at DESC, id DESC LIMIT 1
         ) aa ON true
         LEFT JOIN public.lead_response_milestones rm ON rm.lead_id = l.id
        WHERE l.status NOT IN ('converted', 'dead', 'closed', 'closed_won', 'closed_lost', 'spam')
          ${!canViewAll ? "AND l.assigned_agent_id = $1::uuid" : ""}
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT 1000`,
      !canViewAll ? [principal.agentId] : [],
    ) as Array<Record<string, unknown>>;

    const leadIds = leads.flatMap((row) => typeof row.id === "string" ? [row.id] : []);
    if (!leadIds.length) {
      return { ...emptyAdminTodayQueue(now), configured: true };
    }

    const [appointmentRows, taskRows, notificationRows, permissionRows, reviewRows] = await Promise.all([
      sql.query(
        `SELECT a.*, a.updated_at::text AS updated_at FROM public.lead_appointments a
          WHERE a.lead_id = ANY($1::uuid[])
            AND a.status IN ('requested','scheduled','confirmed','reschedule_requested')
          ORDER BY COALESCE(a.starts_at, a.requested_at, a.created_at), a.id LIMIT 2000`,
        [leadIds],
      ),
      sql.query(
        `SELECT t.*, t.updated_at::text AS updated_at FROM public.tasks t
          WHERE t.lead_id = ANY($1::uuid[])
            AND t.category LIKE 'followup:%'
            AND t.status IN ('open','in_progress')
          ORDER BY t.due_at ASC NULLS LAST, t.id LIMIT 2000`,
        [leadIds],
      ),
      sql.query(
        `SELECT n.id, n.lead_id, n.agent_id, n.status, n.next_attempt_at,
                n.created_at, n.updated_at, n.attempt_count, n.provider_message_id
           FROM public.lead_notifications n
          WHERE n.lead_id = ANY($1::uuid[])
            AND n.status IN ('failed','retry_scheduled','permanently_failed','pending','processing')
          ORDER BY n.updated_at DESC, n.id LIMIT 1000`,
        [leadIds],
      ),
      sql.query(
        `SELECT lead_id, channel, purpose, state, manual_review_required, updated_at
           FROM public.communication_permissions
          WHERE lead_id = ANY($1::uuid[])
          ORDER BY updated_at DESC LIMIT 4000`,
        [leadIds],
      ),
      sql.query(
        `SELECT lead_id, action_key, status, snooze_until, version
           FROM public.lead_action_reviews
          WHERE lead_id = ANY($1::uuid[])
          ORDER BY updated_at DESC LIMIT 2000`,
        [leadIds],
      ),
    ]);

    const result = buildAdminTodayQueue({
      leads,
      appointments: (appointmentRows as Array<Record<string, unknown>>)
        .map(normalizeAppointment)
        .filter((row): row is AdminAppointmentRow => Boolean(row)),
      tasks: (taskRows as Array<Record<string, unknown>>)
        .map(normalizeTask)
        .filter((row): row is AdminFollowupTaskRow => Boolean(row)),
      notifications: notificationRows as Array<Record<string, unknown>>,
      permissions: permissionRows as Array<Record<string, unknown>>,
      reviews: reviewRows as Array<Record<string, unknown>>,
      now,
      timezone: "America/New_York",
      canViewUnassigned: canViewAll,
    });
    return { ...result, configured: true };
  } catch {
    return { ...emptyAdminTodayQueue(now, "America/New_York", "Canonical Today queue query failed"), configured: true };
  }
}

export type TodayReviewMutationResult =
  | { ok: true; version: number; status: "open" | "snoozed" | "dismissed" }
  | { ok: false; statusCode: number; error: string };

export async function mutateNeonTodayActionReview(input: {
  leadId: string;
  actionKey: string;
  status: "open" | "snoozed" | "dismissed";
  reason: string | null;
  snoozeUntil: string | null;
  expectedVersion: number;
  actorUserId: string;
}): Promise<TodayReviewMutationResult> {
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  const sql = queryFromEnv();
  if (!sql) return { ok: false, statusCode: 503, error: "today_action_store_not_configured" };
  try {
    const rows = await sql.query(
      `SELECT public.mutate_lead_action_review_v1(
         $1::uuid, $2::text, $3::text, $4::text, $5::timestamptz,
         $6::integer, $7::text, now()
       ) AS result`,
      [input.leadId, input.actionKey, input.status, input.reason, input.snoozeUntil,
        input.expectedVersion, input.actorUserId],
    ) as Array<{ result?: Record<string, unknown> }>;
    const result = rows[0]?.result || {};
    if (result.ok !== true) {
      const error = typeof result.error === "string" ? result.error : "today_action_update_failed";
      return { ok: false, statusCode: error === "stale_action_version" ? 409 : 400, error };
    }
    return {
      ok: true,
      version: typeof result.version === "number" ? result.version : Number(result.version || 0),
      status: input.status,
    };
  } catch {
    return { ok: false, statusCode: 500, error: "today_action_update_failed" };
  }
}
