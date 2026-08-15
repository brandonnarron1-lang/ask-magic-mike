import { assertProviderDeliveryAllowed } from "../../src/lib/preview-security";
import { neon } from "@neondatabase/serverless";
import { agentPushNotificationsEnabled, agentSmsNotificationsEnabled, normalizeUsSmsRecipient, notificationMode, safeRecipientReference, selectNotificationProvider } from "./leadNotificationProvider";
import { SupabaseLeadNotificationRepository } from "./persistence/supabase/leadNotificationRepository";
import { NeonLeadNotificationRepository } from "./persistence/neonLeadNotificationRepository";
import type { LeadNotificationRecord, LeadNotificationRepository, NotificationProvider } from "./leadNotificationTypes";
import type { LeadPayload } from "./leadPayload";
import { routeLead, type LeadRoutingDecision } from "./leadRouting";
import { scoreLead, type LeadScore } from "./leadScoring";
import { CONSUMER_ACK_TEMPLATE_VERSION, LEAD_ALERT_SMS_TEMPLATE_VERSION, LEAD_ALERT_TEMPLATE_VERSION, renderConsumerAcknowledgment, renderLeadAlert, renderLeadAlertSms } from "./leadAlertTemplates";
import { shouldAttachLeadAlertMedia, shouldQueueAgentUrgencySms, visualAssetUrl } from "./leadAlertVisualTemplates";
import { NeonPushSubscriptionRepository, type StaffPushRecipientRole } from "./persistence/neonPushSubscriptionRepository";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000];

export type LeadAlertInput = {
  leadId: string;
  sessionId: string;
  correlationId: string;
  payload: LeadPayload;
  score: LeadScore;
  routing: LeadRoutingDecision;
  submittedAt: string;
  duplicateOfLeadId?: string | null;
};

function nowIso() { return new Date().toISOString(); }
function pushPriority(score: number) { return score >= 80 ? "[HOT]" : score >= 60 ? "[ACTIVE]" : "[NEW]"; }
function nextAttemptAt(attempt: number) { return new Date(Date.now() + RETRY_DELAYS_MS[Math.min(Math.max(attempt - 1, 0), RETRY_DELAYS_MS.length - 1)]).toISOString(); }
function validEmail(value: string | undefined | null): value is string {
  return Boolean(value && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim()) && !/[\r\n]/.test(value));
}
function configuredBcc() {
  return (process.env.LEAD_NOTIFICATION_BCC || "").split(",").map((value) => value.trim()).filter(validEmail).slice(0, 5);
}
function configuredTo() { return validEmail(process.env.LEAD_NOTIFICATION_TO) ? process.env.LEAD_NOTIFICATION_TO!.trim() : "mike@ourtownproperties.com"; }
export function configuredInternalSmsRecipients() {
  const candidates = [
    { role: "primary", recipient: normalizeUsSmsRecipient(process.env.LEAD_SMS_TO) },
    { role: "copy", recipient: normalizeUsSmsRecipient(process.env.LEAD_SMS_COPY_TO) },
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate): candidate is { role: "primary" | "copy"; recipient: string } => {
    if (!candidate.recipient || seen.has(candidate.recipient)) return false;
    seen.add(candidate.recipient);
    return true;
  });
}
function notificationRepository(): LeadNotificationRepository {
  const neonRepository = NeonLeadNotificationRepository.fromEnv();
  if (neonRepository) return neonRepository;
  const legacyFallbackAllowed = process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
  if (legacyFallbackAllowed) return new SupabaseLeadNotificationRepository();
  throw new Error("canonical_notification_store_not_configured");
}
function replyTo(payload: LeadPayload) { return validEmail(payload.email) ? payload.email!.trim() : undefined; }
function safeError(value: string) { return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]").replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]").slice(0, 220); }

async function deliver(
  notification: LeadNotificationRecord,
  request: { channel: "email" | "sms" | "push"; recipient: string; subject?: string; text: string; html?: string; bcc?: string[]; replyTo?: string; mediaUrls?: string[] },
  repo: LeadNotificationRepository,
  provider: NotificationProvider,
) {
  const current = await repo.findById(notification.id) || notification;
  if (current.status === "sent") return current;
  if (notificationMode() === "disabled") {
    return await repo.update(current.id, { status: "skipped", provider: provider.name, error_code: "notifications_disabled", error_summary: "Notification provider mode is disabled.", failed_at: nowIso() }) || current;
  }
  if (request.channel === "sms" && !agentSmsNotificationsEnabled()) {
    return await repo.update(current.id, { status: "skipped", provider: provider.name, error_code: "agent_sms_notifications_disabled", error_summary: "Agent SMS notifications are disabled by configuration.", failed_at: nowIso() }) || current;
  }
  if (request.channel === "push" && !agentPushNotificationsEnabled()) {
    return await repo.update(current.id, { status: "skipped", provider: provider.name, error_code: "agent_push_notifications_disabled", error_summary: "Staff phone push notifications are disabled by configuration.", failed_at: nowIso() }) || current;
  }
  const nextAttempt = current.attempt_count + 1;
  if (nextAttempt > current.max_attempts) {
    return await repo.update(current.id, { status: "permanently_failed", error_code: "max_attempts_reached", error_summary: "Maximum notification attempts reached.", failed_at: nowIso() }) || current;
  }
  const claimed = await repo.claimForProcessing(current.id, { status: "processing", attempt_count: nextAttempt, provider: provider.name, error_code: null, error_summary: null });
  if (!claimed) return (await repo.findById(current.id)) || current;
  const result = await provider.send({ notificationId: claimed.id, channel: request.channel, recipient: request.recipient, subject: request.subject, text: request.text, html: request.html, mediaUrls: request.mediaUrls, bcc: request.bcc, replyTo: request.replyTo, idempotencyKey: claimed.idempotency_key });
  if (result.ok) return await repo.update(claimed.id, { status: "sent", provider: result.provider, provider_message_id: result.providerMessageId || null, sent_at: nowIso(), failed_at: null, error_code: null, error_summary: null, next_attempt_at: null }) || claimed;
  const retryable = result.retryable && nextAttempt < claimed.max_attempts;
  return await repo.update(claimed.id, { status: retryable ? "retry_scheduled" : "permanently_failed", provider: result.provider, error_code: result.errorCode, error_summary: safeError(result.errorSummary), failed_at: nowIso(), next_attempt_at: retryable ? nextAttemptAt(nextAttempt) : null }) || claimed;
}

async function enqueueOne(input: {
  leadId: string;
  type: "lead_alert" | "consumer_ack";
  templateVersion: string;
  recipient: string;
  channel: "email" | "sms" | "push";
  recipientRole?: StaffPushRecipientRole;
  recipientKey?: string;
  subject?: string;
  text: string;
  html?: string;
  mediaUrls?: string[];
  bcc?: string[];
  replyTo?: string;
  metadata: Record<string, unknown>;
  repo: LeadNotificationRepository;
  provider: NotificationProvider;
}) {
  const idempotencyKey = input.channel !== "email"
    ? `${input.type}:${input.leadId}:${input.templateVersion}:${input.channel}:${input.recipientRole || "internal"}:${input.recipientKey || "default"}`
    : `${input.type}:${input.leadId}:${input.templateVersion}`;
  const existing = await input.repo.findByIdempotencyKey(idempotencyKey);
  if (existing) return existing;
  const created = await input.repo.create({
    lead_id: input.leadId,
    agent_id: null,
    notification_type: input.type,
    channel: input.channel,
    recipient_type: input.type === "consumer_ack" ? "customer" : "internal",
    recipient_reference: input.channel === "sms" || input.channel === "push"
      ? `${input.channel}_${input.recipientRole || "internal"}_configured`
      : safeRecipientReference("email", input.recipient),
    template_version: input.templateVersion,
    idempotency_key: idempotencyKey,
    status: "pending",
    max_attempts: MAX_ATTEMPTS,
    provider: notificationMode(),
    metadata: { ...input.metadata, recipient_role: input.recipientRole || null, recipient_key: input.recipientKey || null },
  });
  return deliver(created, input, input.repo, input.provider);
}

async function loadLeadAlertInput(leadId: string, metadata: Record<string, unknown>): Promise<LeadAlertInput | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  const legacyFallbackAllowed = process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
  if (!databaseUrl && (!legacyFallbackAllowed || !baseUrl || !serviceRoleKey)) return null;
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  try {
    let leads: Array<Record<string, unknown>> = [];
    let attributions: Array<Record<string, unknown>> = [];
    if (databaseUrl) {
      const sql = neon(databaseUrl);
      const [leadRows, attributionRows] = await Promise.all([
        sql.query("SELECT * FROM public.leads WHERE id = $1::uuid LIMIT 1", [leadId]),
        sql.query("SELECT * FROM public.source_attribution WHERE lead_id = $1::uuid LIMIT 1", [leadId]),
      ]);
      leads = leadRows as Array<Record<string, unknown>>;
      attributions = attributionRows as Array<Record<string, unknown>>;
    } else {
      const leadUrl = new URL("/rest/v1/leads", baseUrl!);
      leadUrl.searchParams.set("id", `eq.${leadId}`);
      leadUrl.searchParams.set("select", "*");
      leadUrl.searchParams.set("limit", "1");
      const attributionUrl = new URL("/rest/v1/source_attribution", baseUrl!);
      attributionUrl.searchParams.set("lead_id", `eq.${leadId}`);
      attributionUrl.searchParams.set("select", "*");
      attributionUrl.searchParams.set("limit", "1");
      const [leadResponse, attributionResponse] = await Promise.all([
        fetch(leadUrl, { headers, cache: "no-store" }),
        fetch(attributionUrl, { headers, cache: "no-store" }),
      ]);
      if (!leadResponse.ok) return null;
      leads = await leadResponse.json() as Array<Record<string, unknown>>;
      attributions = attributionResponse.ok ? await attributionResponse.json() as Array<Record<string, unknown>> : [];
    }
    const row = leads[0];
    if (!row) return null;
    const attr = attributions[0] || {};
    const funnelType = row.lead_type === "buyer" ? "buyer" : row.lead_type === "renter" ? "renter" : row.lead_type === "open_house" ? "open_house" : row.lead_type === "seller" ? "seller" : row.lead_type === "home_value" ? "home_value" : "chat";
    const payload: LeadPayload = {
      funnel_type: funnelType,
      lead_source_surface: row.source === "widget" ? "widget" : row.lead_type === "buyer" || row.lead_type === "renter" ? "buyer_page" : row.lead_type === "open_house" ? "open_house" : row.lead_type === "seller" ? "seller_page" : "home_value_page",
      lead_type: typeof row.lead_type === "string" ? row.lead_type : undefined,
      address: typeof row.address_raw === "string" ? row.address_raw : undefined,
      property_address: typeof row.address_raw === "string" ? row.address_raw : undefined,
      name: [row.first_name, row.last_name].filter((value): value is string => typeof value === "string" && Boolean(value)).join(" ") || undefined,
      first_name: typeof row.first_name === "string" ? row.first_name : undefined,
      last_name: typeof row.last_name === "string" ? row.last_name : undefined,
      email: typeof row.email === "string" ? row.email : undefined,
      phone: typeof row.phone === "string" ? row.phone : undefined,
      city: typeof row.city === "string" ? row.city : undefined,
      target_geography: typeof row.target_geography === "string" ? row.target_geography : undefined,
      financing: typeof row.financing === "string" ? row.financing : undefined,
      preapproval: row.preapproval === true,
      timeline: typeof row.timeline_months === "number" ? String(row.timeline_months) : undefined,
      question: typeof row.question_raw === "string" ? row.question_raw : undefined,
      consent_email: row.consent_email === true,
      consent_call: row.consent_call === true,
      consent_sms: row.consent_sms === true,
      consent_language_version: typeof row.consent_language_version === "string" ? row.consent_language_version : undefined,
      consent_language_text: typeof row.consent_language_text === "string" ? row.consent_language_text : undefined,
      is_test: row.is_test === true,
      page_url: typeof row.page_url === "string" ? row.page_url : undefined,
      attribution: {
        source: typeof attr.utm_source === "string" ? attr.utm_source : typeof row.source === "string" ? row.source : undefined,
        medium: typeof attr.utm_medium === "string" ? attr.utm_medium : undefined,
        campaign: typeof attr.utm_campaign === "string" ? attr.utm_campaign : undefined,
        content: typeof attr.utm_content === "string" ? attr.utm_content : undefined,
        term: typeof attr.utm_term === "string" ? attr.utm_term : undefined,
        referrer: typeof attr.referrer_url === "string" ? attr.referrer_url : undefined,
        landing_page: typeof attr.landing_page === "string" ? attr.landing_page : undefined,
        parent_url: typeof row.page_url === "string" ? row.page_url : undefined,
        placement_id: typeof attr.placement_id === "string" ? attr.placement_id : undefined,
        listing_id: typeof attr.listing_id === "string" ? attr.listing_id : undefined,
        property_id: typeof attr.property_id === "string" ? attr.property_id : undefined,
        agent_id: typeof attr.agent_id === "string" ? attr.agent_id : undefined,
        first_touch: attr.first_touch && typeof attr.first_touch === "object" ? attr.first_touch as Record<string, string | undefined> : undefined,
        last_touch: attr.last_touch && typeof attr.last_touch === "object" ? attr.last_touch as Record<string, string | undefined> : undefined,
        ...(attr.click_ids && typeof attr.click_ids === "object" ? attr.click_ids as Record<string, string | undefined> : {}),
      },
      status: "new",
      assigned_agent_id: typeof row.assigned_agent_id === "string" ? row.assigned_agent_id : null,
      created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    };
    const calculated = scoreLead(payload);
    const score: LeadScore = {
      ...calculated,
      score: typeof row.score === "number" ? row.score : calculated.score,
      factors: Array.isArray(row.score_factors) ? row.score_factors as LeadScore["factors"] : calculated.factors,
    };
    const routing = routeLead(payload, score.score);
    if (typeof row.routing_reason === "string") routing.routingReason = row.routing_reason;
    return {
      leadId,
      sessionId: typeof row.session_id === "string" ? row.session_id : leadId,
      correlationId: typeof metadata.correlation_id === "string" ? metadata.correlation_id : `retry:${leadId}`,
      payload,
      score,
      routing,
      submittedAt: typeof row.created_at === "string" ? row.created_at : nowIso(),
      duplicateOfLeadId: typeof row.duplicate_of_lead_id === "string" ? row.duplicate_of_lead_id : null,
    };
  } catch {
    return null;
  }
}

export async function retryLeadAlertNotification(notificationId: string) {
  const repo = notificationRepository();
  const current = await repo.findById(notificationId);
  if (!current || !["lead_alert", "consumer_ack"].includes(current.notification_type)) return null;
  const input = await loadLeadAlertInput(current.lead_id, current.metadata);
  if (!input) return await repo.update(current.id, { status: "permanently_failed", error_code: "notification_context_missing", error_summary: "Lead context is missing for retry.", failed_at: nowIso() });
  const provider = selectNotificationProvider();
  if (current.notification_type === "consumer_ack") {
    if (!input.payload.email || !input.payload.consent_email || input.payload.is_test) {
      return await repo.update(current.id, { status: "skipped", error_code: "consumer_ack_not_permitted", error_summary: "Consumer acknowledgment is not permitted for this lead.", failed_at: nowIso() });
    }
    const rendered = renderConsumerAcknowledgment(input);
    return deliver(current, { channel: "email", recipient: input.payload.email, subject: rendered.subject, text: rendered.text, html: rendered.html, replyTo: process.env.SMTP_REPLY_TO || process.env.RESEND_FROM || process.env.FROM_EMAIL }, repo, provider);
  }
  if (current.channel === "sms") {
    if (input.payload.is_test) {
      return await repo.update(current.id, { status: "skipped", error_code: "test_lead_suppressed", error_summary: "QA test leads never trigger internal SMS.", failed_at: nowIso() });
    }
    const role = current.metadata.recipient_role === "copy" ? "copy" : "primary";
    const recipient = configuredInternalSmsRecipients().find((candidate) => candidate.role === role)?.recipient;
    if (!recipient) {
      return await repo.update(current.id, { status: "skipped", error_code: "sms_recipient_missing", error_summary: "The approved internal SMS recipient is not configured.", failed_at: nowIso() });
    }
    const sms = renderLeadAlertSms(input);
    const mediaUrls = shouldAttachLeadAlertMedia(false) ? [visualAssetUrl(sms.visualTemplate.backgroundAssetPath)] : undefined;
    return deliver(current, { channel: "sms", recipient, text: sms.text, mediaUrls }, repo, provider);
  }
  if (current.channel === "push") {
    if (input.payload.is_test) {
      return await repo.update(current.id, { status: "skipped", error_code: "test_lead_suppressed", error_summary: "QA test leads never trigger staff phone push notifications.", failed_at: nowIso() });
    }
    const subscriptionId = typeof current.metadata.subscription_id === "string" ? current.metadata.subscription_id : null;
    if (!subscriptionId) {
      return await repo.update(current.id, { status: "skipped", error_code: "push_subscription_missing", error_summary: "The approved phone notification subscription is missing.", failed_at: nowIso() });
    }
    const location = input.payload.city || input.payload.target_geography || "Wilson area";
    return deliver(current, { channel: "push", recipient: subscriptionId, subject: `${pushPriority(input.score.score)} ${input.routing.intentLabel}`, text: `${location} • Score ${input.score.score} • Open the secure Lead Center.` }, repo, provider);
  }
  const rendered = renderLeadAlert(input);
  return deliver(current, { channel: "email", recipient: configuredTo(), subject: rendered.subject, text: rendered.text, html: rendered.html, bcc: configuredBcc(), replyTo: rendered.safeEmail || undefined }, repo, provider);
}

export async function retryDueLeadAlertNotifications(limit = 25) {
  const repo = notificationRepository();
  const rows = await repo.listRetryable(limit);
  const results = [];
  for (const row of rows.filter((candidate) => ["lead_alert", "consumer_ack"].includes(candidate.notification_type))) {
    results.push(await retryLeadAlertNotification(row.id));
  }
  return results;
}

export async function enqueueLeadNotifications(input: LeadAlertInput) {
  const delivery = assertProviderDeliveryAllowed();
  if (!delivery.ok) return { internal: null, sms: [], push: [], consumer: null, warning: delivery.error };
  const repo = notificationRepository();
  const provider = selectNotificationProvider();
  const rendered = renderLeadAlert(input);
  try {
    const internal = await enqueueOne({
      leadId: input.leadId,
      type: "lead_alert",
      templateVersion: LEAD_ALERT_TEMPLATE_VERSION,
      channel: "email",
      recipient: configuredTo(),
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      bcc: configuredBcc(),
      replyTo: rendered.safeEmail || undefined,
      metadata: { source_label: input.routing.sourceLabel, intent_label: input.routing.intentLabel, score: input.score.score, score_grade: input.score.grade, is_test: input.payload.is_test === true, correlation_id: input.correlationId },
      repo,
      provider,
    });
    const smsRecipients = configuredInternalSmsRecipients();
    const smsEnabled = shouldQueueAgentUrgencySms({
      isTest: input.payload.is_test === true,
      score: input.score.score,
      hasApprovedSmsRecipient: smsRecipients.length > 0,
      smsDeliveryEnabled: true,
    });
    const smsNotifications: LeadNotificationRecord[] = [];
    if (smsEnabled) {
      const sms = renderLeadAlertSms(input);
      const mediaUrls = shouldAttachLeadAlertMedia(false) ? [visualAssetUrl(sms.visualTemplate.backgroundAssetPath)] : undefined;
      for (const destination of smsRecipients) {
        smsNotifications.push(await enqueueOne({
          leadId: input.leadId,
          type: "lead_alert",
          templateVersion: LEAD_ALERT_SMS_TEMPLATE_VERSION,
          channel: "sms",
          recipientRole: destination.role,
          recipient: destination.recipient,
          text: sms.text,
          mediaUrls,
          metadata: { source_label: input.routing.sourceLabel, intent_label: input.routing.intentLabel, score: input.score.score, score_grade: input.score.grade, is_test: false, correlation_id: input.correlationId, visual_template: sms.visualTemplate.id },
          repo,
          provider,
        }));
      }
    }
    const pushNotifications: LeadNotificationRecord[] = [];
    if (!input.payload.is_test && agentPushNotificationsEnabled() && process.env.DATABASE_URL) {
      const subscriptions = await new NeonPushSubscriptionRepository().listActive().catch(() => []);
      const location = input.payload.city || input.payload.target_geography || "Wilson area";
      for (const subscription of subscriptions) {
        pushNotifications.push(await enqueueOne({
          leadId: input.leadId,
          type: "lead_alert",
          templateVersion: `${LEAD_ALERT_SMS_TEMPLATE_VERSION}-push-1`,
          channel: "push",
          recipientRole: subscription.recipientRole,
          recipientKey: subscription.id,
          recipient: subscription.id,
          subject: `${pushPriority(input.score.score)} ${input.routing.intentLabel}`,
          text: `${location} • Score ${input.score.score} • Open the secure Lead Center.`,
          metadata: { source_label: input.routing.sourceLabel, intent_label: input.routing.intentLabel, score: input.score.score, score_grade: input.score.grade, is_test: false, correlation_id: input.correlationId, subscription_id: subscription.id },
          repo,
          provider,
        }));
      }
    }
    let consumer: LeadNotificationRecord | null = null;
    if (input.payload.email && input.payload.consent_email && !input.payload.is_test) {
      const ack = renderConsumerAcknowledgment(input);
      consumer = await enqueueOne({
        leadId: input.leadId,
        type: "consumer_ack",
        templateVersion: CONSUMER_ACK_TEMPLATE_VERSION,
        channel: "email",
        recipient: input.payload.email,
        subject: ack.subject,
        text: ack.text,
        html: ack.html,
        replyTo: process.env.SMTP_REPLY_TO || process.env.RESEND_FROM || process.env.FROM_EMAIL,
        metadata: { consent_language_version: input.payload.consent_language_version || null, correlation_id: input.correlationId },
        repo,
        provider,
      });
    }
    return { internal, sms: smsNotifications, push: pushNotifications, consumer, warning: null };
  } catch (error) {
    console.error("Lead notification enqueue failed", { lead_id: input.leadId, error: error instanceof Error ? error.message : "unknown" });
    return { internal: null, sms: [], push: [], consumer: null, warning: "notification_enqueue_failed" };
  }
}
