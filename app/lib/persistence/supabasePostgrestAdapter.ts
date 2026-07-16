import type {
  ActivePersistenceBoundary,
  AdminAgentOperationsMutation,
  AdminAgentOperationsMutationResult,
  AdminAssignmentMutation,
  AdminAssignmentMutationResult,
  AdminLeadMutation,
  AdminLeadMutationResult,
  AdminLeadReadRequest,
  AppointmentIntent,
  AppointmentIntentResult,
  LeadLifecycleCapture,
  LeadLifecycleCaptureResult,
  LeadLifecycleCaptureSuccess,
  PersistenceFetch,
  ReportingReadRequest,
} from "./contracts";
import { PersistenceUnavailableError } from "./contracts";

type SupabasePostgrestAdapterConfig = {
  baseUrl: string;
  serviceRoleKey: string;
  fetch?: PersistenceFetch;
};

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object" && !Array.isArray(row),
      )
    : [];
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value) {
    throw new PersistenceUnavailableError(`persistence_response_missing_${field}`, 502);
  }
  return value;
}

/**
 * The only active root-runtime module that knows PostgREST URLs, authorization
 * headers, query operators, RPC naming, or response conventions.
 */
export class SupabasePostgrestAdapter implements ActivePersistenceBoundary {
  private readonly request: PersistenceFetch;

  constructor(private readonly config: SupabasePostgrestAdapterConfig) {
    this.request = config.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private headers(contentType = false) {
    return {
      apikey: this.config.serviceRoleKey,
      Authorization: `Bearer ${this.config.serviceRoleKey}`,
      "Cache-Control": "no-store",
      ...(contentType ? { "Content-Type": "application/json" } : {}),
    };
  }

  private url(path: string) {
    return new URL(path, this.config.baseUrl);
  }

  private async rpc(name: string, body: Record<string, unknown>) {
    const response = await this.request(this.url(`/rest/v1/rpc/${name}`), {
      method: "POST",
      headers: this.headers(true),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new PersistenceUnavailableError(`${name}_failed`, response.status || 500);
    }
    const value = await response.json().catch(() => null);
    const result = object(value);
    if (!result) {
      throw new PersistenceUnavailableError(`${name}_response_invalid`, 502);
    }
    return result;
  }

  async captureLeadLifecycle(
    input: LeadLifecycleCapture,
  ): Promise<LeadLifecycleCaptureResult> {
    const result = await this.rpc("capture_public_lead_v1", {
      p_session: input.session,
      p_lead: input.lead,
      p_attribution: input.attribution,
      p_notification_mode: input.notificationMode,
    });
    if (result.ok === false) {
      const error =
        result.error === "identity_conflict" ||
        result.error === "idempotency_conflict"
          ? result.error
          : "idempotency_conflict";
      return {
        ok: false,
        error,
        session_id: typeof result.session_id === "string" ? result.session_id : null,
        idempotent_replay: false,
      };
    }
    return {
      ok: true,
      lead_id: requiredString(result.lead_id, "lead_id"),
      session_id: requiredString(result.session_id, "session_id"),
      widget_session_id: requiredString(
        result.widget_session_id ?? result.session_id,
        "widget_session_id",
      ),
      contact_id: typeof result.contact_id === "string" ? result.contact_id : null,
      duplicate_of_lead_id:
        typeof result.duplicate_of_lead_id === "string"
          ? result.duplicate_of_lead_id
          : null,
      assigned_agent_id:
        typeof result.assigned_agent_id === "string"
          ? result.assigned_agent_id
          : null,
      assignment_status:
        typeof result.assignment_status === "string"
          ? (result.assignment_status as LeadLifecycleCaptureSuccess["assignment_status"])
          : "unassigned",
      capture_audit_id:
        typeof result.capture_audit_id === "string" ? result.capture_audit_id : null,
      assignment_audit_id:
        typeof result.assignment_audit_id === "string"
          ? result.assignment_audit_id
          : null,
      notification_id:
        typeof result.notification_id === "string" ? result.notification_id : null,
      notification_status:
        typeof result.notification_status === "string"
          ? result.notification_status
          : null,
      idempotent_replay: result.idempotent_replay === true,
    };
  }

  async requestAppointment(
    input: AppointmentIntent,
  ): Promise<AppointmentIntentResult> {
    const result = await this.rpc("request_public_appointment_v1", {
      p_lead_id: input.leadId,
      p_session_id: input.sessionId,
      p_request_surface: input.requestSurface || null,
      p_requested_at: input.requestedAt,
    });
    if (result.ok !== true) {
      return { ok: false, error: "appointment_request_not_found" };
    }
    return {
      ok: true,
      status:
        result.status === "already_requested" ? "already_requested" : "requested",
      appointment_id: requiredString(result.appointment_id, "appointment_id"),
      appointment_status: requiredString(
        result.appointment_status,
        "appointment_status",
      ),
      followup_status: result.followup_status === "created" ? "created" : "existing",
      audit_id: typeof result.audit_id === "string" ? result.audit_id : null,
    };
  }

  async readAdminLeads(input: AdminLeadReadRequest) {
    const url = this.url("/rest/v1/leads");
    url.searchParams.set("select", "*");
    if (input.leadId) url.searchParams.set("id", `eq.${input.leadId}`);
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", String(Math.max(1, Math.min(input.limit ?? 100, 500))));
    const response = await this.request(url, {
      headers: this.headers(),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new PersistenceUnavailableError("admin_lead_read_failed", response.status || 500);
    }
    return rows(await response.json().catch(() => []));
  }

  async mutateAdminLead(input: AdminLeadMutation): Promise<AdminLeadMutationResult> {
    const result = await this.rpc("mutate_admin_lead_status_v1", {
      p_lead_id: input.leadId,
      p_expected_status: input.expectedStatus,
      p_next_status: input.nextStatus,
      p_patch: input.patch,
      p_reason: input.reason || null,
      p_actor: input.actor,
      p_occurred_at: input.occurredAt,
    });
    if (result.ok !== true) {
      return {
        ok: false,
        error:
          result.error === "lead_not_found"
            ? "lead_not_found"
            : "concurrent_status_update",
      };
    }
    return {
      ok: true,
      status: requiredString(result.status, "status"),
      auditId: typeof result.audit_id === "string" ? result.audit_id : null,
      idempotentReplay: result.idempotent_replay === true,
    };
  }

  async mutateAdminAssignment(
    input: AdminAssignmentMutation,
  ): Promise<AdminAssignmentMutationResult> {
    const result = await this.rpc("mutate_admin_assignment_v1", {
      p_lead_id: input.leadId,
      p_agent_id: input.agentId,
      p_expected_agent_id: input.expectedAgentId,
      p_action: input.action,
      p_notification_mode: input.notificationMode,
      p_actor: input.actor,
      p_occurred_at: input.occurredAt,
    });
    if (result.ok !== true) {
      const allowed = new Set([
        "lead_not_found",
        "agent_not_found",
        "agent_inactive",
        "agent_at_capacity",
        "assignment_conflict",
        "invalid_assignment_action",
      ]);
      return {
        ok: false,
        error: (allowed.has(String(result.error))
          ? result.error
          : "assignment_conflict") as Extract<
          AdminAssignmentMutationResult,
          { ok: false }
        >["error"],
      };
    }
    const action =
      result.action === "reassigned" || result.action === "unassigned"
        ? result.action
        : "assigned";
    return {
      ok: true,
      action,
      auditId: typeof result.audit_id === "string" ? result.audit_id : null,
      notificationId:
        typeof result.notification_id === "string" ? result.notification_id : null,
      notificationStatus:
        typeof result.notification_status === "string"
          ? result.notification_status
          : null,
      idempotentReplay: result.idempotent_replay === true,
    };
  }

  async mutateAdminAgentOperations(
    input: AdminAgentOperationsMutation,
  ): Promise<AdminAgentOperationsMutationResult> {
    const result = await this.rpc("mutate_admin_agent_operations_v1", {
      p_agent_id: input.agentId,
      p_patch: input.patch,
      p_actor: input.actor,
    });
    if (result.ok !== true) return { ok: false, error: "agent_not_found" };
    return {
      ok: true,
      auditId: typeof result.audit_id === "string" ? result.audit_id : null,
    };
  }

  async readReportingRows(input: ReportingReadRequest) {
    const url = this.url("/rest/v1/leads");
    url.searchParams.set("select", "*");
    if (input.since) url.searchParams.set("created_at", `gte.${input.since}`);
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", String(Math.max(1, Math.min(input.limit ?? 1000, 5000))));
    const response = await this.request(url, {
      headers: this.headers(),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new PersistenceUnavailableError("reporting_read_failed", response.status || 500);
    }
    return rows(await response.json().catch(() => []));
  }
}
