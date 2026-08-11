import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/lib/adapters/twilio-signature";

const NO_STORE = { "Cache-Control": "no-store" };
const ALLOWED_STATUSES = new Set(["accepted", "queued", "sending", "sent", "delivered", "failed", "undelivered"]);
const TERMINAL_STATUSES = new Set(["delivered", "failed", "undelivered"]);

function canonicalCallbackUrl(req: NextRequest) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
  return `${origin}${req.nextUrl.pathname}${req.nextUrl.search}`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const form = new URLSearchParams(body);
  const params: Record<string, string> = {};
  for (const [key, value] of form) params[key] = value;

  const verification = verifyTwilioSignature({
    url: canonicalCallbackUrl(req),
    providedSignature: req.headers.get("x-twilio-signature"),
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    formParams: params,
  });
  if (!verification.ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const messageSid = (params.MessageSid || params.SmsSid || "").trim();
  const providerStatus = (params.MessageStatus || params.SmsStatus || "").trim().toLowerCase();
  const errorCode = (params.ErrorCode || "").trim().slice(0, 32) || null;
  if (!/^SM[a-f0-9]{32}$/i.test(messageSid) || !ALLOWED_STATUSES.has(providerStatus)) {
    return NextResponse.json({ ok: false, error: "invalid_status_payload" }, { status: 400, headers: NO_STORE });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503, headers: NO_STORE });
  }

  const sql = neon(process.env.DATABASE_URL);
  const terminal = TERMINAL_STATUSES.has(providerStatus);
  const failed = providerStatus === "failed" || providerStatus === "undelivered";
  const rows = await sql.query(
    `UPDATE public.lead_notifications
       SET status = CASE
             WHEN metadata->>'provider_delivery_status' IN ('delivered','failed','undelivered') THEN status
             WHEN $2::boolean THEN 'permanently_failed'
             ELSE 'sent'
           END,
           sent_at = CASE WHEN NOT $2::boolean THEN COALESCE(sent_at, now()) ELSE sent_at END,
           failed_at = CASE WHEN $2::boolean THEN now() ELSE failed_at END,
           error_code = CASE WHEN $2::boolean THEN COALESCE($3, 'twilio_delivery_failed') ELSE NULL END,
           error_summary = CASE WHEN $2::boolean THEN 'Twilio reported an unsuccessful carrier delivery.' ELSE NULL END,
           metadata = metadata || jsonb_build_object(
             'provider_delivery_status',
             CASE WHEN metadata->>'provider_delivery_status' IN ('delivered','failed','undelivered')
                  THEN metadata->>'provider_delivery_status' ELSE $4 END,
             'provider_status_recorded_at', now(),
             'provider_status_terminal', $5::boolean
           )
     WHERE provider = 'twilio' AND provider_message_id = $1
     RETURNING id`,
    [messageSid, failed, errorCode, providerStatus, terminal],
  );

  return NextResponse.json({ ok: true, matched: (rows as unknown[]).length }, { headers: NO_STORE });
}
