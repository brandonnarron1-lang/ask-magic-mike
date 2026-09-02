import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/lib/adapters/twilio-signature";
import { isPreviewRuntime } from "@/lib/preview-security";

export const runtime = "nodejs";

const MAX_WEBHOOK_BODY_BYTES = 20_000;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;
const ALLOWED_STATUSES = new Set([
  "accepted",
  "queued",
  "sending",
  "sent",
  "delivered",
  "failed",
  "undelivered",
]);
const STATUS_RANK: Record<string, number> = {
  accepted: 10,
  queued: 20,
  sending: 30,
  sent: 40,
  failed: 50,
  undelivered: 50,
  delivered: 60,
};
const TERMINAL_FAILURES = new Set(["failed", "undelivered"]);

type AtomicSmsStatusResult = {
  claimed: boolean;
  matched_notification: boolean;
  processing_status: "processed" | "ignored" | "failed" | null;
  recorded_payload_hash: string | null;
  notification_updated: number | string;
  communication_recorded: number | string;
};

class WebhookPayloadTooLargeError extends Error {}

function canonicalCallbackUrl(request: NextRequest) {
  let origin = "https://www.askmagicmike.com";
  try {
    origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || origin).origin;
  } catch {
    // Retain the canonical origin; malformed optional input cannot broaden it.
  }
  return `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`;
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

async function recordTwilioStatusAtomically(input: {
  providerEventId: string;
  providerMessageId: string;
  providerStatus: string;
  providerErrorCode: string | null;
  payloadHash: string;
  statusRank: number;
}) {
  if (!process.env.DATABASE_URL) throw new Error("database_not_configured");
  const sql = neon(process.env.DATABASE_URL);
  const terminalFailure = TERMINAL_FAILURES.has(input.providerStatus);

  // Twilio does not provide a unique status-event ID, so providerEventId is a
  // deterministic SID + status key. Every lifecycle mutation remains in this
  // one statement: a downstream failure rolls back the receipt and preserves
  // provider retryability.
  return await sql.query(
    `WITH notification_candidate AS MATERIALIZED (
       SELECT notification.id, notification.lead_id
         FROM public.lead_notifications AS notification
        WHERE notification.provider = 'twilio'
          AND notification.provider_message_id = $2
        ORDER BY notification.created_at DESC, notification.id
        LIMIT 1
     ),
     claimed_webhook AS (
       INSERT INTO public.provider_webhook_events AS receipt
         (provider, provider_event_id, provider_message_id, event_type,
          signature_verified, processing_status, payload_hash, error_code,
          occurred_at, received_at, processed_at, metadata)
       VALUES (
         'twilio', $1, $2, $3, true,
         CASE WHEN EXISTS (SELECT 1 FROM notification_candidate) THEN 'processed' ELSE 'ignored' END,
         $5, $4, NULL, now(), now(),
         jsonb_build_object(
           'matched_notification', EXISTS (SELECT 1 FROM notification_candidate),
           'processing_contract', 'atomic_v1',
           'provider_status_rank', $6::int
         )
       )
       ON CONFLICT (provider, provider_event_id) DO UPDATE
         SET provider_message_id = EXCLUDED.provider_message_id,
             event_type = EXCLUDED.event_type,
             signature_verified = EXCLUDED.signature_verified,
             processing_status = EXCLUDED.processing_status,
             payload_hash = EXCLUDED.payload_hash,
             error_code = EXCLUDED.error_code,
             processed_at = now(),
             metadata = EXCLUDED.metadata
       WHERE receipt.processing_status = 'failed'
          OR (
            receipt.processing_status = 'ignored'
            AND EXISTS (SELECT 1 FROM notification_candidate)
          )
       RETURNING receipt.id, receipt.processing_status, receipt.payload_hash, receipt.metadata
     ),
     matched_notification AS (
       SELECT candidate.id, candidate.lead_id
         FROM notification_candidate AS candidate
        WHERE EXISTS (SELECT 1 FROM claimed_webhook)
     ),
     notification_update AS (
       UPDATE public.lead_notifications AS notification
          SET status = CASE
                WHEN $7::boolean THEN 'permanently_failed'
                WHEN $3 IN ('sent', 'delivered') THEN 'sent'
                ELSE notification.status
              END,
              sent_at = CASE
                WHEN $3 IN ('sent', 'delivered') THEN COALESCE(notification.sent_at, now())
                ELSE notification.sent_at
              END,
              failed_at = CASE
                WHEN $7::boolean THEN COALESCE(notification.failed_at, now())
                WHEN $3 = 'delivered' THEN NULL
                ELSE notification.failed_at
              END,
              error_code = CASE
                WHEN $7::boolean THEN COALESCE($4, 'twilio_delivery_failed')
                WHEN $3 = 'delivered' THEN NULL
                ELSE notification.error_code
              END,
              error_summary = CASE
                WHEN $7::boolean THEN 'Twilio reported an unsuccessful carrier delivery.'
                WHEN $3 = 'delivered' THEN NULL
                ELSE notification.error_summary
              END,
              next_attempt_at = CASE WHEN $7::boolean THEN NULL ELSE notification.next_attempt_at END,
              updated_at = now(),
              metadata = COALESCE(notification.metadata, '{}'::jsonb) || jsonb_build_object(
                'provider_delivery_status', $3,
                'provider_status_recorded_at', now(),
                'provider_status_terminal', $3 IN ('delivered', 'failed', 'undelivered'),
                'provider_terminal_failure', $7::boolean,
                'provider_delivery_confirmed', $3 = 'delivered',
                'provider_status_rank', $6::int,
                'processing_contract', 'atomic_v1'
              )
         FROM matched_notification AS matched
        WHERE notification.id = matched.id
          AND CASE COALESCE(notification.metadata->>'provider_delivery_status', '')
                WHEN 'accepted' THEN 10
                WHEN 'queued' THEN 20
                WHEN 'sending' THEN 30
                WHEN 'sent' THEN 40
                WHEN 'failed' THEN 50
                WHEN 'undelivered' THEN 50
                WHEN 'delivered' THEN 60
                ELSE 0
              END < $6::int
       RETURNING notification.id
     ),
     communication_insert AS (
       INSERT INTO public.communication_events
         (lead_id, lead_notification_id, provider_event_id, event_type,
          channel, occurred_at, metadata)
       SELECT matched.lead_id, matched.id, $1, $3, 'sms', now(),
              jsonb_build_object(
                'provider', 'twilio',
                'signature_verified', true,
                'status_applied', EXISTS (SELECT 1 FROM notification_update),
                'provider_status_rank', $6::int,
                'processing_contract', 'atomic_v1'
              )
         FROM matched_notification AS matched
       ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING
       RETURNING id
     )
     SELECT
       EXISTS (SELECT 1 FROM claimed_webhook) AS claimed,
       COALESCE(
         (SELECT true FROM matched_notification LIMIT 1),
         (SELECT COALESCE((receipt.metadata->>'matched_notification')::boolean, false)
            FROM public.provider_webhook_events AS receipt
           WHERE receipt.provider = 'twilio' AND receipt.provider_event_id = $1
           LIMIT 1),
         false
       ) AS matched_notification,
       COALESCE(
         (SELECT processing_status FROM claimed_webhook LIMIT 1),
         (SELECT processing_status
            FROM public.provider_webhook_events
           WHERE provider = 'twilio' AND provider_event_id = $1
           LIMIT 1)
       ) AS processing_status,
       COALESCE(
         (SELECT payload_hash FROM claimed_webhook LIMIT 1),
         (SELECT payload_hash
            FROM public.provider_webhook_events
           WHERE provider = 'twilio' AND provider_event_id = $1
           LIMIT 1)
       ) AS recorded_payload_hash,
       (SELECT count(*)::int FROM notification_update) AS notification_updated,
       (SELECT count(*)::int FROM communication_insert) AS communication_recorded`,
    [
      input.providerEventId,
      input.providerMessageId,
      input.providerStatus,
      input.providerErrorCode,
      input.payloadHash,
      input.statusRank,
      terminalFailure,
    ],
  ) as AtomicSmsStatusResult[];
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  if (isPreviewRuntime()) {
    return webhookResponse(correlationId, { ok: false, error: "preview_data_disabled" }, 503);
  }
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  if (!authToken) {
    return webhookResponse(correlationId, { ok: false, error: "webhook_not_configured" }, 503);
  }
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") {
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

  const form = new URLSearchParams(rawBody);
  const params: Record<string, string> = {};
  let duplicateParameter = false;
  for (const [key, value] of form) {
    if (Object.prototype.hasOwnProperty.call(params, key)) duplicateParameter = true;
    params[key] = value;
  }
  if (duplicateParameter) {
    return webhookResponse(correlationId, { ok: false, error: "invalid_status_payload" }, 400);
  }
  const verification = verifyTwilioSignature({
    url: canonicalCallbackUrl(request),
    providedSignature: request.headers.get("x-twilio-signature"),
    authToken,
    formParams: params,
  });
  if (!verification.ok) {
    return webhookResponse(correlationId, { ok: false, error: "unauthorized" }, 401);
  }

  const providerMessageId = (params.MessageSid || params.SmsSid || "").trim();
  const providerStatus = (params.MessageStatus || params.SmsStatus || "").trim().toLowerCase();
  const rawErrorCode = (params.ErrorCode || "").trim();
  const providerErrorCode = /^\d{1,10}$/.test(rawErrorCode) ? `twilio_${rawErrorCode}` : null;
  if (
    (params.MessageSid && params.SmsSid && params.MessageSid !== params.SmsSid) ||
    (params.MessageStatus && params.SmsStatus && params.MessageStatus.toLowerCase() !== params.SmsStatus.toLowerCase()) ||
    !/^(?:SM|MM)[a-f0-9]{32}$/i.test(providerMessageId) ||
    !ALLOWED_STATUSES.has(providerStatus) ||
    (rawErrorCode && !providerErrorCode)
  ) {
    return webhookResponse(correlationId, { ok: false, error: "invalid_status_payload" }, 400);
  }
  if (!process.env.DATABASE_URL) {
    return webhookResponse(correlationId, { ok: false, error: "database_not_configured" }, 503);
  }

  const providerEventId = `twilio:sms-status:${providerMessageId}:${providerStatus}`;
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({ providerMessageId, providerStatus, providerErrorCode }))
    .digest("hex");
  let rows: AtomicSmsStatusResult[];
  try {
    rows = await recordTwilioStatusAtomically({
      providerEventId,
      providerMessageId,
      providerStatus,
      providerErrorCode,
      payloadHash,
      statusRank: STATUS_RANK[providerStatus],
    });
  } catch {
    console.error("[twilio-status-webhook] atomic persistence failed", {
      correlationId,
      error: "database_unavailable",
    });
    return webhookResponse(correlationId, { ok: false, error: "database_unavailable" }, 503);
  }

  const result = rows[0];
  if (!result || !result.processing_status || !result.recorded_payload_hash) {
    console.error("[twilio-status-webhook] atomic persistence returned no receipt", {
      correlationId,
      error: "receipt_not_confirmed",
    });
    return webhookResponse(correlationId, { ok: false, error: "database_unavailable" }, 503);
  }

  return webhookResponse(correlationId, {
    ok: true,
    duplicate: !result.claimed,
    matched: result.matched_notification ? 1 : 0,
    status: providerStatus,
    applied: Number(result.notification_updated) > 0,
  });
}
