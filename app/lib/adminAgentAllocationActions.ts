import { assertDatabaseMutationAllowed } from "../../src/lib/preview-security";
import type { AdminAssignmentAuditAction } from "./adminAssignmentAudit";
import {
  configuredNotificationMode,
  createDefaultPersistence,
} from "./persistence/defaultPersistence";
import { PersistenceUnavailableError } from "./persistence/contracts";

export type AdminAgentAssignmentResult =
  | { ok: true; action: AdminAssignmentAuditAction; warning?: string }
  | { ok: false; statusCode: number; error: string };

export type AdminAgentOperationsResult =
  | { ok: true; warning?: string }
  | { ok: false; statusCode: number; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIT_ACTOR = "system/admin_basic_auth";

function validUuid(value: string) {
  return UUID.test(value);
}

function unavailable(error: unknown, fallback: string): AdminAgentAssignmentResult {
  if (error instanceof PersistenceUnavailableError) {
    return { ok: false, statusCode: error.statusCode, error: fallback };
  }
  return { ok: false, statusCode: 500, error: fallback };
}

function statusForAssignmentError(error: string) {
  return error === "lead_not_found" || error === "agent_not_found" ? 404 : 409;
}

async function currentAssignment(leadId: string) {
  const persistence = createDefaultPersistence();
  if (!persistence) return null;
  const rows = await persistence.readAdminLeads({ leadId, limit: 1 });
  const row = rows[0];
  if (!row) return { found: false as const, agentId: null, status: null };
  return {
    found: true as const,
    agentId: typeof row.assigned_agent_id === "string" ? row.assigned_agent_id : null,
    status: typeof row.assignment_status === "string" ? row.assignment_status : null,
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
  const persistence = createDefaultPersistence();
  if (!persistence) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  try {
    const result = await persistence.mutateAdminAgentOperations({
      agentId: input.agentId,
      actor: AUDIT_ACTOR,
      patch: {
        is_active: input.isActive,
        max_daily_leads: input.maxDailyLeads,
        current_load: input.currentLoad,
        priority_score: input.priorityScore,
        notification_email: input.notificationEmail,
        notification_sms: input.notificationSms,
      },
    });
    return result.ok
      ? { ok: true }
      : { ok: false, statusCode: 404, error: result.error };
  } catch (error) {
    const result = unavailable(error, "agent_update_failed");
    return result.ok ? result : result;
  }
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
  const persistence = createDefaultPersistence();
  if (!persistence) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  try {
    const current = await currentAssignment(leadId);
    if (!current || !current.found) {
      return { ok: false, statusCode: 404, error: "lead_not_found" };
    }
    if (current.agentId === agentId && current.status === "assigned") {
      return { ok: true, action: "assigned", warning: "assignment_already_current" };
    }
    const action: AdminAssignmentAuditAction = current.agentId ? "reassigned" : "assigned";
    const result = await persistence.mutateAdminAssignment({
      leadId,
      agentId,
      expectedAgentId: current.agentId,
      action,
      notificationMode: configuredNotificationMode(),
      actor: AUDIT_ACTOR,
      occurredAt: new Date().toISOString(),
    });
    if (!result.ok) {
      return {
        ok: false,
        statusCode: statusForAssignmentError(result.error),
        error: result.error,
      };
    }
    if (result.idempotentReplay) {
      return { ok: true, action: result.action, warning: "assignment_already_current" };
    }
    if (result.notificationStatus === "skipped") {
      return { ok: true, action: result.action, warning: "agent_notifications_disabled" };
    }
    return { ok: true, action: result.action };
  } catch (error) {
    return unavailable(error, "assignment_update_failed");
  }
}

export async function unassignLead(leadId: string): Promise<AdminAgentAssignmentResult> {
  if (!validUuid(leadId)) {
    return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  }
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  }
  const persistence = createDefaultPersistence();
  if (!persistence) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  try {
    const current = await currentAssignment(leadId);
    if (!current || !current.found) {
      return { ok: false, statusCode: 404, error: "lead_not_found" };
    }
    if (!current.agentId && current.status === "unassigned") {
      return { ok: true, action: "unassigned", warning: "assignment_already_current" };
    }
    const result = await persistence.mutateAdminAssignment({
      leadId,
      agentId: null,
      expectedAgentId: current.agentId,
      action: "unassigned",
      notificationMode: "disabled",
      actor: AUDIT_ACTOR,
      occurredAt: new Date().toISOString(),
    });
    if (!result.ok) {
      return {
        ok: false,
        statusCode: statusForAssignmentError(result.error),
        error: result.error,
      };
    }
    return { ok: true, action: result.action };
  } catch (error) {
    return unavailable(error, "assignment_update_failed");
  }
}
