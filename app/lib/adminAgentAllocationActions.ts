import {
  type AdminAssignmentAuditAction,
  writeAssignmentAuditEvent,
} from "./adminAssignmentAudit";

export type AdminAgentAssignmentResult =
  | { ok: true; action: AdminAssignmentAuditAction; warning?: string }
  | { ok: false; statusCode: number; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIT_ACTOR = "system/admin_basic_auth";
const ACTION_ROUTE = "/admin/allocation";

function validUuid(value: string) {
  return UUID.test(value);
}

function configured() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

async function patchLeadAssignment(
  leadId: string,
  previousAgentId: string | null,
  body: Record<string, unknown>,
  action: AdminAssignmentAuditAction,
): Promise<AdminAgentAssignmentResult> {
  const config = configured();
  if (!config) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  const newAgentId = typeof body.assigned_agent_id === "string" ? body.assigned_agent_id : null;
  const url = new URL("/rest/v1/leads", config.supabaseUrl);
  url.searchParams.set("id", "eq." + leadId);
  url.searchParams.set("select", "id,assigned_agent_id,assignment_status");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin agent assignment update failed", {
      status: response.status,
      status_text: response.statusText,
      lead_id: leadId,
      action,
    });
    return { ok: false, statusCode: 500, error: "assignment_update_failed" };
  }

  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!rows.length) {
    return { ok: false, statusCode: 404, error: "lead_not_found" };
  }

  const auditResult = await writeAssignmentAuditEvent({
    lead_id: leadId,
    previous_agent_id: previousAgentId,
    new_agent_id: newAgentId,
    action,
    source: "admin_allocation",
    actor: AUDIT_ACTOR,
    assignment_status: typeof body.assignment_status === "string" ? body.assignment_status : "unknown",
    action_route: ACTION_ROUTE,
  });

  if (!auditResult.ok) {
    return { ok: true, action, warning: auditResult.error };
  }

  return { ok: true, action };
}

async function loadCurrentLeadAssignment(leadId: string): Promise<
  | { ok: true; assigned_agent_id: string | null; assignment_status: string | null }
  | { ok: false; statusCode: number; error: string }
> {
  const config = configured();
  if (!config) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  const url = new URL("/rest/v1/leads", config.supabaseUrl);
  url.searchParams.set("id", "eq." + leadId);
  url.searchParams.set("select", "id,assigned_agent_id,assignment_status");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin agent assignment preflight failed", {
      status: response.status,
      status_text: response.statusText,
      lead_id: leadId,
    });
    return { ok: false, statusCode: 500, error: "assignment_preflight_failed" };
  }

  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) {
    return { ok: false, statusCode: 404, error: "lead_not_found" };
  }

  return {
    ok: true,
    assigned_agent_id: typeof row.assigned_agent_id === "string" ? row.assigned_agent_id : null,
    assignment_status: typeof row.assignment_status === "string" ? row.assignment_status : null,
  };
}

export async function assignLeadToAgent(
  leadId: string,
  agentId: string,
): Promise<AdminAgentAssignmentResult> {
  if (!validUuid(leadId)) {
    return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  }
  if (!validUuid(agentId)) {
    return { ok: false, statusCode: 400, error: "invalid_agent_id" };
  }

  const current = await loadCurrentLeadAssignment(leadId);
  if (!current.ok) return current;
  const action: AdminAssignmentAuditAction = current.assigned_agent_id ? "reassigned" : "assigned";

  return patchLeadAssignment(
    leadId,
    current.assigned_agent_id,
    {
      assigned_agent_id: agentId,
      assigned_at: new Date().toISOString(),
      assignment_status: "assigned",
    },
    action,
  );
}

export async function unassignLead(leadId: string): Promise<AdminAgentAssignmentResult> {
  if (!validUuid(leadId)) {
    return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  }

  const current = await loadCurrentLeadAssignment(leadId);
  if (!current.ok) return current;

  return patchLeadAssignment(
    leadId,
    current.assigned_agent_id,
    {
      assigned_agent_id: null,
      assigned_at: null,
      assignment_status: "unassigned",
    },
    "unassigned",
  );
}
