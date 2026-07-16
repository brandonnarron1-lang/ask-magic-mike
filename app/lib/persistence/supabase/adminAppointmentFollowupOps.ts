import { updateAdminLeadStatus, type AdminLeadStatus } from "../../adminLeadActions";
import { buildLeadStalledSignals } from "../../adminLeadTimeline";
import { assertDatabaseMutationAllowed } from "../../../../src/lib/preview-security";

export const APPOINTMENT_STATUSES = [
  "requested",
  "scheduled",
  "confirmed",
  "completed",
  "canceled",
  "no_show",
  "reschedule_requested",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const FOLLOWUP_TASK_TYPES = [
  "first_contact",
  "qualification_followup",
  "appointment_confirmation",
  "appointment_followup",
  "document_followup",
  "nurture_check_in",
  "manual_callback",
] as const;

export type FollowupTaskType = (typeof FOLLOWUP_TASK_TYPES)[number];
export type FollowupTaskStatus = "open" | "in_progress" | "done" | "cancelled";
export type FollowupPriority = "low" | "normal" | "high" | "urgent";

export type AdminAppointmentRow = {
  id: string;
  lead_id: string;
  assigned_agent_id: string | null;
  status: AppointmentStatus;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  location_type: string;
  location_label: string | null;
  meeting_url: string | null;
  requested_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminFollowupTaskRow = {
  id: string;
  lead_id: string | null;
  agent_id: string | null;
  title: string;
  body: string | null;
  due_at: string | null;
  status: FollowupTaskStatus;
  priority: FollowupPriority;
  category: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AppointmentMutationResult =
  | { ok: true; id: string; status: AppointmentStatus; warning?: string }
  | { ok: false; statusCode: number; error: string };

export type FollowupMutationResult =
  | { ok: true; id: string; status: FollowupTaskStatus; warning?: string }
  | { ok: false; statusCode: number; error: string };

export type AdminActionQueueItem = {
  id: string;
  type:
    | "overdue_followup"
    | "followup_due_today"
    | "appointment_needs_confirmation"
    | "appointment_today"
    | "appointment_no_show"
    | "appointment_request_unscheduled"
    | "stalled_lead"
    | "notification_retry";
  priority: 1 | 2 | 3 | 4 | 5;
  lead_id: string;
  lead_label: string;
  owner: string;
  due_at: string | null;
  status: string;
  recommended_action: string;
};

export type AdminActionQueueResult = {
  configured: boolean;
  generatedAt: string;
  items: AdminActionQueueItem[];
  error?: string;
};

export type AppointmentCalendarAdapterResult =
  | { ok: true; external_event_id: string | null; status: "disabled" | "synced" }
  | { ok: false; retryable: boolean; error: string };

export type AppointmentCalendarAdapter = {
  name: string;
  createOrUpdate(input: {
    appointment: AdminAppointmentRow;
    idempotencyKey: string;
  }): Promise<AppointmentCalendarAdapterResult>;
  cancel(input: {
    appointment: AdminAppointmentRow;
    idempotencyKey: string;
  }): Promise<AppointmentCalendarAdapterResult>;
};

export const disabledCalendarAdapter: AppointmentCalendarAdapter = {
  name: "disabled",
  async createOrUpdate() {
    return { ok: true, external_event_id: null, status: "disabled" };
  },
  async cancel() {
    return { ok: true, external_event_id: null, status: "disabled" };
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIT_ACTOR = "system/admin_basic_auth";
const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "requested",
  "scheduled",
  "confirmed",
  "reschedule_requested",
];

const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  requested: ["scheduled", "canceled"],
  scheduled: ["confirmed", "canceled", "reschedule_requested"],
  confirmed: ["completed", "no_show", "canceled", "reschedule_requested"],
  completed: [],
  canceled: ["reschedule_requested"],
  no_show: ["reschedule_requested"],
  reschedule_requested: ["scheduled", "canceled"],
};

function configured() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

function isTaskType(value: string): value is FollowupTaskType {
  return (FOLLOWUP_TASK_TYPES as readonly string[]).includes(value);
}

function parseTime(value: string | null) {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function isValidDateTime(value: string | null) {
  if (!value) return false;
  return Number.isFinite(new Date(value).getTime());
}

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function buildHeaders(serviceKey: string, contentType = false) {
  return {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Cache-Control": "no-store",
    ...(contentType ? { "Content-Type": "application/json" } : {}),
  };
}

function appointmentLeadStatus(status: AppointmentStatus): AdminLeadStatus | null {
  if (status === "requested" || status === "reschedule_requested") return "appointment_requested";
  if (status === "scheduled" || status === "confirmed" || status === "completed" || status === "no_show") {
    return "appointment_set";
  }
  return null;
}

function normalizeAppointment(row: Record<string, unknown>): AdminAppointmentRow | null {
  const status = text(row.status) || "";
  if (!isAppointmentStatus(status)) return null;
  const id = text(row.id);
  const leadId = text(row.lead_id);
  if (!id || !leadId) return null;
  return {
    id,
    lead_id: leadId,
    assigned_agent_id: text(row.assigned_agent_id),
    status,
    starts_at: text(row.starts_at),
    ends_at: text(row.ends_at),
    timezone: text(row.timezone) || "America/New_York",
    location_type: text(row.location_type) || "office",
    location_label: text(row.location_label),
    meeting_url: text(row.meeting_url),
    requested_at: text(row.requested_at),
    confirmed_at: text(row.confirmed_at),
    completed_at: text(row.completed_at),
    canceled_at: text(row.canceled_at),
    cancellation_reason: text(row.cancellation_reason),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
  };
}

function normalizeTask(row: Record<string, unknown>): AdminFollowupTaskRow | null {
  const id = text(row.id);
  const title = text(row.title);
  if (!id || !title) return null;
  const status = text(row.status) || "open";
  const priority = text(row.priority) || "normal";
  return {
    id,
    lead_id: text(row.lead_id),
    agent_id: text(row.agent_id),
    title,
    body: text(row.body),
    due_at: text(row.due_at),
    status: ["open", "in_progress", "done", "cancelled"].includes(status)
      ? (status as FollowupTaskStatus)
      : "open",
    priority: ["low", "normal", "high", "urgent"].includes(priority)
      ? (priority as FollowupPriority)
      : "normal",
    category: text(row.category),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
  };
}

async function readLead(input: { supabaseUrl: string; serviceKey: string; leadId: string }) {
  const url = new URL("/rest/v1/leads", input.supabaseUrl);
  url.searchParams.set("id", "eq." + input.leadId);
  url.searchParams.set("select", "id,status,assigned_agent_id,created_at,last_contacted_at,lead_grade,timeline_months,address,address_raw,property_address,first_name,last_name,name");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    headers: buildHeaders(input.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false as const, error: "lead_preflight_failed" };
  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  return { ok: true as const, row: rows[0] || null };
}

async function writeAudit(input: {
  supabaseUrl: string;
  serviceKey: string;
  action: string;
  leadId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const url = new URL("/rest/v1/audit_logs", input.supabaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...buildHeaders(input.serviceKey, true),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      actor: AUDIT_ACTOR,
      action: input.action,
      resource_type: "lead",
      resource_id: input.leadId,
      before_state: input.beforeState,
      after_state: input.afterState,
      metadata: {
        source: "admin_appointment_followup",
        ...input.metadata,
      },
    }),
    cache: "no-store",
  });
  return response.ok;
}

async function syncLeadLifecycle(leadId: string, status: AppointmentStatus, now: Date) {
  const nextLeadStatus = appointmentLeadStatus(status);
  if (!nextLeadStatus) return null;
  return updateAdminLeadStatus(leadId, nextLeadStatus, { now });
}

async function hasActiveAppointment(input: {
  supabaseUrl: string;
  serviceKey: string;
  leadId: string;
  excludeAppointmentId?: string;
}) {
  const url = new URL("/rest/v1/lead_appointments", input.supabaseUrl);
  url.searchParams.set("lead_id", "eq." + input.leadId);
  url.searchParams.set("status", `in.(${ACTIVE_APPOINTMENT_STATUSES.join(",")})`);
  url.searchParams.set("select", "id,status");
  url.searchParams.set("limit", "2");
  const response = await fetch(url, {
    headers: buildHeaders(input.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false as const };
  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  return {
    ok: true as const,
    exists: rows.some((row) => text(row.id) !== input.excludeAppointmentId),
  };
}

export function canTransitionAppointment(current: AppointmentStatus, next: AppointmentStatus) {
  if (current === next) return true;
  return APPOINTMENT_TRANSITIONS[current].includes(next);
}

export function validateAppointmentWindow(input: {
  status: AppointmentStatus;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
}) {
  if (!isValidTimezone(input.timezone)) return "invalid_timezone";
  if (["scheduled", "confirmed", "completed"].includes(input.status) && !isValidDateTime(input.startsAt)) {
    return "appointment_start_required";
  }
  if (input.startsAt && !isValidDateTime(input.startsAt)) return "invalid_appointment_start";
  if (input.endsAt && !isValidDateTime(input.endsAt)) return "invalid_appointment_end";
  if (input.startsAt && input.endsAt && parseTime(input.endsAt) <= parseTime(input.startsAt)) {
    return "appointment_end_before_start";
  }
  return null;
}

export async function createAppointment(input: {
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

  const config = configured();
  if (!config) return { ok: false, statusCode: 503, error: "appointment_store_not_configured" };

  const lead = await readLead({ ...config, leadId: input.leadId });
  if (!lead.ok) return { ok: false, statusCode: 500, error: lead.error };
  if (!lead.row) return { ok: false, statusCode: 404, error: "lead_not_found" };

  const duplicate = await hasActiveAppointment({ ...config, leadId: input.leadId });
  if (!duplicate.ok) return { ok: false, statusCode: 500, error: "appointment_duplicate_check_failed" };
  if (duplicate.exists) return { ok: false, statusCode: 409, error: "duplicate_active_appointment" };

  const now = input.now || new Date();
  const url = new URL("/rest/v1/lead_appointments", config.supabaseUrl);
  url.searchParams.set("select", "*");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...buildHeaders(config.serviceKey, true),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      lead_id: input.leadId,
      assigned_agent_id: text(lead.row.assigned_agent_id),
      status,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone,
      location_type: text(input.locationType) || "office",
      location_label: text(input.locationLabel),
      meeting_url: text(input.meetingUrl),
      requested_at: now.toISOString(),
      cancellation_reason: status === "canceled" ? text(input.cancellationReason) : null,
      created_by: AUDIT_ACTOR,
    }),
    cache: "no-store",
  });

  if (!response.ok) return { ok: false, statusCode: response.status, error: "appointment_create_failed" };
  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  const appointment = normalizeAppointment(rows[0] || {});
  if (!appointment) return { ok: false, statusCode: 500, error: "appointment_response_invalid" };

  await syncLeadLifecycle(input.leadId, status, now);
  const audited = await writeAudit({
    ...config,
    action: "lead.appointment_created",
    leadId: input.leadId,
    beforeState: null,
    afterState: { appointment_id: appointment.id, status },
    metadata: { appointment_id: appointment.id, starts_at: startsAt, timezone },
  });

  return {
    ok: true,
    id: appointment.id,
    status,
    warning: audited ? undefined : "appointment_created_audit_failed",
  };
}

export async function transitionAppointment(input: {
  appointmentId: string;
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string | null;
  cancellationReason?: string | null;
  now?: Date;
}): Promise<AppointmentMutationResult> {
  if (!UUID.test(input.appointmentId)) return { ok: false, statusCode: 400, error: "invalid_appointment_id" };
  if (!isAppointmentStatus(input.status)) return { ok: false, statusCode: 400, error: "invalid_appointment_status" };
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  const config = configured();
  if (!config) return { ok: false, statusCode: 503, error: "appointment_store_not_configured" };

  const readUrl = new URL("/rest/v1/lead_appointments", config.supabaseUrl);
  readUrl.searchParams.set("id", "eq." + input.appointmentId);
  readUrl.searchParams.set("select", "*");
  readUrl.searchParams.set("limit", "1");
  const readResponse = await fetch(readUrl, { headers: buildHeaders(config.serviceKey), cache: "no-store" });
  if (!readResponse.ok) return { ok: false, statusCode: 500, error: "appointment_preflight_failed" };
  const rows = (await readResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const current = normalizeAppointment(rows[0] || {});
  if (!current) return { ok: false, statusCode: 404, error: "appointment_not_found" };

  if (current.status === input.status) {
    return { ok: true, id: current.id, status: current.status, warning: "appointment_status_already_current" };
  }
  if (!canTransitionAppointment(current.status, input.status)) {
    return { ok: false, statusCode: 409, error: "forbidden_appointment_transition" };
  }

  const nextStartsAt = text(input.startsAt) || current.starts_at;
  const nextEndsAt = text(input.endsAt) || current.ends_at;
  const timezone = text(input.timezone) || current.timezone;
  const windowError = validateAppointmentWindow({
    status: input.status,
    startsAt: nextStartsAt,
    endsAt: nextEndsAt,
    timezone,
  });
  if (windowError) return { ok: false, statusCode: 400, error: windowError };

  const duplicate = await hasActiveAppointment({
    ...config,
    leadId: current.lead_id,
    excludeAppointmentId: current.id,
  });
  if (!duplicate.ok) return { ok: false, statusCode: 500, error: "appointment_duplicate_check_failed" };
  if (ACTIVE_APPOINTMENT_STATUSES.includes(input.status) && duplicate.exists) {
    return { ok: false, statusCode: 409, error: "duplicate_active_appointment" };
  }

  const now = input.now || new Date();
  const patch: Record<string, unknown> = {
    status: input.status,
    starts_at: nextStartsAt,
    ends_at: nextEndsAt,
    timezone,
  };
  if (input.status === "confirmed") patch.confirmed_at = now.toISOString();
  if (input.status === "completed") patch.completed_at = now.toISOString();
  if (input.status === "canceled") {
    patch.canceled_at = now.toISOString();
    patch.cancellation_reason = text(input.cancellationReason) || "not_specified";
  }
  if (input.status === "scheduled") {
    patch.confirmed_at = null;
    patch.completed_at = null;
    patch.canceled_at = null;
    patch.cancellation_reason = null;
  }

  const writeUrl = new URL("/rest/v1/lead_appointments", config.supabaseUrl);
  writeUrl.searchParams.set("id", "eq." + current.id);
  writeUrl.searchParams.set("status", "eq." + current.status);
  writeUrl.searchParams.set("select", "*");
  const response = await fetch(writeUrl, {
    method: "PATCH",
    headers: {
      ...buildHeaders(config.serviceKey, true),
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false, statusCode: response.status, error: "appointment_update_failed" };
  const updatedRows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!updatedRows.length) return { ok: false, statusCode: 409, error: "concurrent_appointment_update" };

  await syncLeadLifecycle(current.lead_id, input.status, now);
  const audited = await writeAudit({
    ...config,
    action: "lead.appointment_status_changed",
    leadId: current.lead_id,
    beforeState: { appointment_id: current.id, status: current.status },
    afterState: { appointment_id: current.id, status: input.status },
    metadata: { appointment_id: current.id, starts_at: nextStartsAt, timezone },
  });

  return {
    ok: true,
    id: current.id,
    status: input.status,
    warning: audited ? undefined : "appointment_updated_audit_failed",
  };
}

function taskTitle(type: FollowupTaskType) {
  return type.replaceAll("_", " ");
}

export async function createFollowupTask(input: {
  leadId: string;
  taskType: string;
  dueAt: string | null;
  priority?: string | null;
  note?: string | null;
}): Promise<FollowupMutationResult> {
  if (!UUID.test(input.leadId)) return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  if (!isTaskType(input.taskType)) return { ok: false, statusCode: 400, error: "invalid_followup_type" };
  if (!isValidDateTime(input.dueAt)) return { ok: false, statusCode: 400, error: "invalid_followup_due_at" };
  const priority = text(input.priority) || "normal";
  if (!["low", "normal", "high", "urgent"].includes(priority)) {
    return { ok: false, statusCode: 400, error: "invalid_followup_priority" };
  }
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  const config = configured();
  if (!config) return { ok: false, statusCode: 503, error: "followup_store_not_configured" };
  const lead = await readLead({ ...config, leadId: input.leadId });
  if (!lead.ok) return { ok: false, statusCode: 500, error: lead.error };
  if (!lead.row) return { ok: false, statusCode: 404, error: "lead_not_found" };

  const url = new URL("/rest/v1/tasks", config.supabaseUrl);
  url.searchParams.set("select", "*");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...buildHeaders(config.serviceKey, true),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      lead_id: input.leadId,
      agent_id: text(lead.row.assigned_agent_id),
      created_by: AUDIT_ACTOR,
      title: taskTitle(input.taskType),
      body: text(input.note),
      due_at: input.dueAt,
      status: "open",
      priority,
      category: "followup:" + input.taskType,
    }),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false, statusCode: response.status, error: "followup_create_failed" };
  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  const task = normalizeTask(rows[0] || {});
  if (!task) return { ok: false, statusCode: 500, error: "followup_response_invalid" };

  await writeAudit({
    ...config,
    action: "lead.followup_created",
    leadId: input.leadId,
    beforeState: null,
    afterState: { task_id: task.id, status: "open", task_type: input.taskType },
    metadata: { task_id: task.id, due_at: input.dueAt },
  });

  return { ok: true, id: task.id, status: "open" };
}

export async function updateFollowupTask(input: {
  taskId: string;
  action: "complete" | "cancel" | "reschedule";
  dueAt?: string | null;
  outcome?: string | null;
}): Promise<FollowupMutationResult> {
  if (!UUID.test(input.taskId)) return { ok: false, statusCode: 400, error: "invalid_followup_id" };
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  const config = configured();
  if (!config) return { ok: false, statusCode: 503, error: "followup_store_not_configured" };

  const readUrl = new URL("/rest/v1/tasks", config.supabaseUrl);
  readUrl.searchParams.set("id", "eq." + input.taskId);
  readUrl.searchParams.set("select", "*");
  readUrl.searchParams.set("limit", "1");
  const readResponse = await fetch(readUrl, { headers: buildHeaders(config.serviceKey), cache: "no-store" });
  if (!readResponse.ok) return { ok: false, statusCode: 500, error: "followup_preflight_failed" };
  const rows = (await readResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const task = normalizeTask(rows[0] || {});
  if (!task || !task.lead_id) return { ok: false, statusCode: 404, error: "followup_not_found" };

  const patch: Record<string, unknown> = {};
  let nextStatus: FollowupTaskStatus = task.status;
  if (input.action === "complete") {
    nextStatus = "done";
    patch.status = "done";
    patch.body = text(input.outcome) || task.body;
  } else if (input.action === "cancel") {
    nextStatus = "cancelled";
    patch.status = "cancelled";
    patch.body = text(input.outcome) || task.body;
  } else {
    if (!isValidDateTime(input.dueAt || null)) return { ok: false, statusCode: 400, error: "invalid_followup_due_at" };
    patch.due_at = input.dueAt;
    patch.status = "open";
    nextStatus = "open";
  }

  if (task.status === nextStatus && input.action !== "reschedule") {
    return { ok: true, id: task.id, status: task.status, warning: "followup_status_already_current" };
  }

  const writeUrl = new URL("/rest/v1/tasks", config.supabaseUrl);
  writeUrl.searchParams.set("id", "eq." + task.id);
  writeUrl.searchParams.set("status", "eq." + task.status);
  writeUrl.searchParams.set("select", "*");
  const response = await fetch(writeUrl, {
    method: "PATCH",
    headers: {
      ...buildHeaders(config.serviceKey, true),
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false, statusCode: response.status, error: "followup_update_failed" };
  const updatedRows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!updatedRows.length) return { ok: false, statusCode: 409, error: "concurrent_followup_update" };

  await writeAudit({
    ...config,
    action: "lead.followup_" + input.action,
    leadId: task.lead_id,
    beforeState: { task_id: task.id, status: task.status, due_at: task.due_at },
    afterState: { task_id: task.id, status: nextStatus, due_at: input.dueAt || task.due_at },
    metadata: { task_id: task.id },
  });

  return { ok: true, id: task.id, status: nextStatus };
}

export function buildDailyActionQueue(input: {
  leads: Array<Record<string, unknown>>;
  appointments: AdminAppointmentRow[];
  tasks: AdminFollowupTaskRow[];
  notifications?: Array<Record<string, unknown>>;
  now?: Date;
}): AdminActionQueueItem[] {
  const now = input.now || new Date();
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  const leadMap = new Map(input.leads.map((lead) => [text(lead.id) || "", lead]));
  const items: AdminActionQueueItem[] = [];
  const appointmentActionLeadIds = new Set<string>();

  const leadLabel = (leadId: string) => {
    const lead = leadMap.get(leadId);
    const name = [text(lead?.first_name), text(lead?.last_name)].filter(Boolean).join(" ");
    return text(lead?.address_raw) || name || leadId;
  };
  const owner = (leadId: string, agentId?: string | null) =>
    agentId || text(leadMap.get(leadId)?.assigned_agent_id) || "Unassigned";

  for (const task of input.tasks) {
    if (!task.lead_id || task.status !== "open") continue;
    const dueTime = parseTime(task.due_at);
    if (!Number.isFinite(dueTime)) continue;
    const overdue = dueTime < now.getTime();
    const dueToday = dueTime >= todayStart && dueTime < todayEnd;
    if (!overdue && !dueToday) continue;
    items.push({
      id: `task-${task.id}`,
      type: overdue ? "overdue_followup" : "followup_due_today",
      priority: overdue ? 1 : 4,
      lead_id: task.lead_id,
      lead_label: leadLabel(task.lead_id),
      owner: owner(task.lead_id, task.agent_id),
      due_at: task.due_at,
      status: task.status,
      recommended_action: overdue ? "Complete or reschedule overdue follow-up" : "Complete today's follow-up",
    });
  }

  for (const appointment of input.appointments) {
    const startsTime = parseTime(appointment.starts_at);
    if (appointment.status === "requested" || appointment.status === "reschedule_requested") {
      appointmentActionLeadIds.add(appointment.lead_id);
      items.push({
        id: `appointment-${appointment.id}`,
        type: "appointment_request_unscheduled",
        priority: 2,
        lead_id: appointment.lead_id,
        lead_label: leadLabel(appointment.lead_id),
        owner: owner(appointment.lead_id, appointment.assigned_agent_id),
        due_at: appointment.requested_at,
        status: appointment.status,
        recommended_action: "Schedule appointment details",
      });
    } else if (appointment.status === "scheduled") {
      appointmentActionLeadIds.add(appointment.lead_id);
      items.push({
        id: `appointment-${appointment.id}`,
        type: "appointment_needs_confirmation",
        priority: 3,
        lead_id: appointment.lead_id,
        lead_label: leadLabel(appointment.lead_id),
        owner: owner(appointment.lead_id, appointment.assigned_agent_id),
        due_at: appointment.starts_at,
        status: appointment.status,
        recommended_action: "Confirm appointment with owner and lead",
      });
    } else if (appointment.status === "confirmed" && startsTime >= todayStart && startsTime < todayEnd) {
      appointmentActionLeadIds.add(appointment.lead_id);
      items.push({
        id: `appointment-${appointment.id}`,
        type: "appointment_today",
        priority: 2,
        lead_id: appointment.lead_id,
        lead_label: leadLabel(appointment.lead_id),
        owner: owner(appointment.lead_id, appointment.assigned_agent_id),
        due_at: appointment.starts_at,
        status: appointment.status,
        recommended_action: "Prepare for today's appointment",
      });
    } else if (appointment.status === "no_show") {
      appointmentActionLeadIds.add(appointment.lead_id);
      items.push({
        id: `appointment-${appointment.id}`,
        type: "appointment_no_show",
        priority: 2,
        lead_id: appointment.lead_id,
        lead_label: leadLabel(appointment.lead_id),
        owner: owner(appointment.lead_id, appointment.assigned_agent_id),
        due_at: appointment.starts_at,
        status: appointment.status,
        recommended_action: "Record outcome or request reschedule",
      });
    }
  }

  for (const lead of input.leads) {
    const leadId = text(lead.id);
    if (!leadId) continue;
    if (appointmentActionLeadIds.has(leadId)) continue;
    const signals = buildLeadStalledSignals({
      status: text(lead.status) || "new",
      created_at: text(lead.created_at),
      assigned_agent_id: text(lead.assigned_agent_id),
      assigned_at: text(lead.assigned_at),
      last_contacted_at: text(lead.last_contacted_at),
      lead_grade: text(lead.lead_grade),
      timeline_months: typeof lead.timeline_months === "number" ? lead.timeline_months : null,
    }, now);
    for (const signal of signals) {
      items.push({
        id: `stalled-${leadId}-${signal.key}`,
        type: "stalled_lead",
        priority: signal.key === "unassigned_assignment_sla" ? 2 : 3,
        lead_id: leadId,
        lead_label: leadLabel(leadId),
        owner: owner(leadId),
        due_at: text(lead.created_at),
        status: text(lead.status) || "new",
        recommended_action: signal.nextAction,
      });
    }
  }

  for (const row of input.notifications || []) {
    const status = text(row.status);
    const leadId = text(row.lead_id);
    if (status !== "retry_scheduled" || !leadId) continue;
    items.push({
      id: `notification-${text(row.id) || leadId}`,
      type: "notification_retry",
      priority: 5,
      lead_id: leadId,
      lead_label: leadLabel(leadId),
      owner: owner(leadId, text(row.agent_id)),
      due_at: text(row.next_attempt_at),
      status,
      recommended_action: "Review notification retry state before manual retry",
    });
  }

  return items.sort((a, b) =>
    a.priority - b.priority ||
    (parseTime(a.due_at) || Number.MAX_SAFE_INTEGER) - (parseTime(b.due_at) || Number.MAX_SAFE_INTEGER) ||
    a.lead_label.localeCompare(b.lead_label) ||
    a.id.localeCompare(b.id),
  );
}

export async function loadAdminActionQueue(): Promise<AdminActionQueueResult> {
  const config = configured();
  const now = new Date();
  if (!config) return { configured: false, generatedAt: now.toISOString(), items: [] };

  const leadsUrl = new URL("/rest/v1/leads", config.supabaseUrl);
  leadsUrl.searchParams.set("select", "id,created_at,status,assigned_agent_id,assigned_at,last_contacted_at,lead_grade,timeline_months,address_raw,first_name,last_name");
  leadsUrl.searchParams.set("order", "created_at.desc");
  leadsUrl.searchParams.set("limit", "500");

  const appointmentsUrl = new URL("/rest/v1/lead_appointments", config.supabaseUrl);
  appointmentsUrl.searchParams.set("select", "*");
  appointmentsUrl.searchParams.set("order", "created_at.desc");
  appointmentsUrl.searchParams.set("limit", "500");

  const tasksUrl = new URL("/rest/v1/tasks", config.supabaseUrl);
  tasksUrl.searchParams.set("select", "*");
  tasksUrl.searchParams.set("category", "like.followup:%");
  tasksUrl.searchParams.set("order", "due_at.asc");
  tasksUrl.searchParams.set("limit", "500");

  const notificationsUrl = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
  notificationsUrl.searchParams.set("select", "id,lead_id,agent_id,status,next_attempt_at");
  notificationsUrl.searchParams.set("status", "eq.retry_scheduled");
  notificationsUrl.searchParams.set("limit", "100");

  const [leadsResponse, appointmentsResponse, tasksResponse, notificationsResponse] = await Promise.all([
    fetch(leadsUrl, { headers: buildHeaders(config.serviceKey), cache: "no-store" }),
    fetch(appointmentsUrl, { headers: buildHeaders(config.serviceKey), cache: "no-store" }),
    fetch(tasksUrl, { headers: buildHeaders(config.serviceKey), cache: "no-store" }),
    fetch(notificationsUrl, { headers: buildHeaders(config.serviceKey), cache: "no-store" }),
  ]);

  if (!leadsResponse.ok || !appointmentsResponse.ok || !tasksResponse.ok) {
    return {
      configured: true,
      generatedAt: now.toISOString(),
      items: [],
      error: "Action queue query failed",
    };
  }

  const leads = (await leadsResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const appointmentRows = (await appointmentsResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const taskRows = (await tasksResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const notificationRows = notificationsResponse.ok
    ? ((await notificationsResponse.json().catch(() => [])) as Array<Record<string, unknown>>)
    : [];

  return {
    configured: true,
    generatedAt: now.toISOString(),
    items: buildDailyActionQueue({
      leads,
      appointments: appointmentRows.map(normalizeAppointment).filter((row): row is AdminAppointmentRow => Boolean(row)),
      tasks: taskRows.map(normalizeTask).filter((row): row is AdminFollowupTaskRow => Boolean(row)),
      notifications: notificationRows,
      now,
    }),
  };
}

export { normalizeAppointment, normalizeTask };
