import { neon } from "@neondatabase/serverless";
import { updateAdminLeadStatus, type AdminLeadStatus } from "../adminLeadActions";
import { assertDatabaseMutationAllowed } from "../../../src/lib/preview-security";
import {
  APPOINTMENT_STATUSES,
  FOLLOWUP_TASK_TYPES,
  buildDailyActionQueue,
  canTransitionAppointment,
  normalizeAppointment,
  normalizeTask,
  validateAppointmentWindow,
  type AdminActionQueueResult,
  type AdminAppointmentRow,
  type AdminFollowupTaskRow,
  type AppointmentMutationResult,
  type AppointmentStatus,
  type FollowupMutationResult,
  type FollowupPriority,
  type FollowupTaskStatus,
  type FollowupTaskType,
} from "./supabase/adminAppointmentFollowupOps";

type Query = ReturnType<typeof neon>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIT_ACTOR = "system/admin_basic_auth";
const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "requested", "scheduled", "confirmed", "reschedule_requested",
];

function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

function isTaskType(value: string): value is FollowupTaskType {
  return (FOLLOWUP_TASK_TYPES as readonly string[]).includes(value);
}

function validDate(value: string | null) {
  return Boolean(value && Number.isFinite(new Date(value).getTime()));
}

function appointmentLeadStatus(status: AppointmentStatus): AdminLeadStatus | null {
  if (status === "requested" || status === "reschedule_requested") return "appointment_requested";
  if (["scheduled", "confirmed", "completed", "no_show"].includes(status)) return "appointment_set";
  return null;
}

async function writeAudit(sql: Query, input: {
  action: string;
  leadId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actor?: string;
}) {
  await sql.query(
    `INSERT INTO public.audit_logs
      (actor, action, resource_type, resource_id, before_state, after_state, metadata)
     VALUES ($1, $2, 'lead', $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
    [
      input.actor || AUDIT_ACTOR,
      input.action,
      input.leadId,
      JSON.stringify(input.beforeState),
      JSON.stringify(input.afterState),
      JSON.stringify({ source: "admin_appointment_followup", ...(input.metadata || {}) }),
    ],
  );
}

async function syncLeadLifecycle(leadId: string, status: AppointmentStatus, now: Date, actor?: string) {
  const next = appointmentLeadStatus(status);
  return next ? updateAdminLeadStatus(leadId, next, { now, actor }) : null;
}

export async function createNeonAppointment(input: {
  leadId: string;
  status?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string | null;
  locationType?: string | null;
  locationLabel?: string | null;
  meetingUrl?: string | null;
  cancellationReason?: string | null;
  now?: Date;
  actor?: string;
}): Promise<AppointmentMutationResult> {
  if (!UUID.test(input.leadId)) return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  const status = input.status && isAppointmentStatus(input.status) ? input.status : "requested";
  const timezone = text(input.timezone) || "America/New_York";
  const startsAt = text(input.startsAt);
  const endsAt = text(input.endsAt);
  const windowError = validateAppointmentWindow({ status, startsAt, endsAt, timezone });
  if (windowError) return { ok: false, statusCode: 400, error: windowError };
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  const sql = queryFromEnv();
  if (!sql) return { ok: false, statusCode: 503, error: "appointment_store_not_configured" };

  try {
    const leads = await sql.query(
      `SELECT id, assigned_agent_id FROM public.leads WHERE id = $1::uuid LIMIT 1`,
      [input.leadId],
    ) as Array<Record<string, unknown>>;
    if (!leads[0]) return { ok: false, statusCode: 404, error: "lead_not_found" };
    const active = await sql.query(
      `SELECT id FROM public.lead_appointments
        WHERE lead_id = $1::uuid
          AND status = ANY($2::text[])
        LIMIT 1`,
      [input.leadId, ACTIVE_APPOINTMENT_STATUSES],
    ) as Array<Record<string, unknown>>;
    if (active.length) return { ok: false, statusCode: 409, error: "duplicate_active_appointment" };

    const now = input.now || new Date();
    const rows = await sql.query(
      `INSERT INTO public.lead_appointments
        (lead_id, assigned_agent_id, status, starts_at, ends_at, timezone,
         location_type, location_label, meeting_url, requested_at,
         cancellation_reason, created_by)
       VALUES ($1::uuid, $2::uuid, $3, $4::timestamptz, $5::timestamptz,
               $6, $7, $8, $9, $10::timestamptz, $11, $12)
       RETURNING *`,
      [
        input.leadId,
        text(leads[0].assigned_agent_id),
        status,
        startsAt,
        endsAt,
        timezone,
        text(input.locationType) || "office",
        text(input.locationLabel),
        text(input.meetingUrl),
        now.toISOString(),
        status === "canceled" ? text(input.cancellationReason) : null,
        input.actor || AUDIT_ACTOR,
      ],
    ) as Array<Record<string, unknown>>;
    const appointment = normalizeAppointment(rows[0] || {});
    if (!appointment) return { ok: false, statusCode: 500, error: "appointment_response_invalid" };
    await syncLeadLifecycle(input.leadId, status, now, input.actor);
    await writeAudit(sql, {
      action: "lead.appointment_created",
      leadId: input.leadId,
      beforeState: null,
      afterState: { appointment_id: appointment.id, status },
      metadata: { appointment_id: appointment.id, starts_at: startsAt, timezone },
      actor: input.actor,
    });
    return { ok: true, id: appointment.id, status };
  } catch (error) {
    const duplicate = error instanceof Error && /duplicate key|one_active_per_lead/i.test(error.message);
    return { ok: false, statusCode: duplicate ? 409 : 500, error: duplicate ? "duplicate_active_appointment" : "appointment_create_failed" };
  }
}

export async function transitionNeonAppointment(input: {
  appointmentId: string;
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string | null;
  cancellationReason?: string | null;
  now?: Date;
  actor?: string;
}): Promise<AppointmentMutationResult> {
  if (!UUID.test(input.appointmentId)) return { ok: false, statusCode: 400, error: "invalid_appointment_id" };
  if (!isAppointmentStatus(input.status)) return { ok: false, statusCode: 400, error: "invalid_appointment_status" };
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  const sql = queryFromEnv();
  if (!sql) return { ok: false, statusCode: 503, error: "appointment_store_not_configured" };

  try {
    const rows = await sql.query(
      `SELECT * FROM public.lead_appointments WHERE id = $1::uuid LIMIT 1`,
      [input.appointmentId],
    ) as Array<Record<string, unknown>>;
    const current = normalizeAppointment(rows[0] || {});
    if (!current) return { ok: false, statusCode: 404, error: "appointment_not_found" };
    if (current.status === input.status) {
      return { ok: true, id: current.id, status: current.status, warning: "appointment_status_already_current" };
    }
    if (!canTransitionAppointment(current.status, input.status)) {
      return { ok: false, statusCode: 409, error: "forbidden_appointment_transition" };
    }
    const startsAt = text(input.startsAt) || current.starts_at;
    const endsAt = text(input.endsAt) || current.ends_at;
    const timezone = text(input.timezone) || current.timezone;
    const windowError = validateAppointmentWindow({ status: input.status, startsAt, endsAt, timezone });
    if (windowError) return { ok: false, statusCode: 400, error: windowError };
    if (ACTIVE_APPOINTMENT_STATUSES.includes(input.status)) {
      const duplicates = await sql.query(
        `SELECT id FROM public.lead_appointments
          WHERE lead_id = $1::uuid AND id <> $2::uuid
            AND status = ANY($3::text[])
          LIMIT 1`,
        [current.lead_id, current.id, ACTIVE_APPOINTMENT_STATUSES],
      ) as Array<Record<string, unknown>>;
      if (duplicates.length) return { ok: false, statusCode: 409, error: "duplicate_active_appointment" };
    }
    const now = input.now || new Date();
    const updated = await sql.query(
      `UPDATE public.lead_appointments SET
         status = $1,
         starts_at = $2::timestamptz,
         ends_at = $3::timestamptz,
         timezone = $4,
         confirmed_at = CASE WHEN $1 = 'confirmed' THEN $5::timestamptz WHEN $1 = 'scheduled' THEN NULL ELSE confirmed_at END,
         completed_at = CASE WHEN $1 = 'completed' THEN $5::timestamptz WHEN $1 = 'scheduled' THEN NULL ELSE completed_at END,
         canceled_at = CASE WHEN $1 = 'canceled' THEN $5::timestamptz WHEN $1 = 'scheduled' THEN NULL ELSE canceled_at END,
         cancellation_reason = CASE WHEN $1 = 'canceled' THEN COALESCE($6, 'not_specified') WHEN $1 = 'scheduled' THEN NULL ELSE cancellation_reason END
       WHERE id = $7::uuid AND status = $8
       RETURNING id`,
      [input.status, startsAt, endsAt, timezone, now.toISOString(), text(input.cancellationReason), current.id, current.status],
    ) as Array<Record<string, unknown>>;
    if (!updated.length) return { ok: false, statusCode: 409, error: "concurrent_appointment_update" };
    await syncLeadLifecycle(current.lead_id, input.status, now, input.actor);
    await writeAudit(sql, {
      action: "lead.appointment_status_changed",
      leadId: current.lead_id,
      beforeState: { appointment_id: current.id, status: current.status },
      afterState: { appointment_id: current.id, status: input.status },
      metadata: { appointment_id: current.id, starts_at: startsAt, timezone },
      actor: input.actor,
    });
    return { ok: true, id: current.id, status: input.status };
  } catch {
    return { ok: false, statusCode: 500, error: "appointment_update_failed" };
  }
}

function taskTitle(type: FollowupTaskType) {
  return type.replaceAll("_", " ");
}

export async function createNeonFollowupTask(input: {
  leadId: string;
  taskType: string;
  dueAt: string | null;
  priority?: string | null;
  note?: string | null;
  actor?: string;
}): Promise<FollowupMutationResult> {
  if (!UUID.test(input.leadId)) return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  if (!isTaskType(input.taskType)) return { ok: false, statusCode: 400, error: "invalid_followup_type" };
  if (!validDate(input.dueAt)) return { ok: false, statusCode: 400, error: "invalid_followup_due_at" };
  const priority = text(input.priority) || "normal";
  if (!["low", "normal", "high", "urgent"].includes(priority)) {
    return { ok: false, statusCode: 400, error: "invalid_followup_priority" };
  }
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  const sql = queryFromEnv();
  if (!sql) return { ok: false, statusCode: 503, error: "followup_store_not_configured" };
  try {
    const leads = await sql.query(
      `SELECT id, assigned_agent_id FROM public.leads WHERE id = $1::uuid LIMIT 1`,
      [input.leadId],
    ) as Array<Record<string, unknown>>;
    if (!leads[0]) return { ok: false, statusCode: 404, error: "lead_not_found" };
    const rows = await sql.query(
      `INSERT INTO public.tasks
        (lead_id, agent_id, created_by, title, body, due_at, status, priority, category)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::timestamptz, 'open', $7, $8)
       RETURNING *`,
      [input.leadId, text(leads[0].assigned_agent_id), input.actor || AUDIT_ACTOR, taskTitle(input.taskType), text(input.note), input.dueAt, priority, `followup:${input.taskType}`],
    ) as Array<Record<string, unknown>>;
    const task = normalizeTask(rows[0] || {});
    if (!task) return { ok: false, statusCode: 500, error: "followup_response_invalid" };
    await writeAudit(sql, {
      action: "lead.followup_created",
      leadId: input.leadId,
      beforeState: null,
      afterState: { task_id: task.id, status: "open", task_type: input.taskType },
      metadata: { task_id: task.id, due_at: input.dueAt },
      actor: input.actor,
    });
    return { ok: true, id: task.id, status: "open" };
  } catch {
    return { ok: false, statusCode: 500, error: "followup_create_failed" };
  }
}

export async function updateNeonFollowupTask(input: {
  taskId: string;
  action: "complete" | "cancel" | "reschedule";
  dueAt?: string | null;
  outcome?: string | null;
  actor?: string;
}): Promise<FollowupMutationResult> {
  if (!UUID.test(input.taskId)) return { ok: false, statusCode: 400, error: "invalid_followup_id" };
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  const sql = queryFromEnv();
  if (!sql) return { ok: false, statusCode: 503, error: "followup_store_not_configured" };
  try {
    const rows = await sql.query(`SELECT * FROM public.tasks WHERE id = $1::uuid LIMIT 1`, [input.taskId]) as Array<Record<string, unknown>>;
    const task = normalizeTask(rows[0] || {});
    if (!task?.lead_id) return { ok: false, statusCode: 404, error: "followup_not_found" };
    let nextStatus: FollowupTaskStatus = task.status;
    let dueAt = task.due_at;
    let body = task.body;
    if (input.action === "complete") { nextStatus = "done"; body = text(input.outcome) || task.body; }
    else if (input.action === "cancel") { nextStatus = "cancelled"; body = text(input.outcome) || task.body; }
    else {
      if (!validDate(input.dueAt || null)) return { ok: false, statusCode: 400, error: "invalid_followup_due_at" };
      nextStatus = "open";
      dueAt = input.dueAt || null;
    }
    if (task.status === nextStatus && input.action !== "reschedule") {
      return { ok: true, id: task.id, status: task.status, warning: "followup_status_already_current" };
    }
    const updated = await sql.query(
      `UPDATE public.tasks SET status = $1, due_at = $2::timestamptz, body = $3
        WHERE id = $4::uuid AND status = $5 RETURNING id`,
      [nextStatus, dueAt, body, task.id, task.status],
    ) as Array<Record<string, unknown>>;
    if (!updated.length) return { ok: false, statusCode: 409, error: "concurrent_followup_update" };
    await writeAudit(sql, {
      action: `lead.followup_${input.action}`,
      leadId: task.lead_id,
      beforeState: { task_id: task.id, status: task.status, due_at: task.due_at },
      afterState: { task_id: task.id, status: nextStatus, due_at: dueAt },
      metadata: { task_id: task.id },
      actor: input.actor,
    });
    return { ok: true, id: task.id, status: nextStatus };
  } catch {
    return { ok: false, statusCode: 500, error: "followup_update_failed" };
  }
}

export async function loadNeonAdminActionQueue(): Promise<AdminActionQueueResult> {
  const sql = queryFromEnv();
  const now = new Date();
  if (!sql) return { configured: false, generatedAt: now.toISOString(), items: [] };
  try {
    const [leads, appointments, tasks, notifications] = await Promise.all([
      sql.query(
        `SELECT l.id, l.created_at, l.status, l.conversion_stage,
                l.assigned_agent_id, l.assigned_at, l.last_contacted_at,
                l.lead_grade, l.timeline_months, l.address_raw,
                l.first_name, l.last_name, l.is_test,
                l.communication_suppressed, rm.first_human_response_at,
                true AS first_response_evidence_available
           FROM public.leads l
           LEFT JOIN public.lead_response_milestones rm
             ON rm.lead_id = l.id
            AND rm.is_test = false
            AND rm.communication_suppressed = false
          WHERE l.is_test = false AND l.communication_suppressed = false
          ORDER BY l.created_at DESC LIMIT 500`,
      ),
      sql.query(`SELECT * FROM public.lead_appointments ORDER BY created_at DESC LIMIT 500`),
      sql.query(`SELECT * FROM public.tasks WHERE category LIKE 'followup:%' ORDER BY due_at ASC NULLS LAST LIMIT 500`),
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
