import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { assertDatabaseMutationAllowed } from "../../../src/lib/preview-security";
import { resolveConversionDateTime } from "../conversionTime";
import {
  buildDailyActionQueue, normalizeAppointment, normalizeTask,
  type AdminActionQueueResult, type AdminAppointmentRow, type AdminFollowupTaskRow,
  type AppointmentMutationResult, type FollowupMutationResult,
} from "./supabase/adminAppointmentFollowupOps";

type Query = ReturnType<typeof neon>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}
type Context = { leadId: string; actor?: string; idempotencyKey?: string; now?: Date; timezone?: string | null };
type Mutation = AppointmentMutationResult | FollowupMutationResult;
async function mutate(operation: string, input: Context & Record<string, unknown>): Promise<Mutation> {
  if (!UUID.test(input.leadId)) return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  const guard = assertDatabaseMutationAllowed();
  if (!guard.ok) return { ok: false, statusCode: guard.statusCode, error: guard.error };
  const sql = queryFromEnv();
  if (!sql) return { ok: false, statusCode: 503, error: "conversion_store_not_configured" };
  const { leadId, actor, idempotencyKey, now: _now, ...payload } = input;
  void _now;
  try {
    for (const name of ["startsAt", "endsAt", "dueAt"]) {
      if (payload[name]) payload[name] = resolveConversionDateTime(String(payload[name]), input.timezone || "America/New_York");
    }
  } catch (error) {
    return { ok: false, statusCode: 400, error: error instanceof Error ? error.message : "invalid_conversion_time" };
  }
  try {
    const rows = await sql.query(
      "SELECT public.mutate_admin_conversion_v1($1::uuid,$2::text,$3::jsonb,$4::text,$5::text) AS result",
      [leadId, operation, JSON.stringify(payload), actor || "system/admin_basic_auth", idempotencyKey || randomUUID()],
    ) as Array<{ result?: Mutation }>;
    const result = rows[0]?.result;
    if (!result || typeof result.ok !== "boolean") return { ok: false, statusCode: 500, error: "conversion_response_invalid" };
    return result;
  } catch {
    // SQL errors roll back every required effect; transport loss may occur
    // after commit. This is an uncertain response, not proof of failure. The
    // UI retains the exact key/payload for safe replay, never a new blind write.
    return { ok: false, statusCode: 503, error: "conversion_transaction_unavailable" };
  }
}
export async function createNeonAppointment(input: Context & {
  status?: string; startsAt?: string | null; endsAt?: string | null;
  locationType?: string | null; locationLabel?: string | null; meetingUrl?: string | null; cancellationReason?: string | null;
}): Promise<AppointmentMutationResult> {
  return mutate("appointment_create", input) as Promise<AppointmentMutationResult>;
}
export async function transitionNeonAppointment(input: Context & {
  appointmentId: string; expectedUpdatedAt: string | null; status: string;
  startsAt?: string | null; endsAt?: string | null; cancellationReason?: string | null;
}): Promise<AppointmentMutationResult> {
  if (!UUID.test(input.appointmentId)) return { ok: false, statusCode: 400, error: "invalid_appointment_id" };
  return mutate("appointment_transition", input) as Promise<AppointmentMutationResult>;
}
export async function createNeonFollowupTask(input: Context & {
  taskType: string; dueAt: string; priority?: string | null; note?: string | null;
}): Promise<FollowupMutationResult> {
  return mutate("task_create", input) as Promise<FollowupMutationResult>;
}
export async function updateNeonFollowupTask(input: Context & {
  taskId: string; expectedUpdatedAt: string | null; action: "complete" | "cancel" | "reschedule";
  dueAt?: string | null; outcome?: string | null;
}): Promise<FollowupMutationResult> {
  if (!UUID.test(input.taskId)) return { ok: false, statusCode: 400, error: "invalid_followup_id" };
  return mutate("task_update", input) as Promise<FollowupMutationResult>;
}
export async function recordNeonHumanFollowthrough(input: Context & {
  channel: string; result: string; note: string; dueAt: string; taskType: string; priority?: string | null;
}): Promise<FollowupMutationResult> {
  return mutate("human_followthrough", input) as Promise<FollowupMutationResult>;
}

export async function loadNeonAdminActionQueue(): Promise<AdminActionQueueResult> {
  const sql = queryFromEnv();
  const now = new Date();
  if (!sql) return { configured: false, generatedAt: now.toISOString(), items: [] };
  try {
    const [leads, appointments, tasks, notifications] = await Promise.all([
      sql.query(
        `SELECT id, created_at, status, assigned_agent_id, assigned_at,
                last_contacted_at, lead_grade, timeline_months, address_raw,
                first_name, last_name
           FROM public.leads
          WHERE is_test = false AND communication_suppressed = false
          ORDER BY created_at DESC LIMIT 500`,
      ),
      sql.query(`SELECT *, updated_at::text AS updated_at FROM public.lead_appointments ORDER BY created_at DESC LIMIT 500`),
      sql.query(`SELECT *, updated_at::text AS updated_at FROM public.tasks WHERE category LIKE 'followup:%' ORDER BY due_at ASC NULLS LAST LIMIT 500`),
      sql.query(`SELECT id, lead_id, agent_id, status, next_attempt_at FROM public.lead_notifications WHERE status = 'retry_scheduled' LIMIT 100`),
    ]);
    return {
      configured: true,
      generatedAt: now.toISOString(),
      items: buildDailyActionQueue({
        leads: leads as Array<Record<string, unknown>>,
        appointments: (appointments as Array<Record<string, unknown>>).map(normalizeAppointment).filter((row): row is AdminAppointmentRow => Boolean(row)),
        tasks: (tasks as Array<Record<string, unknown>>).map(normalizeTask).filter((row): row is AdminFollowupTaskRow => Boolean(row)),
        notifications: notifications as Array<Record<string, unknown>>,
        now,
      }),
    };
  } catch {
    return { configured: true, generatedAt: now.toISOString(), items: [], error: "Canonical Neon action queue query failed" };
  }
}
