import { neon } from "@neondatabase/serverless";
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
  LeadLifecycleEnrichment,
  ReportingReadRequest,
} from "./contracts";
import { PersistenceUnavailableError } from "./contracts";

type Query = ReturnType<typeof neon>;

function classifyCaptureError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("password authentication") || message.includes("authentication failed")) return "authentication_failed";
  if (message.includes("function") && message.includes("does not exist")) return "capture_function_missing";
  if (message.includes("relation") && message.includes("does not exist")) return "schema_missing";
  if (message.includes("constraint")) return "constraint_failed";
  if (message.includes("fetch") || message.includes("connect") || message.includes("network")) return "connection_failed";
  return "query_failed";
}

/** Server-only PostgreSQL adapter for Neon. The public capture keeps using the
 * same atomic SQL function; no browser ever receives DATABASE_URL. */
export class NeonPostgresAdapter implements ActivePersistenceBoundary {
  constructor(private readonly sql: Query) {}

  static fromEnv(env: Record<string, string | undefined> = process.env) {
    return env.DATABASE_URL ? new NeonPostgresAdapter(neon(env.DATABASE_URL)) : null;
  }

  private async rpc(name: string, values: unknown[]) {
    try {
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
      const rows = await this.sql.query(
        `SELECT public.${name}(${placeholders}) AS result`,
        values,
      ) as Array<Record<string, unknown>>;
      const result = rows[0]?.result;
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("rpc_result_invalid");
      }
      return result as Record<string, unknown>;
    } catch {
      throw new PersistenceUnavailableError(`neon_${name}_failed`, 502);
    }
  }

  async captureLeadLifecycle(input: LeadLifecycleCapture): Promise<LeadLifecycleCaptureResult> {
    try {
      const idempotencyKey = typeof input.lead.request_idempotency_key === "string"
        ? input.lead.request_idempotency_key.trim()
        : "";
      if (idempotencyKey) {
        const existingRows = await this.sql.query(
          `SELECT id, session_id, widget_session_id, duplicate_of_lead_id,
                  assigned_agent_id, assignment_status, request_fingerprint,
                  public.amm_public_lead_request_fingerprint($2::jsonb, $3::jsonb) AS incoming_fingerprint
             FROM public.leads
            WHERE request_idempotency_key = $1
            LIMIT 1`,
          [idempotencyKey, JSON.stringify(input.lead), JSON.stringify(input.attribution)],
        ) as Array<Record<string, unknown>>;
        const existing = existingRows[0];
        if (existing?.id && existing.session_id) {
          if (existing.request_fingerprint !== existing.incoming_fingerprint) {
            return {
              ok: false,
              error: "idempotency_conflict",
              session_id: String(existing.session_id),
              idempotent_replay: false,
            };
          }
          return {
            ok: true,
            lead_id: String(existing.id),
            session_id: String(existing.session_id),
            widget_session_id: String(existing.widget_session_id || existing.session_id),
            duplicate_of_lead_id: existing.duplicate_of_lead_id
              ? String(existing.duplicate_of_lead_id)
              : null,
            assigned_agent_id: existing.assigned_agent_id
              ? String(existing.assigned_agent_id)
              : null,
            assignment_status: existing.assignment_status === "assigned" ||
              existing.assignment_status === "duplicate" ||
              existing.assignment_status === "no_eligible_agent" ||
              existing.assignment_status === "unassigned"
              ? existing.assignment_status
              : "unassigned",
            idempotent_replay: true,
          };
        }
      }
      const rows = await this.sql.query(
        "SELECT public.capture_public_lead_v1($1::jsonb, $2::jsonb, $3::jsonb, $4::text) AS result",
        [JSON.stringify(input.session), JSON.stringify(input.lead), JSON.stringify(input.attribution), input.notificationMode],
      );
      const result = (rows as Array<Record<string, unknown>>)[0]?.result as Record<string, unknown> | undefined;
      if (!result || typeof result !== "object") throw new Error("capture_result_invalid");
      if (result.ok === false) return { ok: false, error: result.error === "identity_conflict" ? "identity_conflict" : "idempotency_conflict", session_id: typeof result.session_id === "string" ? result.session_id : null, idempotent_replay: false };
      return result as LeadLifecycleCaptureResult;
    } catch (error) {
      console.error("Neon lead capture failed", { category: classifyCaptureError(error) });
      throw new PersistenceUnavailableError("neon_capture_failed", 502);
    }
  }

  async enrichLeadRecord(input: LeadLifecycleEnrichment) {
    // The atomic function already creates the durable lead. Use the same JSON
    // patch semantics as the former PostgREST adapter without interpolating
    // request-controlled column names.
    try {
      await this.sql.query(
        `UPDATE public.leads SET
           city = COALESCE(NULLIF($1::jsonb->>'city', ''), city),
           score = COALESCE(($1::jsonb->>'score')::smallint, score),
           score_factors = COALESCE($1::jsonb->'score_factors', score_factors),
           score_version = COALESCE(NULLIF($1::jsonb->>'score_version', ''), score_version),
           is_test = COALESCE(($1::jsonb->>'is_test')::boolean, is_test),
           communication_suppressed = COALESCE(($1::jsonb->>'communication_suppressed')::boolean, communication_suppressed),
           email_suppressed = COALESCE(($1::jsonb->>'email_suppressed')::boolean, email_suppressed),
           sms_suppressed = COALESCE(($1::jsonb->>'sms_suppressed')::boolean, sms_suppressed),
           consent_language_text = COALESCE(NULLIF($1::jsonb->>'consent_language_text', ''), consent_language_text),
           consent_ip_hash = COALESCE(NULLIF($1::jsonb->>'consent_ip_hash', ''), consent_ip_hash),
           consent_source = COALESCE(NULLIF($1::jsonb->>'consent_source', ''), consent_source),
           consent_user_agent = COALESCE(NULLIF($1::jsonb->>'consent_user_agent', ''), consent_user_agent),
           routing_reason = COALESCE(NULLIF($1::jsonb->>'routing_reason', ''), routing_reason),
           target_geography = COALESCE(NULLIF($1::jsonb->>'target_geography', ''), target_geography),
           financing = COALESCE(NULLIF($1::jsonb->>'financing', ''), financing),
           preapproval = COALESCE(($1::jsonb->>'preapproval')::boolean, preapproval),
           request_idempotency_key = COALESCE(NULLIF($1::jsonb->>'request_idempotency_key', ''), request_idempotency_key)
         WHERE id = $2::uuid`,
        [JSON.stringify(input.leadPatch), input.leadId],
      );
      await this.sql.query(
        `UPDATE public.source_attribution SET
           first_touch = COALESCE($1::jsonb->'first_touch', first_touch),
           last_touch = COALESCE($1::jsonb->'last_touch', last_touch),
           click_ids = COALESCE($1::jsonb->'click_ids', click_ids),
           placement_id = COALESCE(NULLIF($1::jsonb->>'placement_id', ''), placement_id),
           page_title = COALESCE(NULLIF($1::jsonb->>'page_title', ''), page_title),
           listing_id = COALESCE(NULLIF($1::jsonb->>'listing_id', ''), listing_id),
           property_id = COALESCE(NULLIF($1::jsonb->>'property_id', ''), property_id),
           agent_id = COALESCE(NULLIF($1::jsonb->>'agent_id', ''), agent_id)
         WHERE lead_id = $2::uuid`,
        [JSON.stringify(input.attributionPatch), input.leadId],
      );
      for (const consent of input.consents) {
        await this.sql.query(
          `INSERT INTO public.consents (
             lead_id, consent_type, granted, language_version,
             language_text, user_agent, collected_at
           ) VALUES (
             ($1::jsonb->>'lead_id')::uuid,
             $1::jsonb->>'consent_type',
             COALESCE(($1::jsonb->>'granted')::boolean, false),
             COALESCE(NULLIF($1::jsonb->>'language_version', ''), 'v1'),
             NULLIF($1::jsonb->>'language_text', ''),
             NULLIF($1::jsonb->>'user_agent', ''),
             COALESCE(($1::jsonb->>'collected_at')::timestamptz, NOW())
           ) ON CONFLICT (lead_id, consent_type) DO NOTHING`,
          [JSON.stringify(consent)],
        );
      }
    } catch { throw new PersistenceUnavailableError("neon_enrichment_failed", 502); }
  }
  async requestAppointment(input: AppointmentIntent): Promise<AppointmentIntentResult> {
    const result = await this.rpc("request_public_appointment_v1", [
      input.leadId,
      input.sessionId,
      input.requestSurface || null,
      input.requestedAt,
    ]);
    if (result.ok !== true) return { ok: false, error: "appointment_request_not_found" };
    if (typeof result.appointment_id !== "string" || typeof result.appointment_status !== "string") {
      throw new PersistenceUnavailableError("neon_appointment_response_invalid", 502);
    }
    return {
      ok: true,
      status: result.status === "already_requested" ? "already_requested" : "requested",
      appointment_id: result.appointment_id,
      appointment_status: result.appointment_status,
      followup_status: result.followup_status === "created" ? "created" : "existing",
      audit_id: typeof result.audit_id === "string" ? result.audit_id : null,
    };
  }

  async readAdminLeads(input: AdminLeadReadRequest): Promise<Record<string, unknown>[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 100, 500));
    const rows = await this.sql.query(
      input.leadId
        ? "SELECT * FROM public.leads WHERE id = $1::uuid ORDER BY created_at DESC LIMIT $2"
        : "SELECT * FROM public.leads ORDER BY created_at DESC LIMIT $1",
      input.leadId ? [input.leadId, limit] : [limit],
    );
    return rows as Record<string, unknown>[];
  }

  async mutateAdminLead(input: AdminLeadMutation): Promise<AdminLeadMutationResult> {
    const result = await this.rpc("mutate_admin_lead_status_v2", [
      input.leadId, input.expectedStatus, input.nextStatus, JSON.stringify(input.patch),
      input.reason || null, input.outcomeAmountUsd ?? null, input.actor, input.occurredAt,
    ]);
    if (result.ok !== true) {
      return {
        ok: false,
        error: result.error === "lead_not_found"
          ? "lead_not_found"
          : result.error === "invalid_outcome_amount"
            ? "invalid_outcome_amount"
            : "concurrent_status_update",
      };
    }
    if (typeof result.status !== "string") throw new PersistenceUnavailableError("neon_admin_lead_response_invalid", 502);
    return {
      ok: true,
      status: result.status,
      auditId: typeof result.audit_id === "string" ? result.audit_id : null,
      outcomeId: typeof result.outcome_id === "string" ? result.outcome_id : null,
      idempotentReplay: result.idempotent_replay === true,
    };
  }

  async mutateAdminAssignment(input: AdminAssignmentMutation): Promise<AdminAssignmentMutationResult> {
    const result = await this.rpc("mutate_admin_assignment_v1", [
      input.leadId, input.agentId, input.expectedAgentId, input.action,
      input.notificationMode, input.actor, input.occurredAt,
    ]);
    if (result.ok !== true) {
      const errors = new Set(["lead_not_found", "agent_not_found", "agent_inactive", "agent_at_capacity", "assignment_conflict", "invalid_assignment_action"]);
      return { ok: false, error: (errors.has(String(result.error)) ? result.error : "assignment_conflict") as Extract<AdminAssignmentMutationResult, { ok: false }>['error'] };
    }
    return {
      ok: true,
      action: result.action === "reassigned" || result.action === "unassigned" ? result.action : "assigned",
      auditId: typeof result.audit_id === "string" ? result.audit_id : null,
      notificationId: typeof result.notification_id === "string" ? result.notification_id : null,
      notificationStatus: typeof result.notification_status === "string" ? result.notification_status : null,
      idempotentReplay: result.idempotent_replay === true,
    };
  }

  async mutateAdminAgentOperations(input: AdminAgentOperationsMutation): Promise<AdminAgentOperationsMutationResult> {
    const result = await this.rpc("mutate_admin_agent_operations_v1", [input.agentId, JSON.stringify(input.patch), input.actor]);
    return result.ok === true
      ? { ok: true, auditId: typeof result.audit_id === "string" ? result.audit_id : null }
      : { ok: false, error: "agent_not_found" };
  }

  async readReportingRows(input: ReportingReadRequest): Promise<Record<string, unknown>[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 1000, 5000));
    const rows = await this.sql.query(
      input.since
        ? "SELECT * FROM public.leads WHERE created_at >= $1::timestamptz ORDER BY created_at DESC LIMIT $2"
        : "SELECT * FROM public.leads ORDER BY created_at DESC LIMIT $1",
      input.since ? [input.since, limit] : [limit],
    );
    return rows as Record<string, unknown>[];
  }
}

// All writes remain server-only; the browser never receives DATABASE_URL.
