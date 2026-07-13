import {
  type AdminAssignmentAuditAction,
  writeAssignmentAuditEvent,
} from "./adminAssignmentAudit";
import {
  loadAgentForNotification,
  loadLeadForNotification,
} from "./leadNotificationRepository";
import { createAssignmentNotification } from "./leadNotificationService";
import { assertDatabaseMutationAllowed } from "../../src/lib/preview-security";

export type AdminAgentAssignmentResult =
  | { ok: true; action: AdminAssignmentAuditAction; warning?: string }
  | { ok: false; statusCode: number; error: string };

export type AdminAgentOperationsResult =
  | { ok: true; warning?: string }
  | { ok: false; statusCode: number; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIT_ACTOR = "system/admin_basic_auth";
const ACTION_ROUTE = "/admin/allocation";
const ACTIVE_LEAD_STATUS_FILTER = "in.(new,scored,assigned,contacted,qualified,appointment_requested,appointment_set,nurture,escalated)";

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
  url.searchParams.set(
    "assigned_agent_id",
    previousAgentId ? "eq." + previousAgentId : "is.null",
  );

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
    return { ok: false, statusCode: 409, error: "assignment_conflict" };
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

  if (action === "assigned" || action === "reassigned") {
    const [lead, agent] = await Promise.all([
      loadLeadForNotification(leadId),
      newAgentId ? loadAgentForNotification(newAgentId) : Promise.resolve(null),
    ]);

    if (!lead || !agent) {
      return { ok: true, action, warning: "notification_context_missing" };
    }

    const notificationResult = await createAssignmentNotification({
      lead,
      agent,
      assignmentAuditId: auditResult.id || null,
      assignmentEventAt: auditResult.created_at || null,
      assignmentRoute: ACTION_ROUTE,
      actor: AUDIT_ACTOR,
      action,
    });

    if (!notificationResult.ok) {
      return { ok: true, action, warning: notificationResult.error };
    }
    if (notificationResult.warning) {
      return { ok: true, action, warning: notificationResult.warning };
    }
  }

  return { ok: true, action };
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "on", "yes"].includes(normalized)) return true;
    if (["false", "0", "off", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function numberInRange(value: unknown, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

async function writeAgentOperationAuditEvent(
  agentId: string,
  beforeState: Record<string, unknown>,
  afterState: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
      action: "agent.operations_updated",
      resource_type: "agent",
      resource_id: agentId,
      before_state: beforeState,
      after_state: afterState,
      metadata: {
        source: "admin_allocation",
        action_route: ACTION_ROUTE,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin agent operations audit write failed", {
      status: response.status,
      status_text: response.statusText,
      agent_id: agentId,
    });
    return { ok: false, error: "audit_write_failed" };
  }
  return { ok: true };
}

type AgentEligibility = {
  id: string;
  is_active: boolean;
  max_daily_leads: number | null;
  activeAssignedLeadCount: number;
};

async function loadAgentEligibility(agentId: string): Promise<
  | { ok: true; agent: AgentEligibility }
  | { ok: false; statusCode: number; error: string }
> {
  const config = configured();
  if (!config) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  const agentUrl = new URL("/rest/v1/agents", config.supabaseUrl);
  agentUrl.searchParams.set("id", "eq." + agentId);
  agentUrl.searchParams.set("select", "id,is_active,max_daily_leads");
  agentUrl.searchParams.set("limit", "1");

  const agentResponse = await fetch(agentUrl, {
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!agentResponse.ok) {
    return { ok: false, statusCode: 500, error: "agent_preflight_failed" };
  }

  const agentRows = (await agentResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const agentRow = agentRows[0];
  if (!agentRow) {
    return { ok: false, statusCode: 404, error: "agent_not_found" };
  }

  const activeLeadUrl = new URL("/rest/v1/leads", config.supabaseUrl);
  activeLeadUrl.searchParams.set("assigned_agent_id", "eq." + agentId);
  activeLeadUrl.searchParams.set("status", ACTIVE_LEAD_STATUS_FILTER);
  activeLeadUrl.searchParams.set("select", "id");
  activeLeadUrl.searchParams.set("limit", "200");

  const activeLeadResponse = await fetch(activeLeadUrl, {
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!activeLeadResponse.ok) {
    return { ok: false, statusCode: 500, error: "agent_load_preflight_failed" };
  }

  const activeLeadRows = (await activeLeadResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const maxDailyLeads = numberInRange(agentRow.max_daily_leads, 0, 999);
  return {
    ok: true,
    agent: {
      id: agentId,
      is_active: bool(agentRow.is_active, true),
      max_daily_leads: maxDailyLeads,
      activeAssignedLeadCount: activeLeadRows.length,
    },
  };
}

export async function updateAgentOperations(input: {
  agentId: string;
  isActive: boolean;
  maxDailyLeads: number;
  currentLoad: number;
  priorityScore: number;
  notificationEmail: boolean;
  notificationSms: boolean;
}): Promise<AdminAgentOperationsResult> {
  if (!validUuid(input.agentId)) {
    return { ok: false, statusCode: 400, error: "invalid_agent_id" };
  }

  if (
    !Number.isInteger(input.maxDailyLeads) ||
    input.maxDailyLeads < 0 ||
    input.maxDailyLeads > 999 ||
    !Number.isInteger(input.currentLoad) ||
    input.currentLoad < 0 ||
    input.currentLoad > 999 ||
    !Number.isInteger(input.priorityScore) ||
    input.priorityScore < 0 ||
    input.priorityScore > 100
  ) {
    return { ok: false, statusCode: 400, error: "invalid_agent_operations" };
  }

  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  }

  const config = configured();
  if (!config) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  const preflightUrl = new URL("/rest/v1/agents", config.supabaseUrl);
  preflightUrl.searchParams.set("id", "eq." + input.agentId);
  preflightUrl.searchParams.set("select", "id,is_active,max_daily_leads,current_load,priority_score,notification_email,notification_sms");
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
    return { ok: false, statusCode: 500, error: "agent_preflight_failed" };
  }

  const rows = (await preflightResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const beforeState = rows[0];
  if (!beforeState) {
    return { ok: false, statusCode: 404, error: "agent_not_found" };
  }

  const afterState = {
    is_active: input.isActive,
    max_daily_leads: input.maxDailyLeads,
    current_load: input.currentLoad,
    priority_score: input.priorityScore,
    notification_email: input.notificationEmail,
    notification_sms: input.notificationSms,
  };

  const patchUrl = new URL("/rest/v1/agents", config.supabaseUrl);
  patchUrl.searchParams.set("id", "eq." + input.agentId);
  patchUrl.searchParams.set("select", "id");

  const patchResponse = await fetch(patchUrl, {
    method: "PATCH",
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(afterState),
    cache: "no-store",
  });

  if (!patchResponse.ok) {
    console.error("Admin agent operations update failed", {
      status: patchResponse.status,
      status_text: patchResponse.statusText,
      agent_id: input.agentId,
    });
    return { ok: false, statusCode: 500, error: "agent_update_failed" };
  }

  const patchRows = (await patchResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!patchRows.length) {
    return { ok: false, statusCode: 404, error: "agent_not_found" };
  }

  const audit = await writeAgentOperationAuditEvent(input.agentId, beforeState, afterState);
  if (!audit.ok) {
    return { ok: true, warning: audit.error };
  }

  return { ok: true };
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

  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  }

  const current = await loadCurrentLeadAssignment(leadId);
  if (!current.ok) return current;
  if (current.assigned_agent_id === agentId && current.assignment_status === "assigned") {
    return { ok: true, action: "assigned", warning: "assignment_already_current" };
  }

  const eligibility = await loadAgentEligibility(agentId);
  if (!eligibility.ok) return eligibility;
  if (!eligibility.agent.is_active) {
    return { ok: false, statusCode: 409, error: "agent_inactive" };
  }
  if (
    eligibility.agent.max_daily_leads !== null &&
    eligibility.agent.activeAssignedLeadCount >= eligibility.agent.max_daily_leads
  ) {
    return { ok: false, statusCode: 409, error: "agent_at_capacity" };
  }

  const action: AdminAssignmentAuditAction =
    current.assigned_agent_id && current.assigned_agent_id !== agentId ? "reassigned" : "assigned";

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

  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
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
