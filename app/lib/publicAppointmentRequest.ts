import { assertDatabaseMutationAllowed } from "../../src/lib/preview-security";
import { createDefaultPersistence } from "./persistence/defaultPersistence";
import { PersistenceUnavailableError } from "./persistence/contracts";

export type PublicAppointmentRequestResult =
  | {
      ok: true;
      status: "requested" | "already_requested";
      appointment_id: string;
      appointment_status: string;
      followup_status: "created" | "existing";
      warning?: "appointment_requested_audit_failed" | "appointment_requested_followup_failed";
    }
  | { ok: false; statusCode: number; error: string };

export const PUBLIC_APPOINTMENT_CONFIRMATION_FOLLOWUP_HOURS = 2;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requestPublicAppointment(input: {
  leadId: string;
  sessionId: string;
  requestSurface?: string | null;
  now?: Date;
}): Promise<PublicAppointmentRequestResult> {
  if (!UUID.test(input.leadId)) {
    return { ok: false, statusCode: 400, error: "invalid_lead_reference" };
  }
  if (!UUID.test(input.sessionId)) {
    return { ok: false, statusCode: 400, error: "invalid_session_reference" };
  }

  // This check happens before adapter construction, guaranteeing read-only
  // Preview mode performs zero database/provider calls.
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return {
      ok: false,
      statusCode: mutation.statusCode,
      error: mutation.error,
    };
  }

  const persistence = createDefaultPersistence();
  if (!persistence) {
    return {
      ok: false,
      statusCode: 503,
      error: "appointment_request_store_not_configured",
    };
  }

  try {
    const result = await persistence.requestAppointment({
      leadId: input.leadId,
      sessionId: input.sessionId,
      requestSurface: input.requestSurface,
      requestedAt: (input.now || new Date()).toISOString(),
    });
    if (!result.ok) {
      return {
        ok: false,
        statusCode: 404,
        error: result.error,
      };
    }
    return {
      ok: true,
      status: result.status,
      appointment_id: result.appointment_id,
      appointment_status: result.appointment_status,
      followup_status: result.followup_status,
    };
  } catch (error) {
    return {
      ok: false,
      statusCode:
        error instanceof PersistenceUnavailableError
          ? Math.max(500, error.statusCode)
          : 500,
      error: "appointment_request_create_failed",
    };
  }
}
