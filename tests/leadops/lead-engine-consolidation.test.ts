import { afterEach, describe, expect, it, vi } from "vitest";
import { renderConsumerAcknowledgment, renderLeadAlert, renderLeadAlertSms } from "../../app/lib/leadAlertTemplates";
import { scoreLead } from "../../app/lib/leadScoring";
import { routeLead } from "../../app/lib/leadRouting";
import { agentPushNotificationsEnabled, ResendEmailNotificationProvider, TwilioSmsNotificationProvider } from "../../app/lib/leadNotificationProvider";
import { normalizeLeadNotificationRow } from "../../app/lib/persistence/supabase/leadNotificationRepository";
import { safeAnalyticsProperties } from "../../app/lib/serverAnalytics";
import { normalizeLeadPayload, type LeadPayload } from "../../app/lib/leadPayload";

const ENV_KEYS = [
  "EMAIL_ENABLED",
  "LEAD_NOTIFICATION_MODE",
  "LEAD_NOTIFICATION_PRODUCTION_ENABLED",
  "RESEND_API_KEY",
  "AGENT_NOTIFICATION_FROM_EMAIL",
  "AGENT_SMS_NOTIFICATIONS_ENABLED",
  "AGENT_PUSH_NOTIFICATIONS_ENABLED",
  "ENABLE_SMS",
  "SMS_PROVIDER",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_PHONE",
  "NEXT_PUBLIC_SITE_URL",
] as const;
const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const payload: LeadPayload = {
  funnel_type: "seller",
  lead_source_surface: "seller_page",
  lead_type: "seller",
  name: "INTERNAL QA — DO NOT CONTACT",
  address: "1 Synthetic QA Road",
  email: "qa@example.test",
  phone: "252-555-0100",
  timeline: "ASAP",
  notes: "INTERNAL QA — DO NOT CONTACT",
  is_test: true,
  consent_email: false,
  consent_call: false,
  consent_sms: false,
  consent_language_version: "amm_contact_v2",
  attribution: {
    source: "AskMagicMike.com QA",
    medium: "qa",
    campaign: "lead-engine-proof",
    placement_id: "qa-form",
    first_touch: { source: "qa" },
    last_touch: { source: "qa", campaign: "lead-engine-proof" },
  },
  status: "new",
  assigned_agent_id: null,
};

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ENV_KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("same-day lead engine contract", () => {
  it("forces unmistakable internal QA markers into the test/suppression path", () => {
    const normalized = normalizeLeadPayload({
      funnel_type: "seller",
      name: "INTERNAL QA — DO NOT CONTACT",
      notes: "Production launch verification only",
    });
    expect(normalized.is_test).toBe(true);
  });

  it("scores deterministically and explains the factors without protected data", () => {
    const score = scoreLead(payload);
    expect(score.version).toBe("deterministic_v1");
    expect(score.score).toBeGreaterThanOrEqual(80);
    expect(score.factors.map((factor) => factor.code)).toContain("timeline_immediate");
    expect(score.explanation).toContain("Immediate timeline");
    expect(score.explanation.toLowerCase()).not.toContain("race");
  });

  it("derives a source-explicit Mike fallback routing decision", () => {
    const decision = routeLead(payload, 92);
    expect(decision.owner).toBe("mike");
    expect(decision.sourceLabel).toContain("AskMagicMike.com QA");
    expect(decision.routingReason).toContain("no separately approved recipient mapping");
  });

  it("keeps open-house registration in the same explainable route", () => {
    const openHouse: LeadPayload = {
      ...payload,
      funnel_type: "open_house",
      lead_source_surface: "open_house",
      lead_type: "open_house",
      property_id: "listing-qa-001",
      attribution: { ...payload.attribution, placement_id: "open-house:listing-qa-001" },
    };
    const decision = routeLead(openHouse, scoreLead(openHouse).score);
    expect(decision.intentLabel).toBe("Open House");
    expect(decision.sourceLabel).toContain("open-house:listing-qa-001");
    expect(scoreLead(openHouse).factors.map((factor) => factor.code)).toContain("open_house_intent");
  });

  it("renders the required QA subject and internal details while keeping a test warning", () => {
    const score = scoreLead(payload);
    const rendered = renderLeadAlert({
      leadId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      correlationId: "33333333-3333-4333-8333-333333333333",
      payload,
      score,
      routing: routeLead(payload, score.score),
      submittedAt: "2026-08-10T21:00:00.000Z",
    });
    expect(rendered.subject).toContain("[TEST]");
    expect(rendered.subject).toContain("AskMagicMike.com QA");
    expect(rendered.subject).toContain("Score");
    expect(rendered.text).toContain("QA TEST — DO NOT CONTACT");
    expect(rendered.text).toContain("Not a survey.");
    expect(rendered.html).not.toContain("LEAD_NOTIFICATION_BCC");
    expect(rendered.visualTemplate.id).toBe("qa_test");
    expect(rendered.html).toContain("lead-alert-frame-v1.png");
    expect(rendered.html).toContain("Open secure Lead Center");
  });

  it("renders a consumer acknowledgment without inventing a result or response time", () => {
    const rendered = renderConsumerAcknowledgment({ payload: { ...payload, is_test: false, name: "Jane Seller", consent_email: true } });
    expect(rendered.text).toContain("received your request");
    expect(rendered.text).not.toContain("valuation is");
    expect(rendered.text).not.toContain("within 5 minutes");
  });

  it("renders a minimal internal SMS with urgency, source, score, and a secure lead link", () => {
    const livePayload = { ...payload, is_test: false, city: "Wilson", name: "Private Person" };
    const score = scoreLead(livePayload);
    const rendered = renderLeadAlertSms({
      leadId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      correlationId: "33333333-3333-4333-8333-333333333333",
      payload: livePayload,
      score,
      routing: routeLead(livePayload, score.score),
      submittedAt: "2026-08-11T17:00:00.000Z",
    });
    expect(rendered.text).toContain("[HOT]");
    expect(rendered.text).toContain("Score");
    expect(rendered.text).toContain("/admin/leads/11111111-1111-4111-8111-111111111111");
    expect(rendered.text).not.toContain("Private Person");
    expect(rendered.text).not.toContain("qa@example.test");
  });

  it("keeps free phone push delivery explicitly gated and preserves the push outbox channel", () => {
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    expect(agentPushNotificationsEnabled()).toBe(true);
    const row = normalizeLeadNotificationRow({
      id: "notification-push-1",
      lead_id: "lead-1",
      notification_type: "lead_alert",
      channel: "push",
      recipient_type: "internal",
      template_version: "push-v1",
      idempotency_key: "lead:push:1",
      status: "pending",
    });
    expect(row.channel).toBe("push");
    expect(row.recipient_type).toBe("internal");
  });

  it("removes sensitive keys from analytics properties", () => {
    expect(safeAnalyticsProperties({ email: "qa@example.test", phone: "2525550100", address: "1 Synthetic QA Road", score: 92, funnel_name: "seller" })).toEqual({ score: 92 });
  });

  it("passes the hidden BCC and safe reply-to through the existing Resend provider", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.LEAD_NOTIFICATION_MODE = "production";
    process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "true";
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    let body: Record<string, unknown> | undefined;
    const provider = new ResendEmailNotificationProvider("production", async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ id: "msg_synthetic_123" }), { status: 200 });
    });
    const result = await provider.send({
      notificationId: "notification-1",
      channel: "email",
      recipient: "mike@ourtownproperties.com",
      bcc: ["audit@example.test"],
      replyTo: "qa@example.test",
      subject: "[TEST] SELLER LEAD | AskMagicMike.com QA | Home Value | Wilson | INTERNAL QA | Score 92",
      text: "INTERNAL QA — DO NOT CONTACT",
      idempotencyKey: "lead_alert:lead-1:v1",
    });
    expect(result).toMatchObject({ ok: true, providerMessageId: "msg_synthetic_123" });
    expect(body).toMatchObject({ to: "mike@ourtownproperties.com", bcc: ["audit@example.test"], reply_to: "qa@example.test" });
  });

  it("retains a sanitized provider rejection without leaking recipient addresses", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.LEAD_NOTIFICATION_MODE = "production";
    process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "true";
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    const provider = new ResendEmailNotificationProvider("production", async () =>
      new Response(
        JSON.stringify({ message: "Testing is limited to private@example.test\nRetry later" }),
        { status: 400 },
      ),
    );
    const result = await provider.send({
      notificationId: "notification-2",
      channel: "email",
      recipient: "mike@ourtownproperties.com",
      subject: "[TEST] SELLER LEAD",
      text: "INTERNAL QA — DO NOT CONTACT",
      idempotencyKey: "lead_alert:lead-2:v1",
    });
    expect(result).toMatchObject({
      ok: false,
      errorCode: "resend_http_400",
      errorSummary: "Testing is limited to [redacted-email] Retry later",
    });
  });

  it("sends a Twilio MMS request with status callback and same-origin urgency art", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "production";
    process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "true";
    process.env.AGENT_SMS_NOTIFICATIONS_ENABLED = "true";
    process.env.ENABLE_SMS = "true";
    process.env.SMS_PROVIDER = "twilio";
    process.env.TWILIO_ACCOUNT_SID = `AC${"a".repeat(32)}`;
    process.env.TWILIO_AUTH_TOKEN = "synthetic-auth-token";
    process.env.TWILIO_FROM_PHONE = "2525550100";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.askmagicmike.com";
    let submitted = "";
    const provider = new TwilioSmsNotificationProvider(async (_input, init) => {
      submitted = String(init?.body || "");
      return new Response(JSON.stringify({ sid: `SM${"b".repeat(32)}`, status: "queued" }), { status: 201 });
    });
    const result = await provider.send({
      notificationId: "notification-sms-1",
      channel: "sms",
      recipient: "2525550101",
      text: "[HOT] SELLER LEAD | Wilson | Score 90",
      mediaUrls: ["https://www.askmagicmike.com/images/ask-magic-mike/notifications/lead-alert-hot-v2.png", "https://evil.example/tracker.png"],
      idempotencyKey: "lead_alert:lead-1:sms:primary",
    });
    const form = new URLSearchParams(submitted);
    expect(result).toMatchObject({ ok: true, provider: "twilio", providerMessageId: `SM${"b".repeat(32)}` });
    expect(form.get("To")).toBe("+12525550101");
    expect(form.get("StatusCallback")).toBe("https://www.askmagicmike.com/api/webhooks/sms/status");
    expect(form.getAll("MediaUrl")).toEqual(["https://www.askmagicmike.com/images/ask-magic-mike/notifications/lead-alert-hot-v2.png"]);
  });
});
