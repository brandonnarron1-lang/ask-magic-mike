import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { normalizeEmailEvent } from "@/lib/adapters/email-webhook-normalizer";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const TERMINAL_FAILURES = new Set(["bounced", "complained", "suppressed", "failed"]);

function safeHeader(request: NextRequest, name: string) {
  const value = request.headers.get(name);
  return value && /^[A-Za-z0-9_.,=+\-/ ]{1,500}$/.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  if ((process.env.RESEND_WEBHOOK_ENABLED || "false").toLowerCase() !== "true") {
    return NextResponse.json({ ok: false, error: "webhook_disabled" }, { status: 409, headers: NO_STORE });
  }
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503, headers: NO_STORE });
  const messageId = safeHeader(request, "svix-id");
  const timestamp = safeHeader(request, "svix-timestamp");
  const signature = safeHeader(request, "svix-signature");
  if (!messageId || !timestamp || !signature) {
    return NextResponse.json({ ok: false, error: "signature_headers_required" }, { status: 400, headers: NO_STORE });
  }
  const raw = await request.text();
  if (!raw || raw.length > 256_000) {
    return NextResponse.json({ ok: false, error: "invalid_payload_size" }, { status: 400, headers: NO_STORE });
  }
  let payload: unknown;
  try {
    payload = new Webhook(secret).verify(raw, {
      "svix-id": messageId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400, headers: NO_STORE });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });
  }

  const normalized = normalizeEmailEvent(payload);
  if (normalized.provider !== "resend") {
    return NextResponse.json({ ok: false, error: "provider_mismatch" }, { status: 400, headers: NO_STORE });
  }
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  const sql = neon(process.env.DATABASE_URL);
  const existing = await sql.query(
    `SELECT id, processing_status FROM public.provider_webhook_events
      WHERE provider = 'resend' AND provider_event_id = $1 LIMIT 1`,
    [messageId],
  ) as Array<{ id: string; processing_status: string }>;
  if (existing[0]) {
    return NextResponse.json({ ok: true, duplicate: true, event_type: normalized.eventType }, { headers: NO_STORE });
  }

  const notificationRows = normalized.providerMessageId
    ? await sql.query(
      `SELECT id, lead_id, status FROM public.lead_notifications
        WHERE provider = 'resend' AND provider_message_id = $1 LIMIT 1`,
      [normalized.providerMessageId],
    ) as Array<{ id: string; lead_id: string; status: string }>
    : [];
  const notification = notificationRows[0] || null;
  const processingStatus = notification ? "processed" : "ignored";

  await sql.query(
    `INSERT INTO public.provider_webhook_events
      (provider, provider_event_id, provider_message_id, event_type, signature_verified,
       processing_status, payload_hash, occurred_at, processed_at, metadata)
     VALUES ('resend', $1, $2, $3, true, $4, $5, $6::timestamptz, now(), $7::jsonb)
     ON CONFLICT (provider, provider_event_id) DO NOTHING`,
    [messageId, normalized.providerMessageId, normalized.eventType, processingStatus,
      payloadHash, normalized.timestamp,
      JSON.stringify({ matched_notification: Boolean(notification) })],
  );

  if (notification) {
    const terminal = TERMINAL_FAILURES.has(normalized.eventType);
    await sql.query(
      `UPDATE public.lead_notifications
          SET status = CASE WHEN $1 THEN 'permanently_failed' ELSE status END,
              error_code = CASE WHEN $1 THEN $2 ELSE error_code END,
              error_summary = CASE WHEN $1 THEN 'Provider lifecycle event requires review.' ELSE error_summary END,
              failed_at = CASE WHEN $1 THEN COALESCE(failed_at, now()) ELSE failed_at END,
              updated_at = now(),
              metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE id = $4::uuid`,
      [terminal, `resend_${normalized.eventType}`,
        JSON.stringify({ provider_last_event: normalized.eventType, provider_last_event_at: normalized.timestamp }),
        notification.id],
    );
    await sql.query(
      `INSERT INTO public.communication_events
        (lead_id, lead_notification_id, provider_event_id, event_type, channel, occurred_at, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'email', $5::timestamptz, $6::jsonb)
       ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING`,
      [notification.lead_id, notification.id, messageId, normalized.eventType,
        normalized.timestamp, JSON.stringify({ provider: "resend", signature_verified: true })],
    );
    if (["bounced", "complained", "suppressed"].includes(normalized.eventType)) {
      await sql.query(
        `UPDATE public.leads SET email_suppressed = true, updated_at = now() WHERE id = $1::uuid`,
        [notification.lead_id],
      );
    }
  }

  return NextResponse.json({
    ok: true,
    duplicate: false,
    event_type: normalized.eventType,
    matched_notification: Boolean(notification),
  }, { headers: NO_STORE });
}
