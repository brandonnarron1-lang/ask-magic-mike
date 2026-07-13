import { updateAdminLeadStatus } from "./adminLeadActions";
import { normalizeAppointment } from "./adminAppointmentFollowupOps";
import { assertDatabaseMutationAllowed } from "../../src/lib/preview-security";

export type PublicAppointmentRequestResult =
  | {
      ok: true;
      status: "requested" | "already_requested";
      appointment_id: string;
      appointment_status: string;
      followup_status: "created" | "existing" | "unavailable";
      warning?: "appointment_requested_audit_failed" | "appointment_requested_followup_failed";
    }
  | { ok: false; statusCode: number; error: string };

export const PUBLIC_APPOINTMENT_CONFIRMATION_FOLLOWUP_HOURS = 2;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_APPOINTMENT_STATUSES = ["requested", "scheduled", "confirmed", "reschedule_requested"];
const AUDIT_ACTOR = "public_appointment_request";

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

function buildHeaders(serviceKey: string, contentType = false) {
  return {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Cache-Control": "no-store",
    ...(contentType ? { "Content-Type": "application/json" } : {}),
  };
}

function sanitizeMetadataValue(value: string | null) {
  if (!value) return null;
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[redacted phone]")
    .slice(0, 120);
}

function followupDueAt(now: Date) {
  return new Date(now.getTime() + PUBLIC_APPOINTMENT_CONFIRMATION_FOLLOWUP_HOURS * 60 * 60 * 1000).toISOString();
}

async function readLead(input: { supabaseUrl: string; serviceKey: string; leadId: string }) {
  const url = new URL("/rest/v1/leads", input.supabaseUrl);
  url.searchParams.set("id", "eq." + input.leadId);
  url.searchParams.set("select", "id,session_id,widget_session_id,assigned_agent_id,status,source,source_detail,lead_type,page_url");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: buildHeaders(input.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false as const, error: "lead_lookup_failed" };
  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  return { ok: true as const, row: rows[0] || null };
}

async function readActiveAppointment(input: { supabaseUrl: string; serviceKey: string; leadId: string }) {
  const url = new URL("/rest/v1/lead_appointments", input.supabaseUrl);
  url.searchParams.set("lead_id", "eq." + input.leadId);
  url.searchParams.set("status", `in.(${ACTIVE_APPOINTMENT_STATUSES.join(",")})`);
  url.searchParams.set("select", "*");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: buildHeaders(input.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false as const, error: "appointment_lookup_failed" };
  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  return { ok: true as const, appointment: normalizeAppointment(rows[0] || {}) };
}

async function writeAudit(input: {
  supabaseUrl: string;
  serviceKey: string;
  leadId: string;
  appointmentId: string;
  sessionId: string;
  lead: Record<string, unknown>;
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
      action: "lead.appointment_requested_public",
      resource_type: "lead",
      resource_id: input.leadId,
      before_state: null,
      after_state: {
        appointment_id: input.appointmentId,
        status: "requested",
      },
      metadata: {
        source: "public_appointment_request",
        session_id: input.sessionId,
        lead_source: sanitizeMetadataValue(text(input.lead.source)),
        source_detail: sanitizeMetadataValue(text(input.lead.source_detail)),
        lead_type: sanitizeMetadataValue(text(input.lead.lead_type)),
      },
    }),
    cache: "no-store",
  });
  return response.ok;
}

async function ensureConfirmationFollowup(input: {
  supabaseUrl: string;
  serviceKey: string;
  leadId: string;
  agentId: string | null;
  dueAt: string;
}) {
  const readUrl = new URL("/rest/v1/tasks", input.supabaseUrl);
  readUrl.searchParams.set("lead_id", "eq." + input.leadId);
  readUrl.searchParams.set("category", "eq.followup:appointment_confirmation");
  readUrl.searchParams.set("status", "in.(open,in_progress)");
  readUrl.searchParams.set("select", "id,status");
  readUrl.searchParams.set("limit", "1");

  const readResponse = await fetch(readUrl, {
    headers: buildHeaders(input.serviceKey),
    cache: "no-store",
  });
  if (!readResponse.ok) return "unavailable" as const;
  const existingRows = (await readResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (existingRows.length) return "existing" as const;

  const writeUrl = new URL("/rest/v1/tasks", input.supabaseUrl);
  const writeResponse = await fetch(writeUrl, {
    method: "POST",
    headers: {
      ...buildHeaders(input.serviceKey, true),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      lead_id: input.leadId,
      agent_id: input.agentId,
      created_by: AUDIT_ACTOR,
      title: "Confirm appointment request",
      body: "Public appointment request received. Confirm time and details before marking scheduled.",
      due_at: input.dueAt,
      status: "open",
      priority: "high",
      category: "followup:appointment_confirmation",
    }),
    cache: "no-store",
  });
  if (writeResponse.ok) return "created" as const;
  if (writeResponse.status === 409) return "existing" as const;
  return "unavailable" as const;
}

export async function requestPublicAppointment(input: {
  leadId: string;
  sessionId: string;
  requestSurface?: string | null;
  now?: Date;
}): Promise<PublicAppointmentRequestResult> {
  if (!UUID.test(input.leadId)) return { ok: false, statusCode: 400, error: "invalid_lead_reference" };
  if (!UUID.test(input.sessionId)) return { ok: false, statusCode: 400, error: "invalid_session_reference" };

  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };

  const config = configured();
  if (!config) return { ok: false, statusCode: 503, error: "appointment_request_store_not_configured" };

  const lead = await readLead({ ...config, leadId: input.leadId });
  if (!lead.ok) return { ok: false, statusCode: 500, error: lead.error };
  if (!lead.row) return { ok: false, statusCode: 404, error: "appointment_request_not_found" };

  const sessionId = text(lead.row.session_id);
  const widgetSessionId = text(lead.row.widget_session_id);
  if (sessionId !== input.sessionId && widgetSessionId !== input.sessionId) {
    return { ok: false, statusCode: 404, error: "appointment_request_not_found" };
  }

  const existing = await readActiveAppointment({ ...config, leadId: input.leadId });
  if (!existing.ok) return { ok: false, statusCode: 500, error: existing.error };
  if (existing.appointment) {
    const followupStatus = await ensureConfirmationFollowup({
      ...config,
      leadId: input.leadId,
      agentId: text(lead.row.assigned_agent_id),
      dueAt: followupDueAt(input.now || new Date()),
    });
    return {
      ok: true,
      status: "already_requested",
      appointment_id: existing.appointment.id,
      appointment_status: existing.appointment.status,
      followup_status: followupStatus,
      warning: followupStatus === "unavailable" ? "appointment_requested_followup_failed" : undefined,
    };
  }

  const now = input.now || new Date();
  const appointmentUrl = new URL("/rest/v1/lead_appointments", config.supabaseUrl);
  appointmentUrl.searchParams.set("select", "*");
  const appointmentResponse = await fetch(appointmentUrl, {
    method: "POST",
    headers: {
      ...buildHeaders(config.serviceKey, true),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      lead_id: input.leadId,
      assigned_agent_id: text(lead.row.assigned_agent_id),
      status: "requested",
      requested_at: now.toISOString(),
      timezone: "America/New_York",
      location_type: "office",
      location_label: sanitizeMetadataValue(text(input.requestSurface)) || "Public appointment request",
      created_by: AUDIT_ACTOR,
    }),
    cache: "no-store",
  });

  if (!appointmentResponse.ok) {
    if (appointmentResponse.status === 409) {
      const raced = await readActiveAppointment({ ...config, leadId: input.leadId });
      if (raced.ok && raced.appointment) {
        return {
          ok: true,
          status: "already_requested",
          appointment_id: raced.appointment.id,
          appointment_status: raced.appointment.status,
          followup_status: "existing",
        };
      }
    }
    return { ok: false, statusCode: appointmentResponse.status, error: "appointment_request_create_failed" };
  }

  const rows = (await appointmentResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const appointment = normalizeAppointment(rows[0] || {});
  if (!appointment) return { ok: false, statusCode: 500, error: "appointment_request_response_invalid" };

  const lifecycle = await updateAdminLeadStatus(input.leadId, "appointment_requested", { now });
  const followupStatus = await ensureConfirmationFollowup({
    ...config,
    leadId: input.leadId,
    agentId: text(lead.row.assigned_agent_id),
    dueAt: followupDueAt(now),
  });
  const audited = await writeAudit({
    ...config,
    leadId: input.leadId,
    appointmentId: appointment.id,
    sessionId: input.sessionId,
    lead: lead.row,
  });

  return {
    ok: true,
    status: "requested",
    appointment_id: appointment.id,
    appointment_status: appointment.status,
    followup_status: followupStatus,
    warning:
      followupStatus === "unavailable"
        ? "appointment_requested_followup_failed"
        : lifecycle.ok && lifecycle.warning === "lifecycle_updated_audit_failed"
          ? "appointment_requested_audit_failed"
          : audited
            ? undefined
            : "appointment_requested_audit_failed",
  };
}
