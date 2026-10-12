import { PUBLIC_LEAD_SAVE_ERROR } from "./publicLeadErrors";

export const PUBLIC_LEAD_SAVED_MESSAGE =
  "Your request is stored for review. Mike or the approved team will follow up through the contact path you provided.";
export const PUBLIC_LEAD_UNCONFIRMED_MESSAGE =
  "We couldn't confirm whether your request was saved. Please call Our Town Properties at 252-243-7700 before submitting a new request.";

type PublicLeadHeaders = Pick<Headers, "get">;
export type PublicLeadResponse = Pick<Response, "status" | "headers" | "json">;
export type PublicLeadUuid = string & { readonly __publicLeadUuid: unique symbol };

export type PublicLeadReceipt = {
  lead_id: PublicLeadUuid;
  session_id: PublicLeadUuid;
  correlation_id: PublicLeadUuid;
  duplicate_of_lead_id: PublicLeadUuid | null;
  message: typeof PUBLIC_LEAD_SAVED_MESSAGE;
  /**
   * Derived ONLY from X-AMM-Idempotent-Replay: 1. The current API omits the
   * header for a new committed capture; any other header value is invalid.
   * Replay confirms the original commit, not a new lead-created event.
   * duplicate_of_lead_id is independent of replay and is not a replay flag.
   * Notification delivery is neither a receipt requirement nor a guarantee.
   */
  idempotentReplay: boolean;
};

export type PublicLeadRetryAfter = {
  source: "delay-seconds" | "http-date";
  delayMs: number;
  retryAt: string;
};

export type PublicLeadOutcome =
  | { status: "saved"; receipt: PublicLeadReceipt }
  | {
      status: "not_saved";
      reason: "validation" | "conflict" | "rate_limited" | "mode_refusal" | "honeypot";
      httpStatus: number;
      correlation_id: PublicLeadUuid | null;
      code: PublicLeadErrorCode | null;
      message: string;
      retryPolicy: "edit" | "same_payload" | "blocked";
      retryAfterSeconds?: number;
      retryAfter?: PublicLeadRetryAfter;
    }
  | {
      status: "unconfirmed";
      reason: "invalid_receipt" | "unreadable_response" | "server_error" | "unexpected_response" | "timeout" | "transport_error";
      httpStatus: number | null;
      correlation_id: PublicLeadUuid | null;
      code: PublicLeadErrorCode | null;
      message: typeof PUBLIC_LEAD_UNCONFIRMED_MESSAGE;
      // Manual retry only: retain BOTH the original key and unchanged payload.
      retryPolicy: "same_payload";
      retryAfterSeconds?: never;
      retryAfter?: never;
    };

// Match the UUID versions/variant accepted by the canonical leads handler.
// Normalize case, not whitespace, coercions, shortened IDs, nil or dummy IDs.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value: unknown): PublicLeadUuid | null {
  return typeof value === "string" && UUID_PATTERN.test(value)
    ? value.toLowerCase() as PublicLeadUuid
    : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function correlationId(body: Record<string, unknown>, headers: PublicLeadHeaders) {
  const bodyId = uuid(body.correlation_id);
  const headerId = uuid(headers.get("X-AMM-Correlation-Id"));
  return bodyId && bodyId === headerId ? bodyId : null;
}

function hasJsonContentType(headers: PublicLeadHeaders) {
  return headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

/** Parse only the public /api/leads receipt, never a persistence/provider result. */
export function parsePublicLeadReceipt(
  body: unknown,
  headers: PublicLeadHeaders,
): PublicLeadReceipt | null {
  if (!hasJsonContentType(headers)) return null;
  const data = record(body);
  if (!data) return null;
  const leadId = uuid(data.lead_id);
  const sessionId = uuid(data.session_id);
  const correlation = correlationId(data, headers);
  const duplicateId = data.duplicate_of_lead_id == null
    ? null
    : uuid(data.duplicate_of_lead_id);
  if (!leadId || !sessionId || !correlation) return null;
  if (data.duplicate_of_lead_id != null && !duplicateId) return null;
  const replay = headers.get("X-AMM-Idempotent-Replay");
  if (replay !== null && replay !== "1") return null;
  return {
    lead_id: leadId,
    session_id: sessionId,
    correlation_id: correlation,
    duplicate_of_lead_id: duplicateId,
    message: PUBLIC_LEAD_SAVED_MESSAGE,
    idempotentReplay: replay === "1",
  };
}

const CONFLICT_MESSAGE =
  "That submission conflicts with an existing request. Please call Our Town Properties at 252-243-7700.";
// An allowlist, not a blacklist: never forward raw exception, error, message,
// provider or database fields. Do not import server preview/persistence code.
const ERROR_CONTRACTS = {
  invalid_json: [400, "Invalid JSON."],
  invalid_payload: [400, "Invalid lead payload."],
  invalid_field_type: [400, "Invalid submission."],
  protected_field_rejected: [400, "Invalid submission."],
  invalid_funnel_type: [400, "Invalid lead request type."],
  invalid_lead_type: [400, "Invalid lead request type."],
  invalid_lead_source_surface: [400, "Invalid lead source."],
  invalid_attribution: [400, "Invalid attribution context."],
  idempotency_key_conflict: [400, "Submission references do not match. Please refresh and try again."],
  idempotency_key_required: [400, "A secure submission reference is required. Please refresh and try again."],
  idempotency_key_invalid: [400, "The submission reference is invalid. Please refresh and try again."],
  invalid_test_marker: [400, "Test submissions require the internal QA do-not-contact markers."],
  invalid_experiment_context: [400, "Invalid experiment context."],
  invalid_lead_payload: [400, "Invalid submission."],
  wordpress_bridge_marker_missing: [400, "WordPress bridge authorization failed."],
  wordpress_bridge_identity_mismatch: [400, "WordPress bridge payload identity was rejected."],
  wordpress_bridge_signature_invalid: [401, "WordPress bridge authorization failed."],
  wordpress_bridge_timestamp_expired: [401, "WordPress bridge authorization failed."],
  wordpress_bridge_not_configured: [503, "WordPress bridge authorization failed."],
  origin_not_approved: [403, "This form origin is not approved."],
  payload_too_large: [413, "Submission is too large."],
  unsupported_media_type: [415, "Lead submissions require JSON."],
  identity_conflict: [409, CONFLICT_MESSAGE],
  idempotency_conflict: [409, CONFLICT_MESSAGE],
  rate_limited: [429, "Too many requests. Please try again shortly."],
  preview_data_disabled: [503, "This preview is in read-only demonstration mode. No lead or appointment data was saved."],
  lead_store_not_configured: [503, PUBLIC_LEAD_SAVE_ERROR],
  rate_limit_store_unavailable: [503, "Lead intake is temporarily unavailable."],
  lead_preparation_failed: [500, PUBLIC_LEAD_SAVE_ERROR],
  lead_persistence_failed: [500, PUBLIC_LEAD_SAVE_ERROR],
} as const;
export type PublicLeadErrorCode = keyof typeof ERROR_CONTRACTS;

const VALIDATION_MESSAGES = new Set([
  "Address is required.",
  "Email or phone is required for a home value request.",
  "Property address and phone are required for seller requests.",
  "Question is required for chat leads.",
  "Email or phone is required for a chat follow-up request.",
  "Consent is required for a chat follow-up request.",
  "Email or phone is required to schedule an appointment.",
  "Email or phone is required for buyer and renter requests.",
  "Email or phone is required for open-house registration.",
  "Enter a valid email address.",
  "Enter a valid phone number.",
]);

function safeError(body: Record<string, unknown>, status: number) {
  const rawCode = body.code;
  const code = typeof rawCode === "string" && Object.hasOwn(ERROR_CONTRACTS, rawCode)
    ? rawCode as PublicLeadErrorCode
    : null;
  const contract = code ? ERROR_CONTRACTS[code] : null;
  // 422 is a validation refusal, not a newly invented canonical API flag.
  if (!code || !contract || (contract[0] !== status && !(status === 422 && code === "invalid_lead_payload"))) {
    return { code: null, message: PUBLIC_LEAD_SAVE_ERROR };
  }
  const message = code === "invalid_lead_payload" && typeof body.error === "string" && VALIDATION_MESSAGES.has(body.error)
    ? body.error
    : contract[1];
  return { code, message };
}

/** Honor the supplied Retry-After; never invent a default cooldown. */
export function parsePublicLeadRetryAfter(
  value: string | null,
  nowMs = Date.now(),
): PublicLeadRetryAfter | null {
  if (!value || !Number.isFinite(nowMs)) return null;
  const text = value.trim();
  let retryAtMs: number;
  let source: PublicLeadRetryAfter["source"];
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    if (!Number.isSafeInteger(seconds)) return null;
    retryAtMs = nowMs + seconds * 1_000;
    source = "delay-seconds";
  } else {
    // Date.parse alone accepts numeric junk and non-HTTP dates. Only accept
    // the standard IMF-fixdate emitted by HTTP servers, with a correct weekday.
    if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(text)) return null;
    retryAtMs = Date.parse(text);
    if (!Number.isFinite(retryAtMs) || new Date(retryAtMs).toUTCString() !== text) return null;
    retryAtMs = Math.max(nowMs, retryAtMs);
    source = "http-date";
  }
  if (!Number.isSafeInteger(retryAtMs) || Math.abs(retryAtMs) > 8.64e15) return null;
  return { source, delayMs: Math.max(0, retryAtMs - nowMs), retryAt: new Date(retryAtMs).toISOString() };
}

export function publicLeadTransportOutcome(
  reason: "timeout" | "transport_error" = "transport_error",
): Extract<PublicLeadOutcome, { status: "unconfirmed" }> {
  return {
    status: "unconfirmed", reason, httpStatus: null, correlation_id: null, code: null,
    message: PUBLIC_LEAD_UNCONFIRMED_MESSAGE,
    retryPolicy: "same_payload",
  };
}

/**
 * Read one response once; does not fetch, retry, notify or look up a lead.
 * Only the current committed HTTP 200 contract can be SAVED. A lost response
 * or unrecognized 5xx can follow a commit, so cannot prove NOT_SAVED. A
 * recognized precommit 503 refusal is different from a persistence exception.
 */
export async function publicLeadOutcomeFromResponse(
  response: PublicLeadResponse,
  nowMs = Date.now(),
): Promise<PublicLeadOutcome> {
  const uncertain = (reason: Extract<PublicLeadOutcome, { status: "unconfirmed" }>["reason"]) => ({
    ...publicLeadTransportOutcome(), httpStatus: response.status, reason,
  });
  let data: Record<string, unknown> | null = null;
  if (hasJsonContentType(response.headers)) {
    try {
      data = record(await response.json());
    } catch {
      // A conflict must stay blocked even if its error body is lost. A 429
      // still carries usable cooldown guidance in its HTTP header.
    }
  }
  const correlation = data ? correlationId(data, response.headers) : null;
  const error = data ? safeError(data, response.status) : { code: null, message: PUBLIC_LEAD_SAVE_ERROR };
  const failure = (reason: Extract<PublicLeadOutcome, { status: "not_saved" }>["reason"], retryPolicy: "edit" | "same_payload" | "blocked"): Extract<PublicLeadOutcome, { status: "not_saved" }> => ({
    status: "not_saved", reason, httpStatus: response.status, correlation_id: correlation,
    ...error, retryPolicy,
  });
  // Do not rotate a key, change payload, or blindly retry a conflicting key.
  // An operator must reconcile the existing request before a new submission.
  if (response.status === 409) return { ...failure("conflict", "blocked"), message: CONFLICT_MESSAGE };
  if (response.status === 429) {
    const retryAfter = parsePublicLeadRetryAfter(response.headers.get("Retry-After"), nowMs);
    return {
      ...failure("rate_limited", "same_payload"),
      message: ERROR_CONTRACTS.rate_limited[1],
      ...(retryAfter ? { retryAfter, retryAfterSeconds: Math.ceil(retryAfter.delayMs / 1_000) } : {}),
    };
  }
  if (!data) return uncertain("unreadable_response");
  if (response.status === 200) {
    const receipt = parsePublicLeadReceipt(data, response.headers);
    return receipt ? { status: "saved", receipt } : uncertain("invalid_receipt");
  }
  // This is the exact honeypot contract, not a generic accepted/success flag.
  if (response.status === 202 && correlation && data.message === "Got it." &&
      data.lead_id === undefined && data.session_id === undefined && data.duplicate_of_lead_id === undefined &&
      response.headers.get("X-AMM-Idempotent-Replay") === null) {
    return failure("honeypot", "blocked");
  }
  if (response.status >= 200 && response.status < 300) return uncertain("invalid_receipt");
  // Other application-specific refusals require the handler's correlation
  // contract; do not trust a proxy's apparent preview/mode error as authority.
  if (!correlation) return uncertain("unexpected_response");
  if ([401, 403].includes(response.status)) return failure("mode_refusal", "blocked");
  if ([400, 413, 415, 422].includes(response.status)) {
    return failure("validation", "edit");
  }
  if (response.status === 503 && error.code &&
      ["preview_data_disabled", "lead_store_not_configured", "rate_limit_store_unavailable", "wordpress_bridge_not_configured"].includes(error.code)) {
    return failure("mode_refusal", "blocked");
  }
  return {
    ...uncertain(response.status >= 500 ? "server_error" : "unexpected_response"),
    correlation_id: correlation, code: error.code,
  };
}
