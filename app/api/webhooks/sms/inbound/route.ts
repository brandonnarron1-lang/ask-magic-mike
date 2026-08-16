import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { verifyTwilioSignature } from "@/lib/adapters/twilio-signature";
import { classifyInboundSms } from "@/lib/messaging/sms-policy";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const MOCK_EVENT_ID = /^mock_[a-z0-9_-]{8,100}$/i;
const TWILIO_EVENT_ID = /^SM[a-f0-9]{32}$/i;
const MAX_BODY_BYTES = 20_000;

function canonicalCallbackUrl(request: NextRequest) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
  return `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function normalizedPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413, headers: NO_STORE });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413, headers: NO_STORE });
  }
  let payload: Record<string, unknown> = {};
  let formParams: Record<string, string> | undefined;

  if (contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }
  } else {
    const form = new URLSearchParams(rawBody);
    formParams = Object.fromEntries(form.entries());
    payload = formParams;
  }

  const twilioEnabled =
    (process.env.SMS_PROVIDER || "").toLowerCase() === "twilio" &&
    (process.env.ENABLE_SMS || "false").toLowerCase() === "true";
  let mode: "twilio" | "mock" = "mock";

  if (twilioEnabled) {
    if (!contentType.includes("application/x-www-form-urlencoded") || !formParams) {
      return NextResponse.json({ ok: false, error: "unsupported_media_type" }, { status: 415, headers: NO_STORE });
    }
    const verification = verifyTwilioSignature({
      url: canonicalCallbackUrl(request),
      providedSignature: request.headers.get("x-twilio-signature"),
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      formParams,
    });
    if (!verification.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
    }
    mode = "twilio";
  } else {
    const adminAuth = checkAdminAuth(request);
    if (!adminAuth.ok) {
      return NextResponse.json({ ok: false, error: adminAuth.error }, { status: adminAuth.status, headers: NO_STORE });
    }
  }

  const from = String(payload.From ?? payload.from ?? "").trim();
  const body = String(payload.Body ?? payload.body ?? "").trim();
  const providerMessageId = String(payload.MessageSid ?? payload.message_id ?? "").trim();
  const normalizedPhone = normalizedPhoneDigits(from);
  const eventIdValid = mode === "twilio" ? TWILIO_EVENT_ID.test(providerMessageId) : MOCK_EVENT_ID.test(providerMessageId);

  if (!normalizedPhone || !body || body.length > 1600 || !eventIdValid) {
    return NextResponse.json({ ok: false, error: "invalid_inbound_payload" }, { status: 400, headers: NO_STORE });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503, headers: NO_STORE });
  }

  const classification = classifyInboundSms(body);
  const providerEventId = `${mode}:${providerMessageId}:inbound`;
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql.query(
    `WITH matched_lead AS (
       SELECT id
         FROM public.leads
        WHERE right(regexp_replace(COALESCE(normalized_phone, phone_normalized, phone, ''), '\\D', '', 'g'), 10)
              = right($1, 10)
        ORDER BY created_at DESC
        LIMIT 1
     ), inserted_event AS (
       INSERT INTO public.communication_events
         (lead_id, provider_event_id, event_type, channel, occurred_at, metadata)
       SELECT ml.id, $2, $3, 'sms', now(), $4::jsonb
         FROM (SELECT 1) seed
         LEFT JOIN matched_lead ml ON true
       ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING
       RETURNING id
     ), suppress_lead AS (
       UPDATE public.leads
          SET sms_suppressed = true,
              updated_at = now()
        WHERE id IN (SELECT id FROM matched_lead)
          AND $3 = 'stop'
          AND EXISTS (SELECT 1 FROM inserted_event)
       RETURNING id
     ), permission_opt_out AS (
       INSERT INTO public.communication_permissions
         (lead_id, channel, purpose, state, source, evidence_at, opted_out_at,
          manual_review_required, metadata, updated_at)
       SELECT ml.id, 'sms', purpose, 'opted_out', $5, now(), now(), false,
              jsonb_build_object('provider_event_id', $2, 'body_hash', $6), now()
         FROM matched_lead ml
         CROSS JOIN unnest(ARRAY[
           'requested_service_response', 'transactional_acknowledgment',
           'appointment_coordination', 'property_alert_subscription',
           'marketing_nurture', 'manual_one_to_one'
         ]) AS purpose
        WHERE $3 = 'stop' AND EXISTS (SELECT 1 FROM inserted_event)
       ON CONFLICT (lead_id, channel, purpose)
       DO UPDATE SET state = 'opted_out', opted_out_at = now(), updated_at = now(),
                     source = EXCLUDED.source, metadata = EXCLUDED.metadata
       RETURNING id
     ), stopped_sequences AS (
       UPDATE public.message_sequence_instances
          SET status = 'cancelled',
              stopped_at = now(),
              stop_reason = CASE WHEN $3 = 'stop' THEN 'opt_out' ELSE 'consumer_reply' END,
              last_transition_at = now(),
              last_transition_by = 'sms_inbound',
              updated_at = now()
        WHERE lead_id IN (SELECT id FROM matched_lead)
          AND $3 IN ('stop', 'reply')
          AND status IN ('draft', 'approval_required', 'test', 'scheduled', 'active', 'paused')
          AND EXISTS (SELECT 1 FROM inserted_event)
       RETURNING id
     )
     SELECT (SELECT id::text FROM matched_lead LIMIT 1) AS lead_id,
            EXISTS (SELECT 1 FROM inserted_event) AS inserted,
            EXISTS (SELECT 1 FROM suppress_lead) AS stop_applied,
            (SELECT count(*)::int FROM stopped_sequences) AS stopped_sequences`,
    [
      normalizedPhone,
      providerEventId,
      classification,
      JSON.stringify({ provider: mode, provider_message_id: providerMessageId, body_hash: bodyHash }),
      `${mode}_sms_inbound`,
      bodyHash,
    ],
  ) as Array<{ lead_id: string | null; inserted: boolean; stop_applied: boolean; stopped_sequences: number }>;

  const result = rows[0] || { lead_id: null, inserted: false, stop_applied: false, stopped_sequences: 0 };
  return NextResponse.json({
    ok: true,
    mode,
    classification,
    duplicate: !result.inserted,
    matched_lead: Boolean(result.lead_id),
    stop_applied: result.stop_applied,
    stopped_sequences: Number(result.stopped_sequences || 0),
  }, { headers: NO_STORE });
}
