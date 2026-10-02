import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { verifyTwilioSignature } from "@/lib/adapters/twilio-signature";
import { classifyInboundSms } from "@/lib/messaging/sms-policy";
import { isPreviewRuntime } from "@/lib/preview-security";

export const runtime = "nodejs";

const MAX_WEBHOOK_BODY_BYTES = 20_000;
const MAX_MESSAGE_CHARACTERS = 1_600;
const MOCK_EVENT_ID = /^mock_[a-z0-9_-]{8,100}$/i;
const TWILIO_EVENT_ID = /^(?:SM|MM)[a-f0-9]{32}$/i;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

type InboundMode = "twilio" | "mock";
type InboundClassification = ReturnType<typeof classifyInboundSms>;
type AtomicInboundResult = {
  claimed: boolean;
  matched_leads: number | string;
  processing_status: "processed" | "ignored" | "failed" | null;
  recorded_payload_hash: string | null;
  communication_recorded: number | string;
  suppressed_leads: number | string;
  permission_rows: number | string;
  stopped_sequences: number | string;
};

class WebhookPayloadTooLargeError extends Error {}

function canonicalCallbackUrl(request: NextRequest) {
  let origin = "https://www.askmagicmike.com";
  try {
    origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || origin).origin;
  } catch {
    // A malformed optional value cannot broaden the canonical callback origin.
  }
  return `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function webhookResponse(
  correlationId: string,
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    { ...body, correlation_id: correlationId },
    {
      status,
      headers: {
        ...RESPONSE_HEADERS,
        "X-AMM-Correlation-Id": correlationId,
      },
    },
  );
}

function isProductionRuntime() {
  const vercelEnvironment = (process.env.VERCEL_ENV || "").trim().toLowerCase();
  return vercelEnvironment === "production" ||
    (!vercelEnvironment && process.env.NODE_ENV === "production");
}

async function readBoundedRawBody(request: Request) {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const declaredBytes = Number(declared);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0) {
      throw new Error("invalid_content_length");
    }
    if (declaredBytes > MAX_WEBHOOK_BODY_BYTES) {
      throw new WebhookPayloadTooLargeError();
    }
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let raw = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_WEBHOOK_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new WebhookPayloadTooLargeError();
      }
      raw += decoder.decode(value, { stream: true });
    }
    return raw + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function normalizedUsPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return digits;
  if (/^1\d{10}$/.test(digits)) return digits.slice(1);
  return null;
}

function parseUniqueForm(rawBody: string) {
  const form = new URLSearchParams(rawBody);
  const params: Record<string, string> = {};
  for (const [key, value] of form) {
    if (Object.prototype.hasOwnProperty.call(params, key)) return null;
    params[key] = value;
  }
  return params;
}

function parseStrictMockPayload(rawBody: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const payload = parsed as Record<string, unknown>;
  const allowed = new Set(["from", "body", "message_id"]);
  if (Object.keys(payload).some((key) => !allowed.has(key))) return null;
  if (Object.keys(payload).length !== allowed.size) return null;
  if (Object.values(payload).some((value) => typeof value !== "string")) return null;
  return payload as { from: string; body: string; message_id: string };
}

async function recordInboundSmsAtomically(input: {
  providerEventId: string;
  providerMessageId: string;
  classification: InboundClassification;
  payloadHash: string;
  bodyHash: string;
  mode: InboundMode;
  signatureVerified: boolean;
  permissionSource: string;
  normalizedPhone: string;
}) {
  if (!process.env.DATABASE_URL) throw new Error("database_not_configured");
  const sql = neon(process.env.DATABASE_URL);

  // The receipt claim, timeline event, every matching lead suppression, every
  // permission row, and every sequence cancellation are one statement. A
  // downstream failure therefore rolls the receipt back and preserves retry.
  return await sql.query(
    `WITH matched_leads AS MATERIALIZED (
       SELECT lead.id, lead.is_duplicate, lead.duplicate_of_lead_id, lead.created_at
         FROM public.leads AS lead
        WHERE public.amm_normalize_phone(
                COALESCE(lead.normalized_phone, lead.phone_normalized, lead.phone)
              ) = $9
     ),
     canonical_lead AS MATERIALIZED (
       SELECT matched.id
         FROM matched_leads AS matched
        ORDER BY
          CASE WHEN matched.is_duplicate = false
                     AND matched.duplicate_of_lead_id IS NULL THEN 0 ELSE 1 END,
          matched.created_at,
          matched.id
        LIMIT 1
     ),
     claimed_webhook AS (
       INSERT INTO public.provider_webhook_events AS receipt
         (provider, provider_event_id, provider_message_id, event_type,
          signature_verified, processing_status, payload_hash, error_code,
          occurred_at, received_at, processed_at, metadata)
       VALUES (
         $6, $1, $2, 'sms.inbound.' || $3, $7,
         CASE WHEN EXISTS (SELECT 1 FROM matched_leads) THEN 'processed' ELSE 'ignored' END,
         $4, NULL, NULL, now(), now(),
         jsonb_build_object(
           'matched_leads', (SELECT count(*)::int FROM matched_leads),
           'classification', $3,
           'processing_contract', 'inbound_atomic_v1',
           'authenticated_by', CASE WHEN $7 THEN 'twilio_signature' ELSE 'admin_secret' END
         )
       )
       ON CONFLICT (provider, provider_event_id) DO UPDATE
         SET provider_message_id = EXCLUDED.provider_message_id,
             event_type = EXCLUDED.event_type,
             signature_verified = EXCLUDED.signature_verified,
             processing_status = EXCLUDED.processing_status,
             payload_hash = EXCLUDED.payload_hash,
             error_code = NULL,
             processed_at = now(),
             metadata = EXCLUDED.metadata
       WHERE receipt.payload_hash = EXCLUDED.payload_hash
         AND (
           receipt.processing_status = 'failed'
           OR (
             receipt.processing_status = 'ignored'
             AND EXISTS (SELECT 1 FROM matched_leads)
           )
         )
       RETURNING receipt.id, receipt.processing_status, receipt.payload_hash, receipt.metadata
     ),
     communication_insert AS (
       INSERT INTO public.communication_events
         (lead_id, provider_event_id, event_type, channel, occurred_at, metadata)
       SELECT canonical.id, $1, $3, 'sms', now(),
              jsonb_build_object(
                'provider', $6,
                'provider_message_id', $2,
                'body_hash', $5::text,
                'signature_verified', $7,
                'matched_leads', (SELECT count(*)::int FROM matched_leads),
                'processing_contract', 'inbound_atomic_v1'
              )
         FROM canonical_lead AS canonical
        WHERE EXISTS (SELECT 1 FROM claimed_webhook)
       ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING
       RETURNING id
     ),
     suppress_leads AS (
       UPDATE public.leads AS lead
          SET sms_suppressed = true,
              updated_at = now()
        WHERE lead.id IN (SELECT id FROM matched_leads)
          AND $3 = 'stop'
          AND EXISTS (SELECT 1 FROM claimed_webhook)
       RETURNING lead.id
     ),
     permission_opt_out AS (
       INSERT INTO public.communication_permissions
         (lead_id, channel, purpose, state, source, evidence_at, opted_out_at,
          manual_review_required, metadata, updated_at)
       SELECT matched.id, 'sms', purpose, 'opted_out', $8, now(), now(), false,
              jsonb_build_object(
                'provider_event_id', $1,
                'body_hash', $5::text,
                'processing_contract', 'inbound_atomic_v1'
              ),
              now()
         FROM matched_leads AS matched
         CROSS JOIN unnest(ARRAY[
           'requested_service_response', 'transactional_acknowledgment',
           'appointment_coordination', 'property_alert_subscription',
           'marketing_nurture', 'manual_one_to_one'
         ]) AS purpose
        WHERE $3 = 'stop'
          AND EXISTS (SELECT 1 FROM claimed_webhook)
       ON CONFLICT (lead_id, channel, purpose)
       DO UPDATE SET state = 'opted_out',
                     opted_out_at = now(),
                     updated_at = now(),
                     source = EXCLUDED.source,
                     manual_review_required = false,
                     metadata = EXCLUDED.metadata
       RETURNING id
     ),
     stopped_sequences AS (
       UPDATE public.message_sequence_instances AS sequence
          SET status = 'cancelled',
              stopped_at = now(),
              stop_reason = CASE WHEN $3 = 'stop' THEN 'opt_out' ELSE 'consumer_reply' END,
              last_transition_at = now(),
              last_transition_by = 'sms_inbound',
              updated_at = now()
        WHERE sequence.lead_id IN (SELECT id FROM matched_leads)
          AND $3 IN ('stop', 'reply')
          AND sequence.status IN (
            'draft', 'approval_required', 'test', 'scheduled', 'active', 'paused'
          )
          AND EXISTS (SELECT 1 FROM claimed_webhook)
       RETURNING sequence.id
     )
     SELECT
       EXISTS (SELECT 1 FROM claimed_webhook) AS claimed,
       COALESCE(
         (SELECT (receipt.metadata->>'matched_leads')::int FROM claimed_webhook AS receipt LIMIT 1),
         (SELECT COALESCE((receipt.metadata->>'matched_leads')::int, 0)
            FROM public.provider_webhook_events AS receipt
           WHERE receipt.provider = $6 AND receipt.provider_event_id = $1
           LIMIT 1),
         0
       ) AS matched_leads,
       COALESCE(
         (SELECT processing_status FROM claimed_webhook LIMIT 1),
         (SELECT processing_status
            FROM public.provider_webhook_events
           WHERE provider = $6 AND provider_event_id = $1
           LIMIT 1)
       ) AS processing_status,
       COALESCE(
         (SELECT payload_hash FROM claimed_webhook LIMIT 1),
         (SELECT payload_hash
            FROM public.provider_webhook_events
           WHERE provider = $6 AND provider_event_id = $1
           LIMIT 1)
       ) AS recorded_payload_hash,
       (SELECT count(*)::int FROM communication_insert) AS communication_recorded,
       (SELECT count(*)::int FROM suppress_leads) AS suppressed_leads,
       (SELECT count(*)::int FROM permission_opt_out) AS permission_rows,
       (SELECT count(*)::int FROM stopped_sequences) AS stopped_sequences`,
    [
      input.providerEventId,
      input.providerMessageId,
      input.classification,
      input.payloadHash,
      input.bodyHash,
      input.mode,
      input.signatureVerified,
      input.permissionSource,
      input.normalizedPhone,
    ],
  ) as AtomicInboundResult[];
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  if (isPreviewRuntime()) {
    return webhookResponse(correlationId, { ok: false, error: "preview_data_disabled" }, 503);
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  let mode: InboundMode;
  if (contentType === "application/x-www-form-urlencoded") {
    mode = "twilio";
    if (!process.env.TWILIO_AUTH_TOKEN) {
      return webhookResponse(correlationId, { ok: false, error: "webhook_not_configured" }, 503);
    }
  } else if (contentType === "application/json") {
    mode = "mock";
    if (isProductionRuntime()) {
      return webhookResponse(correlationId, { ok: false, error: "mock_webhook_disabled" }, 403);
    }
    const adminAuth = checkAdminAuth(request);
    if (!adminAuth.ok) {
      return webhookResponse(correlationId, { ok: false, error: adminAuth.error }, adminAuth.status);
    }
  } else {
    return webhookResponse(correlationId, { ok: false, error: "unsupported_media_type" }, 415);
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedRawBody(request);
  } catch (error) {
    return webhookResponse(
      correlationId,
      {
        ok: false,
        error: error instanceof WebhookPayloadTooLargeError
          ? "payload_too_large"
          : "invalid_request_body",
      },
      error instanceof WebhookPayloadTooLargeError ? 413 : 400,
    );
  }
  if (!rawBody) {
    return webhookResponse(correlationId, { ok: false, error: "invalid_request_body" }, 400);
  }

  let from: string;
  let body: string;
  let providerMessageId: string;
  let signatureVerified = false;

  if (mode === "twilio") {
    const params = parseUniqueForm(rawBody);
    if (!params) {
      return webhookResponse(correlationId, { ok: false, error: "invalid_inbound_payload" }, 400);
    }
    const verification = verifyTwilioSignature({
      url: canonicalCallbackUrl(request),
      providedSignature: request.headers.get("x-twilio-signature"),
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      formParams: params,
    });
    if (!verification.ok) {
      return webhookResponse(correlationId, { ok: false, error: "unauthorized" }, 401);
    }
    if (params.MessageSid && params.SmsSid && params.MessageSid !== params.SmsSid) {
      return webhookResponse(correlationId, { ok: false, error: "invalid_inbound_payload" }, 400);
    }
    from = (params.From || "").trim();
    body = (params.Body || "").trim();
    providerMessageId = (params.MessageSid || params.SmsSid || "").trim();
    signatureVerified = true;
  } else {
    const payload = parseStrictMockPayload(rawBody);
    if (!payload) {
      return webhookResponse(correlationId, { ok: false, error: "invalid_inbound_payload" }, 400);
    }
    from = payload.from.trim();
    body = payload.body.trim();
    providerMessageId = payload.message_id.trim();
  }

  const normalizedPhone = normalizedUsPhone(from);
  const eventIdValid = mode === "twilio"
    ? TWILIO_EVENT_ID.test(providerMessageId)
    : MOCK_EVENT_ID.test(providerMessageId);
  if (!normalizedPhone || !body || body.length > MAX_MESSAGE_CHARACTERS || !eventIdValid) {
    return webhookResponse(correlationId, { ok: false, error: "invalid_inbound_payload" }, 400);
  }
  if (!process.env.DATABASE_URL) {
    return webhookResponse(correlationId, { ok: false, error: "database_not_configured" }, 503);
  }

  const classification = classifyInboundSms(body);
  const providerEventId = `${mode}:${providerMessageId}:inbound`;
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({ mode, providerMessageId, normalizedPhone, body }))
    .digest("hex");
  const bodyHash = createHash("sha256").update(body).digest("hex");
  let rows: AtomicInboundResult[];
  try {
    rows = await recordInboundSmsAtomically({
      providerEventId,
      providerMessageId,
      classification,
      payloadHash,
      bodyHash,
      mode,
      signatureVerified,
      permissionSource: `${mode}_sms_inbound`,
      normalizedPhone,
    });
  } catch {
    console.error("[sms-inbound-webhook] atomic persistence failed", {
      correlationId,
      error: "database_unavailable",
    });
    return webhookResponse(correlationId, { ok: false, error: "database_unavailable" }, 503);
  }

  const result = rows[0];
  if (!result || !result.processing_status || !result.recorded_payload_hash) {
    console.error("[sms-inbound-webhook] atomic persistence returned no receipt", {
      correlationId,
      error: "receipt_not_confirmed",
    });
    return webhookResponse(correlationId, { ok: false, error: "database_unavailable" }, 503);
  }
  if (result.recorded_payload_hash !== payloadHash) {
    return webhookResponse(correlationId, { ok: false, error: "provider_event_conflict" }, 409);
  }

  const matchedLeads = Number(result.matched_leads || 0);
  const suppressedLeads = Number(result.suppressed_leads || 0);
  return webhookResponse(correlationId, {
    ok: true,
    mode,
    classification,
    duplicate: !result.claimed,
    processing_status: result.processing_status,
    matched_lead: matchedLeads > 0,
    matched_leads: matchedLeads,
    stop_applied: classification === "stop" && result.claimed && suppressedLeads > 0,
    suppressed_leads: suppressedLeads,
    permissions_updated: Number(result.permission_rows || 0),
    stopped_sequences: Number(result.stopped_sequences || 0),
  });
}
