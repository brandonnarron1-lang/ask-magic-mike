export type PersistenceFetch = (
  input: URL | RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type LeadLifecycleCapture = {
  session: Record<string, unknown> & { id: string };
  lead: Record<string, unknown>;
  attribution: Record<string, unknown>;
  notificationMode: "disabled" | "console" | "sandbox" | "production";
  internalNotification: {
    templateVersion: string;
    metadata: Record<string, unknown>;
  };
};

export type LeadLifecycleEnrichment = {
  leadId: string;
  leadPatch: Record<string, unknown>;
  attributionPatch: Record<string, unknown>;
  consents: Array<Record<string, unknown>>;
};

export type LeadLifecycleCaptureSuccess = {
  ok?: true;
  lead_id: string;
  session_id: string;
  widget_session_id: string;
  contact_id?: string | null;
  duplicate_of_lead_id: string | null;
  assigned_agent_id?: string | null;
  assignment_status?: "assigned" | "duplicate" | "no_eligible_agent" | "unassigned";
  capture_audit_id?: string | null;
  assignment_audit_id?: string | null;
  notification_id?: string | null;
  notification_status?: string | null;
  idempotent_replay: boolean;
};

export type LeadLifecycleCaptureConflict = {
  ok: false;
  error: "identity_conflict" | "idempotency_conflict";
  session_id?: string | null;
  idempotent_replay: false;
};

export type LeadLifecycleCaptureResult =
  | LeadLifecycleCaptureSuccess
  | LeadLifecycleCaptureConflict;

/**
 * The capture operation intentionally implements these responsibilities as one
 * contract. Splitting them into independently callable writes would recreate
 * the partial-write windows that INFRA-02 removes.
 */
export interface LeadLifecyclePersistence {
  captureLeadLifecycle(input: LeadLifecycleCapture): Promise<LeadLifecycleCaptureResult>;
  /** Additive post-capture enrichment. The lead already exists before this runs. */
  enrichLeadRecord?(input: LeadLifecycleEnrichment): Promise<void>;
}

export type SessionAndSourceAttributionPersistence = Pick<
  LeadLifecyclePersistence,
  "captureLeadLifecycle"
>;
export type CanonicalContactIdentityPersistence = Pick<
  LeadLifecyclePersistence,
  "captureLeadLifecycle"
>;
export type DuplicateDetectionPersistence = Pick<
  LeadLifecyclePersistence,
  "captureLeadLifecycle"
>;
export type QualificationPersistence = Pick<
  LeadLifecyclePersistence,
  "captureLeadLifecycle"
>;
export type RoutingAndAgentEligibilityPersistence = Pick<
  LeadLifecyclePersistence,
  "captureLeadLifecycle"
>;
export type AssignmentAndHistoryPersistence = Pick<
  LeadLifecyclePersistence,
  "captureLeadLifecycle"
>;
export type AuditEventPersistence = Pick<
  LeadLifecyclePersistence,
  "captureLeadLifecycle"
>;
export type NotificationOutboxPersistence = Pick<
  LeadLifecyclePersistence,
  "captureLeadLifecycle"
>;

export type AppointmentIntent = {
  leadId: string;
  sessionId: string;
  requestSurface?: string | null;
  requestedAt: string;
};

export type AppointmentIntentResult =
  | {
      ok: true;
      status: "requested" | "already_requested";
      appointment_id: string;
      appointment_status: string;
      followup_status: "created" | "existing";
      audit_id?: string | null;
    }
  | { ok: false; error: "appointment_request_not_found" };

export interface AppointmentIntentPersistence {
  requestAppointment(input: AppointmentIntent): Promise<AppointmentIntentResult>;
}

export type FollowUpTaskPersistence = Pick<
  AppointmentIntentPersistence,
  "requestAppointment"
>;

export type AdminLeadReadRequest = {
  leadId?: string;
  limit?: number;
};

export interface AdminLeadReadPersistence<Row = Record<string, unknown>> {
  readAdminLeads(input: AdminLeadReadRequest): Promise<Row[]>;
}

export type AdminLeadMutation = {
  leadId: string;
  expectedStatus: string;
  nextStatus: string;
  patch: Record<string, unknown>;
  outcomeAmountUsd?: number | null;
  actor: string;
  reason?: string | null;
  occurredAt: string;
};

export type AdminLeadMutationResult =
  | {
      ok: true;
      status: string;
      auditId?: string | null;
      outcomeId?: string | null;
      idempotentReplay: boolean;
    }
  | {
      ok: false;
      error: "lead_not_found" | "concurrent_status_update" | "invalid_outcome_amount";
    };

export interface AdminLeadMutationPersistence {
  mutateAdminLead(input: AdminLeadMutation): Promise<AdminLeadMutationResult>;
}

export type AdminLeadPatch = {
  status?: string;
  lead_type?: string;
  lead_grade?: string | null;
  next_follow_up_at?: string | null;
  last_contacted_at?: string | null;
  closed_lost_reason?: string | null;
};

export type AdminLeadPatchCommand = AdminLeadPatch & {
  /** Atomic server-side directive; never maps to a leads table column. */
  restore_status_before_spam?: true;
};

export type AdminLeadPatchMutation = {
  leadId: string;
  patch: AdminLeadPatchCommand;
  actor: string;
  occurredAt: string;
};

export type AdminLeadPatchMutationResult =
  | {
      ok: true;
      leadId: string;
      auditId: string;
      updatedAt: string;
      patch: AdminLeadPatch;
    }
  | {
      ok: false;
      error:
        | "lead_not_found"
        | "invalid_patch"
        | "invalid_patch_field"
        | "invalid_patch_value";
    };

export interface AdminLeadPatchPersistence {
  patchAdminLead(input: AdminLeadPatchMutation): Promise<AdminLeadPatchMutationResult>;
}

export type AdminLeadNoteMutation = {
  leadId: string;
  content: string;
  agentId?: string | null;
  actor: string;
  occurredAt: string;
};

export type AdminLeadNoteMutationResult =
  | {
      ok: true;
      messageId: string;
      auditId: string;
      createdAt: string;
    }
  | { ok: false; error: "lead_not_found" | "agent_not_found" | "invalid_note" };

export interface AdminLeadNotePersistence {
  addAdminLeadNote(input: AdminLeadNoteMutation): Promise<AdminLeadNoteMutationResult>;
}

export type AdminLeadTaskMutation = {
  leadId: string;
  title: string;
  body?: string | null;
  dueAt?: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  category?: string | null;
  agentId?: string | null;
  actor: string;
  occurredAt: string;
};

export type AdminLeadTaskMutationResult =
  | {
      ok: true;
      taskId: string;
      auditId: string;
      createdAt: string;
    }
  | {
      ok: false;
      error: "lead_not_found" | "agent_not_found" | "invalid_task";
    };

export interface AdminLeadTaskPersistence {
  createAdminLeadTask(input: AdminLeadTaskMutation): Promise<AdminLeadTaskMutationResult>;
}

export type AdminFirstResponseMutation = {
  leadId: string;
  actor: string;
  occurredAt: string;
  sourceSystem: "admin_lead_detail" | "admin_lead_lifecycle";
};

export type AdminFirstResponseMutationResult =
  | {
      ok: true;
      status: string;
      milestoneId: string;
      auditId?: string | null;
      firstHumanResponseAt: string;
      idempotentReplay: boolean;
    }
  | {
      ok: false;
      error: "lead_not_found" | "invalid_response_time" | "invalid_response_evidence";
    };

export interface AdminFirstResponseMutationPersistence {
  recordAdminFirstResponse(
    input: AdminFirstResponseMutation,
  ): Promise<AdminFirstResponseMutationResult>;
}

export type AdminAssignmentMutation = {
  leadId: string;
  agentId: string | null;
  expectedAgentId: string | null;
  action: "assigned" | "reassigned" | "unassigned";
  reason?: string | null;
  notificationMode: "disabled" | "console" | "sandbox" | "production";
  actor: string;
  occurredAt: string;
};

export type AdminAssignmentMutationResult =
  | {
      ok: true;
      action: "assigned" | "reassigned" | "unassigned";
      auditId?: string | null;
      notificationId?: string | null;
      notificationStatus?: string | null;
      idempotentReplay: boolean;
    }
  | {
      ok: false;
      error:
        | "lead_not_found"
        | "agent_not_found"
        | "agent_inactive"
        | "agent_at_capacity"
        | "assignment_conflict"
        | "invalid_assignment_action";
    };

export interface AdminAssignmentMutationPersistence {
  mutateAdminAssignment(
    input: AdminAssignmentMutation,
  ): Promise<AdminAssignmentMutationResult>;
}

export type AdminAgentOperationsMutation = {
  agentId: string;
  patch: {
    is_active: boolean;
    max_daily_leads: number;
    current_load: number;
    priority_score: number;
    notification_email: boolean;
    notification_sms: boolean;
  };
  actor: string;
};

export type AdminAgentOperationsMutationResult =
  | { ok: true; auditId?: string | null }
  | { ok: false; error: "agent_not_found" };

export interface AdminAgentOperationsMutationPersistence {
  mutateAdminAgentOperations(
    input: AdminAgentOperationsMutation,
  ): Promise<AdminAgentOperationsMutationResult>;
}

export type ReportingReadRequest = {
  since?: string | null;
  limit?: number;
};

export interface ReportingPersistence<Row = Record<string, unknown>> {
  readReportingRows(input: ReportingReadRequest): Promise<Row[]>;
}

export type ActivePersistenceBoundary = LeadLifecyclePersistence &
  AppointmentIntentPersistence &
  AdminLeadReadPersistence &
  AdminLeadMutationPersistence &
  AdminLeadPatchPersistence &
  AdminLeadNotePersistence &
  AdminLeadTaskPersistence &
  AdminFirstResponseMutationPersistence &
  AdminAssignmentMutationPersistence &
  AdminAgentOperationsMutationPersistence &
  ReportingPersistence;

export class PersistenceUnavailableError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
  ) {
    super(code);
    this.name = "PersistenceUnavailableError";
  }
}
