import {
  ADMIN_LEAD_STATUS_ACTIONS,
  ADMIN_LEAD_STATUSES,
  buildLeadLifecyclePatch,
  type AdminLeadStatus,
  isAdminLeadStatus,
  isAllowedLeadTransition,
  type LeadTerminalReason,
  validateTerminalReasonForStatus,
} from "./adminLeadLifecycle";

export {
  ADMIN_LEAD_STATUS_ACTIONS,
  ADMIN_LEAD_STATUSES,
  type AdminLeadStatus,
  isAdminLeadStatus,
  statusActionFor,
} from "./adminLeadLifecycle";

export type AdminLeadStatusUpdateResult =
  | { ok: true; status: AdminLeadStatus; warning?: string }
  | { ok: false; statusCode: number; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIT_ACTOR = "system/admin_basic_auth";
const ACTION_ROUTE = "/admin/leads";

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

async function writeLifecycleAuditEvent(input: {
  leadId: string;
  previousStatus: AdminLeadStatus;
  nextStatus: AdminLeadStatus;
  reason: LeadTerminalReason | null;
  occurredAt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = configured();
  if (!config) return { ok: false, error: "audit_store_not_configured" };

  const url = new URL("/rest/v1/audit_logs", config.supabaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      actor: AUDIT_ACTOR,
      action: "lead.lifecycle_changed",
      resource_type: "lead",
      resource_id: input.leadId,
      before_state: { status: input.previousStatus },
      after_state: {
        status: input.nextStatus,
        reason: input.reason,
      },
      metadata: {
        source: "admin_leads",
        action_route: ACTION_ROUTE,
        occurred_at: input.occurredAt,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin lead lifecycle audit write failed", {
      status: response.status,
      status_text: response.statusText,
      lead_id: input.leadId,
      requested_status: input.nextStatus,
    });
    return { ok: false, error: "audit_write_failed" };
  }
  return { ok: true };
}

export async function updateAdminLeadStatus(
  leadId: string,
  status: string,
  options: { reason?: string | null; now?: Date } = {},
): Promise<AdminLeadStatusUpdateResult> {
  if (!UUID.test(leadId)) {
    return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  }

  if (!isAdminLeadStatus(status)) {
    return { ok: false, statusCode: 400, error: "invalid_status" };
  }

  const reasonValidation = validateTerminalReasonForStatus(status, options.reason || null);
  if (!reasonValidation.ok) {
    return { ok: false, statusCode: 400, error: reasonValidation.error };
  }
  const reason: LeadTerminalReason | null = reasonValidation.reason;
  const config = configured();
  if (!config) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  const preflightUrl = new URL("/rest/v1/leads", config.supabaseUrl);
  preflightUrl.searchParams.set("id", "eq." + leadId);
  preflightUrl.searchParams.set("select", "id,status");
  preflightUrl.searchParams.set("limit", "1");

  const preflightResponse = await fetch(preflightUrl, {
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!preflightResponse.ok) {
    return { ok: false, statusCode: 500, error: "status_preflight_failed" };
  }

  const preflightRows = (await preflightResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const currentRow = preflightRows[0];
  if (!currentRow) {
    return { ok: false, statusCode: 404, error: "lead_not_found" };
  }

  const currentStatusText = text(currentRow.status) || "new";
  if (!isAdminLeadStatus(currentStatusText)) {
    return { ok: false, statusCode: 409, error: "invalid_current_status" };
  }
  if (currentStatusText === status) {
    return { ok: true, status, warning: "status_already_current" };
  }
  if (!isAllowedLeadTransition(currentStatusText, status)) {
    return { ok: false, statusCode: 409, error: "forbidden_transition" };
  }

  const nowIso = (options.now || new Date()).toISOString();
  const url = new URL("/rest/v1/leads", config.supabaseUrl);
  url.searchParams.set("id", "eq." + leadId);
  url.searchParams.set("status", "eq." + currentStatusText);
  url.searchParams.set("select", "id,status");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(buildLeadLifecyclePatch(status, { nowIso, reason })),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin lead status update failed", {
      status: response.status,
      status_text: response.statusText,
      lead_id: leadId,
      requested_status: status,
    });
    return { ok: false, statusCode: 500, error: "status_update_failed" };
  }

  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!rows.length) {
    return { ok: false, statusCode: 409, error: "concurrent_status_update" };
  }

  const audit = await writeLifecycleAuditEvent({
    leadId,
    previousStatus: currentStatusText,
    nextStatus: status,
    reason,
    occurredAt: nowIso,
  });
  if (!audit.ok) {
    return { ok: true, status, warning: "lifecycle_updated_audit_failed" };
  }

  return { ok: true, status };
}
