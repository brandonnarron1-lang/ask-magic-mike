import { timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { messagingFeatureFlags, approvedQaRecipientConfigured } from "@/lib/messaging/feature-flags";
import { decideCommunicationPermission } from "@/lib/messaging/permission-engine";
import { renderBrandedEmail } from "@/lib/messaging/template-registry";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const requestSchema = z.object({
  leadId: z.string().uuid(),
  qaAudience: z.enum(["brandon", "mike_view"]).default("brandon"),
});

function authorized(request: NextRequest) {
  const configured = process.env.QA_EMAIL_SEND_SECRET || "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function safeProviderId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const environment = process.env.VERCEL_ENV;
  const productionQaEnabled = (process.env.QA_EMAIL_PRODUCTION_ENABLED || "false").toLowerCase() === "true";
  if (environment !== "preview" && !(environment === "production" && productionQaEnabled)) {
    return NextResponse.json({ ok: false, error: "qa_environment_disabled" }, { status: 409, headers: NO_STORE });
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const flags = messagingFeatureFlags();
  if (!flags.qaEmail || !flags.qaRecipientOverride || !approvedQaRecipientConfigured()) {
    return NextResponse.json({ ok: false, error: "qa_delivery_not_configured" }, { status: 409, headers: NO_STORE });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });

  const sql = neon(process.env.DATABASE_URL);
  const leadRows = await sql.query(
    `SELECT id, is_test, communication_suppressed
       FROM public.leads WHERE id = $1::uuid LIMIT 1`,
    [parsed.data.leadId],
  ) as Array<{ id: string; is_test: boolean; communication_suppressed: boolean }>;
  const lead = leadRows[0];
  if (!lead) return NextResponse.json({ ok: false, error: "qa_lead_not_found" }, { status: 404, headers: NO_STORE });
  const permission = decideCommunicationPermission({
    channel: "email",
    purpose: "qa_test",
    isTest: lead.is_test,
    suppressed: lead.communication_suppressed,
    recipientIsApprovedQa: true,
    evidence: { release: "phase7", qa_audience: parsed.data.qaAudience },
    decisionSource: "phase7_qa_email_route",
  });
  if (!permission.allowed) {
    return NextResponse.json({ ok: false, error: permission.code }, { status: 409, headers: NO_STORE });
  }

  const recipient = (process.env.QA_EMAIL_RECIPIENT || "").trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AGENT_NOTIFICATION_FROM_EMAIL || process.env.RESEND_FROM || process.env.FROM_EMAIL;
  if (!apiKey || !from || /[\r\n]/.test(from)) {
    return NextResponse.json({ ok: false, error: "provider_not_configured" }, { status: 503, headers: NO_STORE });
  }
  const maxSends = Math.max(1, Math.min(Number(process.env.QA_EMAIL_MAX_SENDS) || 8, 8));
  const counts = await sql.query(
    `SELECT count(*)::int AS count FROM public.lead_notifications
      WHERE notification_type = 'phase7_qa_email'
        AND recipient_reference = 'approved_brandon_qa'
        AND status IN ('processing','sent')`,
  ) as Array<{ count: number }>;
  if ((counts[0]?.count || 0) >= maxSends) {
    return NextResponse.json({ ok: false, error: "qa_send_limit_reached" }, { status: 409, headers: NO_STORE });
  }

  const rendered = renderBrandedEmail({
    subject: "Phase 7 messaging release-candidate review",
    preheader: "Controlled Brandon-only QA email",
    heading: parsed.data.qaAudience === "mike_view" ? "Mike-view rendering is ready for Brandon’s review." : "Phase 7 email rendering is ready for review.",
    body: "This is a synthetic, suppressed internal acceptance message. No consumer communication is authorized, no Mike delivery was requested, and no contact action should be taken. Review branding, mobile layout, links, and reply behavior before any narrow pilot is considered.",
    ctaLabel: "Open message review studio",
    ctaUrl: "https://www.askmagicmike.com/admin/message-previews",
    isTest: true,
    qaAudience: parsed.data.qaAudience,
  });

  const idempotencyKey = `phase7-brandon-qa:${parsed.data.leadId}:${environment}:${process.env.VERCEL_GIT_COMMIT_SHA || "preview"}:${parsed.data.qaAudience}:v1`;
  const existingRows = await sql.query(
    `SELECT id, status, provider_message_id FROM public.lead_notifications
      WHERE idempotency_key = $1 LIMIT 1`,
    [idempotencyKey],
  ) as Array<{ id: string; status: string; provider_message_id: string | null }>;
  if (existingRows[0]?.status === "sent") {
    return NextResponse.json({
      ok: true, duplicate: true, provider: "resend", provider_message_id: existingRows[0].provider_message_id,
      recipient: "approved_brandon_qa", subject: rendered.subject,
      mike_delivery_requested: false, consumer_delivery_requested: false,
    }, { headers: NO_STORE });
  }
  const notificationRows = await sql.query(
    `INSERT INTO public.lead_notifications
      (lead_id, notification_type, channel, recipient_type, recipient_reference,
       template_version, idempotency_key, status, attempt_count, max_attempts, provider, metadata)
     VALUES ($1::uuid, 'phase7_qa_email', 'email', 'customer', 'approved_brandon_qa',
             'phase7-v1', $2, 'processing', 1, 1, 'resend', $3::jsonb)
     ON CONFLICT (idempotency_key)
     DO UPDATE SET updated_at = now()
     RETURNING id`,
    [parsed.data.leadId, idempotencyKey, JSON.stringify({ is_test: true, suppressed: true, qa_audience: parsed.data.qaAudience })],
  ) as Array<{ id: string }>;
  const notificationId = notificationRows[0]?.id;
  if (!notificationId) return NextResponse.json({ ok: false, error: "notification_record_failed" }, { status: 500, headers: NO_STORE });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from, to: recipient, subject: rendered.subject, text: rendered.text, html: rendered.html }),
  }).catch(() => null);
  if (!response?.ok) {
    await sql.query(
      `UPDATE public.lead_notifications SET status = 'failed', failed_at = now(), updated_at = now(),
              error_code = $1, error_summary = 'Controlled QA provider request failed.' WHERE id = $2::uuid`,
      [response ? `provider_http_${response.status}` : "provider_network_error", notificationId],
    );
    return NextResponse.json({ ok: false, error: response ? `provider_http_${response.status}` : "provider_network_error" }, { status: 502, headers: NO_STORE });
  }
  const provider = await response.json().catch(() => ({})) as { id?: unknown };
  const providerMessageId = safeProviderId(provider.id);
  if (!providerMessageId) return NextResponse.json({ ok: false, error: "provider_message_id_missing" }, { status: 502, headers: NO_STORE });
  await Promise.all([
    sql.query(
      `UPDATE public.lead_notifications SET status = 'sent', provider_message_id = $1,
              sent_at = now(), updated_at = now() WHERE id = $2::uuid`,
      [providerMessageId, notificationId],
    ),
    sql.query(
      `INSERT INTO public.communication_decisions
        (lead_id, channel, purpose, allowed, decision_code, explanation, is_test, actor, idempotency_key, metadata)
       VALUES ($1::uuid, 'email', 'qa_test', true, 'allowed', $2, true,
               'system/phase7_qa_email', $3, $4::jsonb)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [parsed.data.leadId, permission.explanation, `permission:${idempotencyKey}`,
        JSON.stringify({ notification_id: notificationId, qa_audience: parsed.data.qaAudience })],
    ),
  ]);
  return NextResponse.json({
    ok: true, duplicate: false, provider: "resend", provider_message_id: providerMessageId,
    recipient: "approved_brandon_qa", subject: rendered.subject,
    mike_delivery_requested: false, consumer_delivery_requested: false,
  }, { headers: NO_STORE });
}
