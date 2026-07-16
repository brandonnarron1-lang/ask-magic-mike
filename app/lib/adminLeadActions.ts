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
import { assertDatabaseMutationAllowed } from "../../src/lib/preview-security";
import { createDefaultPersistence } from "./persistence/defaultPersistence";
import { PersistenceUnavailableError } from "./persistence/contracts";

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

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
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
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  }
  const persistence = createDefaultPersistence();
  if (!persistence) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  try {
    const rows = await persistence.readAdminLeads({ leadId, limit: 1 });
    const currentRow = rows[0];
    if (!currentRow) {
      return { ok: false, statusCode: 404, error: "lead_not_found" };
    }
    const currentStatusText = text(currentRow.status) || "new";
    if (!isAdminLeadStatus(currentStatusText)) {
      return { ok: false, statusCode: 409, error: "invalid_current_status" };
    }
    const reasonValidation = validateTerminalReasonForStatus(status, options.reason || null);
    if (!reasonValidation.ok) {
      return { ok: false, statusCode: 400, error: reasonValidation.error };
    }
    const reason: LeadTerminalReason | null = reasonValidation.reason;
    if (!isAllowedLeadTransition(currentStatusText, status)) {
      return { ok: false, statusCode: 409, error: "forbidden_transition" };
    }

    const nowIso = (options.now || new Date()).toISOString();
    const result = await persistence.mutateAdminLead({
      leadId,
      expectedStatus: currentStatusText,
      nextStatus: status,
      patch: buildLeadLifecyclePatch(status, { nowIso, reason }),
      actor: AUDIT_ACTOR,
      reason,
      occurredAt: nowIso,
    });
    if (!result.ok) {
      return {
        ok: false,
        statusCode: result.error === "lead_not_found" ? 404 : 409,
        error: result.error,
      };
    }
    return result.idempotentReplay
      ? { ok: true, status, warning: "status_already_current" }
      : { ok: true, status };
  } catch (error) {
    if (error instanceof PersistenceUnavailableError) {
      return {
        ok: false,
        statusCode: error.statusCode,
        error: "status_update_failed",
      };
    }
    return { ok: false, statusCode: 500, error: "status_update_failed" };
  }
}
