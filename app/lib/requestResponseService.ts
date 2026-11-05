import { neon } from "@neondatabase/serverless";
import { assertProviderDeliveryAllowed } from "../../src/lib/preview-security";
import { configuredEmailProvider, emailProviderConfigurationReady } from "./emailProviderConfiguration";
import { agentPushNotificationsEnabled, customerEmailEnabled, emailNotificationsEnabled, notificationMode, productionNotificationDeliveryEnabled, selectNotificationProvider } from "./leadNotificationProvider";
import type { NotificationProvider, NotificationResult } from "./leadNotificationTypes";
import { launchAttemptOutcome } from "./leadAlertLaunch";
import { requestResponseDraft, RESPONSE_TEMPLATE, responseMailbox } from "./requestResponseTemplates";

type Query = Pick<ReturnType<typeof neon>, "query">;
type Row = Record<string, unknown>;
type Snapshot = { version: 1; kind: "inquiry" | "appointment"; audience: "customer" | "mike" | "brandon" | "staff_push";
  recipient: string; from?: string; reply_to?: string; body: { subject: string; text: string; html?: string } };
export function readResponseSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Snapshot;
  if (s.version !== 1 || !["inquiry", "appointment"].includes(s.kind) || !["customer", "mike", "brandon", "staff_push"].includes(s.audience) ||
    !s.body || typeof s.body.subject !== "string" || /[\r\n]/.test(s.body.subject) || s.body.subject.length > 240 ||
    typeof s.body.text !== "string" || s.body.text.length > 10000 || (s.body.html !== undefined && (typeof s.body.html !== "string" || s.body.html.length > 30000))) return null;
  if (s.audience === "staff_push") return typeof s.recipient === "string" && /^[a-f\d-]{36}$/i.test(s.recipient) ? s : null;
  if (!responseMailbox(s.recipient) || typeof s.from !== "string" || s.from.length > 320 || /[\r\n]/.test(s.from) ||
    (s.audience === "customer" && !responseMailbox(s.reply_to))) return null;
  return s;
}

/** Uses the SAME outbox and existing cron. Nothing runs until separately
 * enabled. SQL claims atomically recheck inquiry-specific permission/current
 * suppression, active device and fixed recipient. Unknown is never retryable. */
export async function processRequestResponses(dependencies: { sql?: Query; provider?: NotificationProvider; notificationId?: string } = {}) {
  if (process.env.REQUEST_RESPONSE_WORKER_ENABLED !== "true" || !assertProviderDeliveryAllowed().ok ||
    notificationMode() !== "production" || !productionNotificationDeliveryEnabled()) return { processed: 0, scope: "request_response_v1" };
  const sql = dependencies.sql || (process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null);
  if (!sql) return { processed: 0, scope: "request_response_v1" };
  const config = requestResponseDraft();
  const emailReady = emailNotificationsEnabled() && configuredEmailProvider() === "resend" && emailProviderConfigurationReady();
  const receiptsReady = emailReady && config.receipts && !!config.reply_to && customerEmailEnabled();
  const pushReady = agentPushNotificationsEnabled();
  const due = await sql.query(`SELECT id,recipient_type,channel FROM public.lead_notifications
    WHERE template_version=$1 AND status IN ('pending','retry_scheduled') AND provider_message_id IS NULL
      AND NOT EXISTS(SELECT 1 FROM public.leads l WHERE l.id=lead_notifications.lead_id AND (l.is_test OR l.communication_suppressed))
      AND attempt_count<max_attempts AND coalesce(next_attempt_at,created_at)<=now()
      AND ($2::uuid IS NULL OR id=$2::uuid)
      AND ((channel='push' AND $3::boolean) OR (channel='email' AND $4::boolean
        AND (recipient_type<>'customer' OR $5::boolean)))
      AND (first_provider_attempt_at IS NULL OR first_provider_attempt_at>now()-interval '23 hours')
    ORDER BY created_at,id LIMIT 4`, [RESPONSE_TEMPLATE, dependencies.notificationId || null, pushReady, emailReady, receiptsReady]) as Row[];
  const deadline = Date.now() + 20000;
  let processed = 0;
  for (const n of due) {
    if (Date.now() >= deadline) break;
    if (n.recipient_type === "customer" && (!config.receipts || !config.reply_to || !customerEmailEnabled())) continue;
    if (n.channel === "push" ? !agentPushNotificationsEnabled() : (!emailNotificationsEnabled() || configuredEmailProvider() !== "resend" || !emailProviderConfigurationReady())) continue;
    // Permission is checked in the fenced claim, not a stale preflight read.
    const rows = await sql.query("SELECT * FROM public.claim_request_response_v1($1::uuid,$2::timestamptz)", [n.id, config.cutoff]) as Row[];
    const claimed = rows[0];
    if (!claimed) continue;
    const s = readResponseSnapshot(claimed.private_response_snapshot);
    let result: NotificationResult;
    if (!s) result = { ok: false, provider: "resend", retryable: false, errorCode: "request_response_snapshot_invalid", errorSummary: "Request receipt requires review." };
    else try {
      result = await (dependencies.provider || selectNotificationProvider()).send({ notificationId: String(n.id),
        channel: n.channel === "push" ? "push" : "email", recipient: s.recipient, frozenFrom: s.from,
        replyTo: s.reply_to, subject: s.body.subject, text: s.body.text, html: s.body.html,
        intakeV6: true, deliveryTimeoutMs: Math.min(5000, deadline - Date.now()), idempotencyKey: String(claimed.idempotency_key) });
    } catch { result = { ok: false, provider: "resend", retryable: false, ambiguous: true, errorCode: "provider_acceptance_ambiguous", errorSummary: "Reconcile before retry." }; }
    const outcome = launchAttemptOutcome({ result, attempt: Number(claimed.attempt_count), maxAttempts: Number(claimed.max_attempts),
      firstAttemptAt: new Date(claimed.first_provider_attempt_at as string).toISOString(), now: Date.now() });
    await sql.query("SELECT public.finish_request_response_v1($1::uuid,$2::uuid,$3::jsonb)", [n.id, claimed.response_claim_token, JSON.stringify(outcome)]);
    processed++;
  }
  return { processed, scope: "request_response_v1" };
}
