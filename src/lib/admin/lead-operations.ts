import { assertDatabaseMutationAllowed } from "../preview-security";
import {
  configuredNotificationMode,
  createDefaultPersistence,
} from "../../../app/lib/persistence/defaultPersistence";
import {
  PersistenceUnavailableError,
  type AdminLeadPatch,
  type AdminLeadPatchCommand,
} from "../../../app/lib/persistence/contracts";
import { ADMIN_LEAD_STATUSES } from "../../../app/lib/adminLeadLifecycle";

export { ADMIN_LEAD_STATUSES };
export type CanonicalAdminLeadPatch = AdminLeadPatchCommand;

type OperationFailure = { ok: false; statusCode: number; error: string };
type OperationSuccess<T> = { ok: true; value: T };
export type LeadOperationResult<T> = OperationSuccess<T> | OperationFailure;
type ConfiguredPersistence = NonNullable<ReturnType<typeof createDefaultPersistence>>;

function mutationFailure(): OperationFailure | null {
  const gate = assertDatabaseMutationAllowed();
  return gate.ok
    ? null
    : { ok: false, statusCode: gate.statusCode, error: gate.error };
}

function persistenceFailure(error: unknown, publicError: string): OperationFailure {
  return {
    ok: false,
    statusCode: error instanceof PersistenceUnavailableError
      ? error.statusCode
      : 500,
    error: publicError,
  };
}

function configuredPersistence():
  | ConfiguredPersistence
  | OperationFailure {
  const persistence = createDefaultPersistence();
  return persistence || {
    ok: false,
    statusCode: 503,
    error: "lead_store_not_configured",
  };
}

function isFailure(
  value: ReturnType<typeof configuredPersistence>,
): value is OperationFailure {
  return "ok" in value && value.ok === false;
}

export async function patchCanonicalAdminLead(input: {
  leadId: string;
  patch: AdminLeadPatchCommand;
  actor: string;
}): Promise<LeadOperationResult<{
  leadId: string;
  auditId: string;
  updatedAt: string;
  patch: AdminLeadPatch;
}>> {
  const blocked = mutationFailure();
  if (blocked) return blocked;
  const persistence = configuredPersistence();
  if (isFailure(persistence)) return persistence;

  try {
    const result = await persistence.patchAdminLead({
      leadId: input.leadId,
      patch: input.patch,
      actor: input.actor,
      occurredAt: new Date().toISOString(),
    });
    if (!result.ok) {
      return {
        ok: false,
        statusCode: result.error === "lead_not_found" ? 404 : 400,
        error: result.error,
      };
    }
    return { ok: true, value: result };
  } catch (error) {
    return persistenceFailure(error, "lead_update_failed");
  }
}

export async function assignCanonicalAdminLead(input: {
  leadId: string;
  agentId: string;
  reason?: string | null;
  actor: string;
}): Promise<LeadOperationResult<{
  action: "assigned" | "reassigned" | "unassigned";
  auditId?: string | null;
  notificationId?: string | null;
  notificationStatus?: string | null;
  idempotentReplay: boolean;
}>> {
  const blocked = mutationFailure();
  if (blocked) return blocked;
  const persistence = configuredPersistence();
  if (isFailure(persistence)) return persistence;

  try {
    const rows = await persistence.readAdminLeads({ leadId: input.leadId, limit: 1 });
    const current = rows[0];
    if (!current) {
      return { ok: false, statusCode: 404, error: "lead_not_found" };
    }
    const expectedAgentId = typeof current.assigned_agent_id === "string"
      ? current.assigned_agent_id
      : null;
    const action = expectedAgentId && expectedAgentId !== input.agentId
      ? "reassigned"
      : "assigned";
    const result = await persistence.mutateAdminAssignment({
      leadId: input.leadId,
      agentId: input.agentId,
      expectedAgentId,
      action,
      reason: input.reason || "manual_admin_assignment",
      notificationMode: configuredNotificationMode(),
      actor: input.actor,
      occurredAt: new Date().toISOString(),
    });
    if (!result.ok) {
      const statusCode = result.error === "lead_not_found" || result.error === "agent_not_found"
        ? 404
        : result.error === "invalid_assignment_action"
          ? 400
          : 409;
      return { ok: false, statusCode, error: result.error };
    }
    return { ok: true, value: result };
  } catch (error) {
    return persistenceFailure(error, "assignment_failed");
  }
}

export async function addCanonicalAdminLeadNote(input: {
  leadId: string;
  content: string;
  agentId?: string | null;
  actor: string;
}): Promise<LeadOperationResult<{
  messageId: string;
  auditId: string;
  createdAt: string;
}>> {
  const blocked = mutationFailure();
  if (blocked) return blocked;
  const persistence = configuredPersistence();
  if (isFailure(persistence)) return persistence;

  try {
    const result = await persistence.addAdminLeadNote({
      leadId: input.leadId,
      content: input.content,
      agentId: input.agentId || null,
      actor: input.actor,
      occurredAt: new Date().toISOString(),
    });
    if (!result.ok) {
      return {
        ok: false,
        statusCode: result.error === "invalid_note" ? 400 : 404,
        error: result.error,
      };
    }
    return { ok: true, value: result };
  } catch (error) {
    return persistenceFailure(error, "note_save_failed");
  }
}

export async function createCanonicalAdminLeadTask(input: {
  leadId: string;
  title: string;
  body?: string | null;
  dueAt?: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  category?: string | null;
  agentId?: string | null;
  actor: string;
}): Promise<LeadOperationResult<{
  taskId: string;
  auditId: string;
  createdAt: string;
}>> {
  const blocked = mutationFailure();
  if (blocked) return blocked;
  const persistence = configuredPersistence();
  if (isFailure(persistence)) return persistence;

  try {
    const result = await persistence.createAdminLeadTask({
      leadId: input.leadId,
      title: input.title,
      body: input.body || null,
      dueAt: input.dueAt || null,
      priority: input.priority,
      category: input.category || null,
      agentId: input.agentId || null,
      actor: input.actor,
      occurredAt: new Date().toISOString(),
    });
    if (!result.ok) {
      return {
        ok: false,
        statusCode: result.error === "invalid_task" ? 400 : 404,
        error: result.error,
      };
    }
    return { ok: true, value: result };
  } catch (error) {
    return persistenceFailure(error, "task_save_failed");
  }
}
