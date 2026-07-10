export type AdminAssignmentAuditAction = "assigned" | "reassigned" | "unassigned";

export type AdminAssignmentAuditEvent = {
  lead_id: string;
  previous_agent_id: string | null;
  new_agent_id: string | null;
  action: AdminAssignmentAuditAction;
  source: "admin_allocation";
  actor: string;
  assignment_status: string;
  action_route: string;
  created_at?: string;
  warning_flags?: string[];
};

export type AdminAssignmentAuditRecord = Omit<AdminAssignmentAuditEvent, "created_at"> & {
  id: string;
  created_at: string | null;
};

export type AdminAssignmentAuditResult =
  | { ok: true }
  | { ok: false; statusCode: number; error: string };

const AUDIT_ACTIONS: Record<AdminAssignmentAuditAction, string> = {
  assigned: "lead.assigned",
  reassigned: "lead.reassigned",
  unassigned: "lead.unassigned",
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function metadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function auditConfigured() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

export function buildAssignmentAuditPayload(event: AdminAssignmentAuditEvent) {
  return {
    actor: event.actor,
    action: AUDIT_ACTIONS[event.action],
    resource_type: "lead",
    resource_id: event.lead_id,
    before_state: {
      assigned_agent_id: event.previous_agent_id,
    },
    after_state: {
      assigned_agent_id: event.new_agent_id,
      assignment_status: event.assignment_status,
    },
    metadata: {
      source: event.source,
      assignment_action: event.action,
      action_route: event.action_route,
      warning_flags: event.warning_flags ?? [],
    },
  };
}

export function normalizeAssignmentAuditRow(row: Record<string, unknown>): AdminAssignmentAuditRecord {
  const beforeState = metadata(row.before_state);
  const afterState = metadata(row.after_state);
  const meta = metadata(row.metadata);
  const actionText = text(row.action);
  const action: AdminAssignmentAuditAction =
    actionText === "lead.reassigned"
      ? "reassigned"
      : actionText === "lead.unassigned"
        ? "unassigned"
        : "assigned";

  return {
    id: text(row.id) || "unknown",
    created_at: text(row.created_at),
    lead_id: text(row.resource_id) || "unknown",
    previous_agent_id: text(beforeState.assigned_agent_id),
    new_agent_id: text(afterState.assigned_agent_id),
    assignment_status: text(afterState.assignment_status) || "unknown",
    action,
    source: meta.source === "admin_allocation" ? "admin_allocation" : "admin_allocation",
    actor: text(row.actor) || "system/admin_basic_auth",
    action_route: text(meta.action_route) || "/admin/allocation",
    warning_flags: Array.isArray(meta.warning_flags)
      ? meta.warning_flags.filter((value): value is string => typeof value === "string")
      : [],
  };
}

export async function writeAssignmentAuditEvent(
  event: AdminAssignmentAuditEvent,
): Promise<AdminAssignmentAuditResult> {
  const config = auditConfigured();
  if (!config) {
    return { ok: false, statusCode: 503, error: "audit_store_not_configured" };
  }

  const url = new URL("/rest/v1/audit_logs", config.supabaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(buildAssignmentAuditPayload(event)),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin assignment audit write failed", {
      status: response.status,
      status_text: response.statusText,
      lead_id: event.lead_id,
      audit_action: event.action,
    });
    return { ok: false, statusCode: 500, error: "audit_write_failed" };
  }

  return { ok: true };
}

export async function loadRecentAssignmentAuditEvents(
  limit = 25,
): Promise<{ configured: boolean; events: AdminAssignmentAuditRecord[]; error?: string }> {
  const config = auditConfigured();
  if (!config) return { configured: false, events: [] };

  const cappedLimit = Math.max(1, Math.min(limit, 50));
  const url = new URL("/rest/v1/audit_logs", config.supabaseUrl);
  url.searchParams.set("select", "id,created_at,actor,action,resource_type,resource_id,before_state,after_state,metadata");
  url.searchParams.set("resource_type", "eq.lead");
  url.searchParams.set("action", "in.(lead.assigned,lead.reassigned,lead.unassigned)");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", String(cappedLimit));

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      configured: true,
      events: [],
      error: `Assignment audit query failed with ${response.status}`,
    };
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return { configured: true, events: rows.map(normalizeAssignmentAuditRow) };
}
