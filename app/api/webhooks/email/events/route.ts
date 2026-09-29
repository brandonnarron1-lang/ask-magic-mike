import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { normalizeEmailEvent, type EmailEventType } from "@/lib/adapters/email-webhook-normalizer";
import { isPreviewRuntime } from "@/lib/preview-security";

export const runtime = "nodejs";

const MAX_WEBHOOK_BODY_BYTES = 256_000;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;
const TERMINAL_FAILURES = new Set<EmailEventType>([
  "bounced",
  "complained",
  "suppressed",
  "failed",
]);
const PROVIDER_ACCEPTED_DELIVERY = new Set<EmailEventType>([
  "sent",
  "delivered",
  "opened",
  "clicked",
]);
const SUPPRESSION_EVENTS = new Set<EmailEventType>([
  "bounced",
  "complained",
  "suppressed",
]);
const RESEND_EVENT_ALLOWLIST = new Set<EmailEventType>([
  "sent",
  "delivered",
  "delivery_delayed",
  "bounced",
  "complained",
  "failed",
  "opened",
  "clicked",
]);

type AtomicWebhookResult = {
  claimed: boolean;
  matched_notification: boolean;
  processing_status: "processed" | "ignored" | "failed" | null;
  recorded_payload_hash: string | null;
  notification_updated: number | string;
  communication_recorded: number | string;
  lead_suppressed: number | string;
};

class WebhookPayloadTooLargeError extends Error {}

function safeHeader(request: NextRequest, name: string) {
  const value = request.headers.get(name);
  return value && /^[A-Za-z0-9_.,=+\-/ ]{1,500}$/.test(value) ? value : null;
}

function safeProviderMessageId(value: string | null) {
  return value && /^[\x21-\x7E]{1,500}$/.test(value) ? value : null;
}

function safeTimestamp(value: string) {
  if (value.length > 80) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
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

async function recordResendEventAtomically(input: {
  providerEventId: string;
  providerMessageId: string;
  eventType: EmailEventType;
  payloadHash: string;
  occurredAt: string;
}) {
  if (!process.env.DATABASE_URL) throw new Error("database_not_configured");
  const sql = neon(process.env.DATABASE_URL);
  const terminal = TERMINAL_FAILURES.has(input.eventType);
  const acceptedDelivery = PROVIDER_ACCEPTED_DELIVERY.has(input.eventType);
  const suppressEmail = SUPPRESSION_EVENTS.has(input.eventType);
  const notificationMetadata = JSON.stringify({
    provider_last_event: input.eventType,
    provider_last_event_at: input.occurredAt,
    ...(input.eventType === "delivered" ? { provider_delivery_confirmed: true } : {}),
    ...(terminal ? { provider_terminal_failure: true } : {}),
  });

  // Every lifecycle mutation is one PostgreSQL statement. If any downstream
  // write fails, the receipt insert rolls back too, so a provider retry can be
  // processed instead of being mistaken for a completed duplicate.
  return await sql.query(
    `WITH notification_candidate AS MATERIALIZED (
       SELECT notification.id, notification.lead_id
         FROM public.lead_notifications AS notification
        WHERE notification.provider = 'resend'
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
         'resend', $1, $2, $3, true,
         CASE WHEN EXISTS (SELECT 1 FROM notification_candidate) THEN 'processed' ELSE 'ignored' END,
         $4, NULL, $5::timestamptz, now(), now(),
         jsonb_build_object(
           'matched_notification', EXISTS (SELECT 1 FROM notification_candidate),
           'processing_contract', 'atomic_v1'
         )
       )
       ON CONFLICT (provider, provider_event_id) DO UPDATE
         SET provider_message_id = EXCLUDED.provider_message_id,
             event_type = EXCLUDED.event_type,
             signature_verified = EXCLUDED.signature_verified,
             processing_status = EXCLUDED.processing_status,
             payload_hash = EXCLUDED.payload_hash,
             error_code = NULL,
             occurred_at = EXCLUDED.occurred_at,
             processed_at = now(),
             metadata = EXCLUDED.metadata
       WHERE receipt.processing_status = 'failed'
       RETURNING receipt.id, receipt.processing_status, receipt.payload_hash
     ),
     matched_notification AS (
       SELECT candidate.id, candidate.lead_id
         FROM notification_candidate AS candidate
        WHERE EXISTS (SELECT 1 FROM claimed_webhook)
     ),
     notification_update AS (
       UPDATE public.lead_notifications AS notification
          SET status = CASE WHEN $6::boolean THEN 'permanently_failed' ELSE notification.status END,
              error_code = CASE WHEN $6::boolean THEN $7 ELSE notification.error_code END,
              error_summary = CASE
                WHEN $6::boolean THEN 'Provider lifecycle event requires review.'
                ELSE notification.error_summary
              END,
              failed_at = CASE
                WHEN $6::boolean THEN COALESCE(notification.failed_at, now())
                ELSE notification.failed_at
              END,
              sent_at = CASE
                WHEN $8::boolean THEN COALESCE(notification.sent_at, $5::timestamptz, now())
                ELSE notification.sent_at
              END,
              updated_at = now(),
              metadata = COALESCE(notification.metadata, '{}'::jsonb) || $9::jsonb
         FROM matched_notification AS matched
        WHERE notification.id = matched.id
       RETURNING notification.id
     ),
     communication_insert AS (
       INSERT INTO public.communication_events
         (lead_id, lead_notification_id, provider_event_id, event_type,
          channel, occurred_at, metadata)
       SELECT matched.lead_id, matched.id, $1, $3, 'email', $5::timestamptz,
              jsonb_build_object(
                'provider', 'resend',
                'signature_verified', true,
                'processing_contract', 'atomic_v1'
              )
         FROM matched_notification AS matched
       ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING
       RETURNING id
     ),
     lead_suppression AS (
       UPDATE public.leads AS lead
          SET email_suppressed = true, updated_at = now()
         FROM matched_notification AS matched
        WHERE $10::boolean
          AND lead.id = matched.lead_id
          AND lead.email_suppressed = false
       RETURNING lead.id
     )
     SELECT
       EXISTS (SELECT 1 FROM claimed_webhook) AS claimed,
       EXISTS (SELECT 1 FROM matched_notification) AS matched_notification,
       COALESCE(
         (SELECT processing_status FROM claimed_webhook LIMIT 1),
         (SELECT processing_status
            FROM public.provider_webhook_events
           WHERE provider = 'resend' AND provider_event_id = $1
           LIMIT 1)
       ) AS processing_status,
       COALESCE(
         (SELECT payload_hash FROM claimed_webhook LIMIT 1),
         (SELECT payload_hash
            FROM public.provider_webhook_events
           WHERE provider = 'resend' AND provider_event_id = $1
           LIMIT 1)
       ) AS recorded_payload_hash,
       (SELECT count(*)::int FROM notification_update) AS notification_updated,
       (SELECT count(*)::int FROM communication_insert) AS communication_recorded,
       (SELECT count(*)::int FROM lead_suppression) AS lead_suppressed`,
    [
      input.providerEventId,
      input.providerMessageId,
      input.eventType,
      input.payloadHash,
      input.occurredAt,
      terminal,
      `resend_${input.eventType}`,
      acceptedDelivery,
      notificationMetadata,
      suppressEmail,
    ],
  ) as AtomicWebhookResult[];
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  if ((process.env.RESEND_WEBHOOK_ENABLED || "false").toLowerCase() !== "true") {
    return webhookResponse(correlationId, { ok: false, error: "webhook_disabled" }, 409);
  }
  if (isPreviewRuntime()) {
    return webhookResponse(correlationId, { ok: false, error: "preview_data_disabled" }, 503);
  }
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return webhookResponse(correlationId, { ok: false, error: "webhook_not_configured" }, 503);
  }
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return webhookResponse(correlationId, { ok: false, error: "unsupported_media_type" }, 415);
  }
  const providerEventId = safeHeader(request, "svix-id");
  const timestamp = safeHeader(request, "svix-timestamp");
  const signature = safeHeader(request, "svix-signature");
  if (!providerEventId || !timestamp || !signature) {
    return webhookResponse(correlationId, { ok: false, error: "signature_headers_required" }, 400);
  }

  let raw: string;
  try {
    raw = await readBoundedRawBody(request);
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
  if (!raw) {
    return webhookResponse(correlationId, { ok: false, error: "invalid_request_body" }, 400);
  }

  let payload: unknown;
  try {
    payload = new Webhook(secret).verify(raw, {
      "svix-id": providerEventId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
  } catch {
    return webhookResponse(correlationId, { ok: false, error: "invalid_signature" }, 400);
  }

  const normalized = normalizeEmailEvent(payload);
  if (normalized.provider !== "resend") {
    return webhookResponse(correlationId, { ok: false, error: "provider_mismatch" }, 400);
  }
  if (!RESEND_EVENT_ALLOWLIST.has(normalized.eventType)) {
    return webhookResponse(correlationId, { ok: false, error: "event_not_supported" }, 422);
  }
  const providerMessageId = safeProviderMessageId(normalized.providerMessageId);
  const occurredAt = safeTimestamp(normalized.timestamp);
  if (!providerMessageId || !occurredAt) {
    return webhookResponse(correlationId, { ok: false, error: "invalid_provider_event" }, 400);
  }
  if (!process.env.DATABASE_URL) {
    return webhookResponse(correlationId, { ok: false, error: "database_not_configured" }, 503);
  }

  const payloadHash = createHash("sha256").update(raw).digest("hex");
  let rows: AtomicWebhookResult[];
  try {
    rows = await recordResendEventAtomically({
      providerEventId,
      providerMessageId,
      eventType: normalized.eventType,
      payloadHash,
      occurredAt,
    });
  } catch {
    console.error("[resend-webhook] atomic persistence failed", {
      correlationId,
      error: "database_unavailable",
    });
    return webhookResponse(correlationId, { ok: false, error: "database_unavailable" }, 503);
  }

  const result = rows[0];
  if (!result || !result.processing_status || !result.recorded_payload_hash) {
    console.error("[resend-webhook] atomic persistence returned no receipt", {
      correlationId,
      error: "receipt_not_confirmed",
    });
    return webhookResponse(correlationId, { ok: false, error: "database_unavailable" }, 503);
  }
  if (!result.claimed && result.recorded_payload_hash !== payloadHash) {
    return webhookResponse(correlationId, { ok: false, error: "event_id_conflict" }, 409);
  }
  if (!result.claimed) {
    return webhookResponse(correlationId, {
      ok: true,
      duplicate: true,
      event_type: normalized.eventType,
    });
  }

  return webhookResponse(correlationId, {
    ok: true,
    duplicate: false,
    event_type: normalized.eventType,
    matched_notification: Boolean(result.matched_notification),
  });
}
