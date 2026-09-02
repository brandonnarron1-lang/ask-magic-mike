import {
  clean,
  isLeadSourceSurface,
  type FunnelType,
  type LeadPayload,
} from "./leadPayload";

export const MAX_PUBLIC_LEAD_BODY_BYTES = 65_536;

const PUBLIC_FUNNEL_TYPES = new Set<FunnelType>([
  "home_value",
  "seller",
  "buyer",
  "renter",
  "open_house",
  "chat",
  "appointment",
  "widget",
]);

export const PUBLIC_LEAD_TYPES = new Set([
  "buyer",
  "seller",
  "seller_cash_offer",
  "investor",
  "listing_inquiry",
  "open_house",
  "home_value",
  "relocation",
  "renter",
  "agent_referral",
  "general_question",
  "unknown",
]);

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

const RAW_STRING_FIELDS = [
  "funnel_type",
  "lead_source_surface",
  "lead_type",
  "address",
  "property_address",
  "name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "city",
  "target_geography",
  "financing",
  "listing_id",
  "property_id",
  "agent_id",
  "timeline",
  "condition",
  "property_condition",
  "notes",
  "question",
  "intent",
  "page_url",
  "widget_session_id",
  "idempotency_key",
  "request_fingerprint",
  "experiment_key",
  "experiment_subject_key",
  "experiment_variant_key",
  "experiment_surface",
  "website",
  "honeypot",
  "consent_timestamp",
  "consent_language_version",
  "consent_language_text",
  "consent_source",
  "status",
] as const;

const RAW_BOOLEAN_FIELDS = [
  "preapproval",
  "is_test",
  "consent",
  "consent_email",
  "consent_call",
  "consent_sms",
] as const;

const ATTRIBUTION_STRING_FIELDS = [
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "referrer",
  "landing_page",
  "initial_path",
  "current_path",
  "parent_url",
  "embed_host",
  "placement",
  "placement_id",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "page_title",
  "listing_id",
  "property_id",
  "agent_id",
  "device_category",
  "created_at",
] as const;

const CLIENT_PROTECTED_FIELDS = [
  "score",
  "score_factors",
  "score_version",
  "routing_reason",
  "communication_suppressed",
  "email_suppressed",
  "sms_suppressed",
  "duplicate_of_lead_id",
  "assignment_status",
] as const;

const ATTRIBUTION_LENGTH_LIMITS: Record<string, number> = {
  source: 120,
  medium: 120,
  campaign: 240,
  content: 240,
  term: 240,
  referrer: 2_048,
  landing_page: 2_048,
  initial_path: 2_048,
  current_path: 2_048,
  parent_url: 2_048,
  embed_host: 255,
  placement: 240,
  placement_id: 240,
  gclid: 512,
  gbraid: 512,
  wbraid: 512,
  fbclid: 512,
  msclkid: 512,
  page_title: 300,
  listing_id: 160,
  property_id: 160,
  agent_id: 160,
  device_category: 32,
  created_at: 40,
};

export type PublicLeadInputFailure = { code: string; message: string };

export class PublicLeadPayloadTooLargeError extends Error {}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function readBoundedPublicLeadBody(req: Request) {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_PUBLIC_LEAD_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new PublicLeadPayloadTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export function validateRawPublicLeadInput(
  input: Record<string, unknown>,
): PublicLeadInputFailure | null {
  for (const field of RAW_STRING_FIELDS) {
    const value = input[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return { code: "invalid_field_type", message: "Invalid submission." };
    }
  }
  for (const field of RAW_BOOLEAN_FIELDS) {
    const value = input[field];
    if (value !== undefined && value !== null && typeof value !== "boolean") {
      return { code: "invalid_field_type", message: "Invalid submission." };
    }
  }
  for (const field of CLIENT_PROTECTED_FIELDS) {
    if (input[field] !== undefined && input[field] !== null) {
      return { code: "protected_field_rejected", message: "Invalid submission." };
    }
  }
  if (input.assigned_agent_id !== undefined && input.assigned_agent_id !== null) {
    return { code: "protected_field_rejected", message: "Invalid submission." };
  }
  if (input.status !== undefined && input.status !== "new") {
    return { code: "protected_field_rejected", message: "Invalid submission." };
  }
  if (
    typeof input.funnel_type !== "string" ||
    !PUBLIC_FUNNEL_TYPES.has(input.funnel_type as FunnelType)
  ) {
    return { code: "invalid_funnel_type", message: "Invalid lead request type." };
  }
  if (!isLeadSourceSurface(input.lead_source_surface)) {
    return { code: "invalid_lead_source_surface", message: "Invalid lead source." };
  }
  if (
    input.lead_type !== undefined &&
    input.lead_type !== null &&
    (typeof input.lead_type !== "string" || !PUBLIC_LEAD_TYPES.has(input.lead_type))
  ) {
    return { code: "invalid_lead_type", message: "Invalid lead request type." };
  }
  if (
    input.attribution !== undefined &&
    input.attribution !== null &&
    !isPlainRecord(input.attribution)
  ) {
    return { code: "invalid_attribution", message: "Invalid attribution context." };
  }
  if (isPlainRecord(input.attribution)) {
    for (const field of ATTRIBUTION_STRING_FIELDS) {
      const value = input.attribution[field];
      if (value !== undefined && value !== null && typeof value !== "string") {
        return { code: "invalid_attribution", message: "Invalid attribution context." };
      }
    }
    for (const field of ["first_touch", "last_touch", "click_ids"] as const) {
      const value = input.attribution[field];
      if (value !== undefined && value !== null && !isPlainRecord(value)) {
        return { code: "invalid_attribution", message: "Invalid attribution context." };
      }
      if (isPlainRecord(value)) {
        for (const nestedValue of Object.values(value)) {
          if (
            nestedValue !== undefined &&
            nestedValue !== null &&
            typeof nestedValue !== "string"
          ) {
            return { code: "invalid_attribution", message: "Invalid attribution context." };
          }
        }
      }
    }
  }
  return null;
}

export function resolvePublicLeadIdempotencyKey(
  input: Record<string, unknown>,
  headerValue: string | null,
): { ok: true; value: string } | { ok: false; failure: PublicLeadInputFailure } {
  const bodyKey = clean(input.idempotency_key);
  const legacyBodyKey = clean(input.request_fingerprint);
  const headerKey = clean(headerValue);
  if (bodyKey && legacyBodyKey && bodyKey !== legacyBodyKey) {
    return {
      ok: false,
      failure: {
        code: "idempotency_key_conflict",
        message: "Submission references do not match. Please refresh and try again.",
      },
    };
  }
  const effectiveBodyKey = bodyKey || legacyBodyKey;
  if (effectiveBodyKey && headerKey && effectiveBodyKey !== headerKey) {
    return {
      ok: false,
      failure: {
        code: "idempotency_key_conflict",
        message: "Submission references do not match. Please refresh and try again.",
      },
    };
  }
  const value = effectiveBodyKey || headerKey;
  if (!value) {
    return {
      ok: false,
      failure: {
        code: "idempotency_key_required",
        message: "A secure submission reference is required. Please refresh and try again.",
      },
    };
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
    return {
      ok: false,
      failure: {
        code: "idempotency_key_invalid",
        message: "The submission reference is invalid. Please refresh and try again.",
      },
    };
  }
  return { ok: true, value };
}

export function validatePublicLeadFieldBounds(payload: LeadPayload) {
  const boundedFields: Array<[string, string | undefined, number]> = [
    ["address", payload.address, 500],
    ["property_address", payload.property_address, 500],
    ["name", payload.name, 160],
    ["first_name", payload.first_name, 100],
    ["last_name", payload.last_name, 120],
    ["email", payload.email, 320],
    ["phone", payload.phone, 40],
    ["city", payload.city, 120],
    ["target_geography", payload.target_geography, 500],
    ["financing", payload.financing, 160],
    ["listing_id", payload.listing_id, 160],
    ["property_id", payload.property_id, 160],
    ["agent_id", payload.agent_id, 160],
    ["timeline", payload.timeline, 160],
    ["condition", payload.condition, 500],
    ["question", payload.question, 4_000],
    ["notes", payload.notes, 4_000],
    ["page_url", payload.page_url, 2_048],
    ["widget_session_id", payload.widget_session_id, 160],
    ["idempotency_key", payload.idempotency_key, 160],
    ["experiment_key", payload.experiment_key, 81],
    ["experiment_subject_key", payload.experiment_subject_key, 64],
    ["experiment_variant_key", payload.experiment_variant_key, 41],
    ["experiment_surface", payload.experiment_surface, 120],
    ["consent_language_version", payload.consent_language_version, 120],
    ["consent_language_text", payload.consent_language_text, 4_000],
    ["consent_source", payload.consent_source, 120],
  ];
  for (const [label, value, max] of boundedFields) {
    if (value && value.length > max) return `${label} is too long.`;
  }

  for (const [field, max] of Object.entries(ATTRIBUTION_LENGTH_LIMITS)) {
    const value = payload.attribution[field as keyof typeof payload.attribution];
    if (typeof value === "string" && value.length > max) {
      return `attribution.${field} is too long.`;
    }
  }
  for (const [snapshotName, snapshot] of [
    ["first_touch", payload.attribution.first_touch],
    ["last_touch", payload.attribution.last_touch],
  ] as const) {
    for (const [field, value] of Object.entries(snapshot || {})) {
      const max = ATTRIBUTION_LENGTH_LIMITS[field] || 512;
      if (typeof value === "string" && value.length > max) {
        return `attribution.${snapshotName}.${field} is too long.`;
      }
    }
  }

  return null;
}
