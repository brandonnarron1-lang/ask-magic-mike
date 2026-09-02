import type {
  ActivePersistenceBoundary,
  AdminAgentOperationsMutation,
  AdminAgentOperationsMutationResult,
  AdminAssignmentMutation,
  AdminAssignmentMutationResult,
  AdminFirstResponseMutation,
  AdminFirstResponseMutationResult,
  AdminLeadNoteMutation,
  AdminLeadNoteMutationResult,
  AdminLeadPatchMutation,
  AdminLeadPatchMutationResult,
  AdminLeadMutation,
  AdminLeadMutationResult,
  AdminLeadReadRequest,
  AdminLeadTaskMutation,
  AdminLeadTaskMutationResult,
  AppointmentIntent,
  AppointmentIntentResult,
  LeadLifecycleCapture,
  LeadLifecycleCaptureResult,
  LeadLifecycleCaptureSuccess,
  LeadLifecycleEnrichment,
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
    const result = await this.rpc("capture_public_lead_v2", {
      p_session: input.session,
      p_lead: input.lead,
      p_attribution: input.attribution,
      p_notification_mode: input.notificationMode,
      p_internal_notification: {
        template_version: input.internalNotification.templateVersion,
        metadata: input.internalNotification.metadata,
      },
    });
    if (result.ok === false) {
      if (
        result.error !== "identity_conflict" &&
        result.error !== "idempotency_conflict"
      ) {
        throw new PersistenceUnavailableError(
          "capture_public_lead_v2_domain_failure",
          502,
        );
      }
      return {
        ok: false,
        error: result.error,
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

  async enrichLeadRecord(input: LeadLifecycleEnrichment): Promise<void> {
    const leadUrl = this.url("/rest/v1/leads");
    leadUrl.searchParams.set("id", `eq.${input.leadId}`);
    const leadResponse = await this.request(leadUrl, {
      method: "PATCH",
      headers: { ...this.headers(true), Prefer: "return=minimal" },
      body: JSON.stringify(input.leadPatch),
      cache: "no-store",
    });
    if (!leadResponse.ok) throw new PersistenceUnavailableError("lead_enrichment_failed", leadResponse.status || 500);

    if (Object.keys(input.attributionPatch).length) {
      const attributionUrl = this.url("/rest/v1/source_attribution");
      attributionUrl.searchParams.set("lead_id", `eq.${input.leadId}`);
      const attributionResponse = await this.request(attributionUrl, {
        method: "PATCH",
        headers: { ...this.headers(true), Prefer: "return=minimal" },
        body: JSON.stringify(input.attributionPatch),
        cache: "no-store",
      });
      if (!attributionResponse.ok) throw new PersistenceUnavailableError("attribution_enrichment_failed", attributionResponse.status || 500);
    }

    for (const consent of input.consents) {
      const consentUrl = this.url("/rest/v1/consents");
      consentUrl.searchParams.set("on_conflict", "lead_id,consent_type");
      const consentResponse = await this.request(consentUrl, {
        method: "POST",
        headers: { ...this.headers(true), Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(consent),
        cache: "no-store",
      });
      if (!consentResponse.ok) throw new PersistenceUnavailableError("consent_enrichment_failed", consentResponse.status || 500);
    }
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
    const result = await this.rpc("mutate_admin_lead_status_v3", {
      p_lead_id: input.leadId,
      p_expected_status: input.expectedStatus,
      p_next_status: input.nextStatus,
      p_patch: input.patch,
      p_reason: input.reason || null,
      p_outcome_amount_usd: input.outcomeAmountUsd ?? null,
      p_actor: input.actor,
      p_occurred_at: input.occurredAt,
    });
    if (result.ok !== true) {
      return {
        ok: false,
        error:
          result.error === "lead_not_found"
            ? "lead_not_found"
            : result.error === "invalid_outcome_amount"
              ? "invalid_outcome_amount"
            : "concurrent_status_update",
      };
    }
    return {
      ok: true,
      status: requiredString(result.status, "status"),
      auditId: typeof result.audit_id === "string" ? result.audit_id : null,
      outcomeId: typeof result.outcome_id === "string" ? result.outcome_id : null,
      idempotentReplay: result.idempotent_replay === true,
    };
  }

  async patchAdminLead(input: AdminLeadPatchMutation): Promise<AdminLeadPatchMutationResult> {
    const result = await this.rpc("patch_admin_lead_v1", {
      p_lead_id: input.leadId,
      p_patch: input.patch,
      p_actor: input.actor,
      p_occurred_at: input.occurredAt,
    });
    if (result.ok !== true) {
      const allowed = new Set([
        "lead_not_found",
        "invalid_patch",
        "invalid_patch_field",
        "invalid_patch_value",
      ]);
      return {
        ok: false,
        error: (allowed.has(String(result.error))
          ? result.error
          : "invalid_patch") as Extract<AdminLeadPatchMutationResult, { ok: false }>["error"],
      };
    }
    const patch = { ...input.patch };
    delete patch.restore_status_before_spam;
    if (typeof result.resolved_status === "string") patch.status = result.resolved_status;
    return {
      ok: true,
      leadId: requiredString(result.lead_id, "lead_id"),
      auditId: requiredString(result.audit_id, "audit_id"),
      updatedAt: requiredString(result.updated_at, "updated_at"),
      patch,
    };
  }

  async addAdminLeadNote(input: AdminLeadNoteMutation): Promise<AdminLeadNoteMutationResult> {
    const result = await this.rpc("add_admin_lead_note_v1", {
      p_lead_id: input.leadId,
      p_content: input.content,
      p_agent_id: input.agentId || null,
      p_actor: input.actor,
      p_occurred_at: input.occurredAt,
    });
    if (result.ok !== true) {
      const allowed = new Set(["lead_not_found", "agent_not_found", "invalid_note"]);
      return {
        ok: false,
        error: (allowed.has(String(result.error))
          ? result.error
          : "invalid_note") as Extract<AdminLeadNoteMutationResult, { ok: false }>["error"],
      };
    }
    return {
      ok: true,
      messageId: requiredString(result.message_id, "message_id"),
      auditId: requiredString(result.audit_id, "audit_id"),
      createdAt: requiredString(result.created_at, "created_at"),
    };
  }

  async createAdminLeadTask(input: AdminLeadTaskMutation): Promise<AdminLeadTaskMutationResult> {
    const result = await this.rpc("create_admin_lead_task_v1", {
      p_lead_id: input.leadId,
      p_title: input.title,
      p_body: input.body || null,
      p_due_at: input.dueAt || null,
      p_priority: input.priority,
      p_category: input.category || null,
      p_agent_id: input.agentId || null,
      p_actor: input.actor,
      p_occurred_at: input.occurredAt,
    });
    if (result.ok !== true) {
      const allowed = new Set(["lead_not_found", "agent_not_found", "invalid_task"]);
      return {
        ok: false,
        error: (allowed.has(String(result.error))
          ? result.error
          : "invalid_task") as Extract<AdminLeadTaskMutationResult, { ok: false }>["error"],
      };
    }
    return {
      ok: true,
      taskId: requiredString(result.task_id, "task_id"),
      auditId: requiredString(result.audit_id, "audit_id"),
      createdAt: requiredString(result.created_at, "created_at"),
    };
  }

  async recordAdminFirstResponse(
    input: AdminFirstResponseMutation,
  ): Promise<AdminFirstResponseMutationResult> {
    const result = await this.rpc("record_admin_first_response_v1", {
      p_lead_id: input.leadId,
      p_actor: input.actor,
      p_occurred_at: input.occurredAt,
      p_source_system: input.sourceSystem,
    });
    if (result.ok !== true) {
      const allowed = new Set([
        "lead_not_found",
        "invalid_response_time",
        "invalid_response_evidence",
      ]);
      return {
        ok: false,
        error: (allowed.has(String(result.error))
          ? result.error
          : "invalid_response_evidence") as Extract<
            AdminFirstResponseMutationResult,
            { ok: false }
          >["error"],
      };
    }
    return {
      ok: true,
      status: requiredString(result.status, "status"),
      milestoneId: requiredString(result.milestone_id, "milestone_id"),
      auditId: typeof result.audit_id === "string" ? result.audit_id : null,
      firstHumanResponseAt: requiredString(
        result.first_human_response_at,
        "first_human_response_at",
      ),
      idempotentReplay: result.idempotent_replay === true,
    };
  }

  async mutateAdminAssignment(
    input: AdminAssignmentMutation,
  ): Promise<AdminAssignmentMutationResult> {
    const result = await this.rpc("mutate_admin_assignment_v2", {
      p_lead_id: input.leadId,
      p_agent_id: input.agentId,
      p_expected_agent_id: input.expectedAgentId,
      p_action: input.action,
      p_reason: input.reason || null,
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
