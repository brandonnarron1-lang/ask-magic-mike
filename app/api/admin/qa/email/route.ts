import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { messagingFeatureFlags, approvedQaRecipientConfigured } from "@/lib/messaging/feature-flags";
import { renderBrandedEmail } from "@/lib/messaging/template-registry";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

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

  const recipient = (process.env.QA_EMAIL_RECIPIENT || "").trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AGENT_NOTIFICATION_FROM_EMAIL || process.env.RESEND_FROM || process.env.FROM_EMAIL;
  if (!apiKey || !from || /[\r\n]/.test(from)) {
    return NextResponse.json({ ok: false, error: "provider_not_configured" }, { status: 503, headers: NO_STORE });
  }

  const rendered = renderBrandedEmail({
    subject: "Phase 6 message acceptance",
    preheader: "Controlled Brandon-only QA email",
    heading: "Phase 6 email rendering is ready for review.",
    body: "This is a synthetic internal acceptance message. No consumer lead exists, no person should be contacted, and no Mike notification was requested. Review branding, mobile layout, links, and reply behavior before authorizing any consumer automation.",
    ctaLabel: "Open Ask Magic Mike",
    ctaUrl: "https://www.askmagicmike.com/",
    isTest: true,
  });

  const idempotencyKey = `phase6-brandon-qa:${environment}:${process.env.VERCEL_GIT_COMMIT_SHA || "preview"}:v1`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: recipient,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    }),
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ ok: false, error: "provider_network_error" }, { status: 502, headers: NO_STORE });
  }
  if (!response.ok) {
    return NextResponse.json({ ok: false, error: `provider_http_${response.status}` }, { status: 502, headers: NO_STORE });
  }
  const provider = await response.json().catch(() => ({})) as { id?: unknown };
  const providerMessageId = safeProviderId(provider.id);
  if (!providerMessageId) {
    return NextResponse.json({ ok: false, error: "provider_message_id_missing" }, { status: 502, headers: NO_STORE });
  }
  return NextResponse.json({
    ok: true,
    provider: "resend",
    provider_message_id: providerMessageId,
    recipient: "approved_brandon_qa",
    subject: rendered.subject,
    mike_delivery_requested: false,
    consumer_delivery_requested: false,
  }, { headers: NO_STORE });
}
