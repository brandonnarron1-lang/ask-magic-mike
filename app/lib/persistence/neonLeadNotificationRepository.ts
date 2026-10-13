import { neon } from "@neondatabase/serverless";
import type {
  AssignmentNotificationAgent,
  AssignmentNotificationLead,
  LeadNotificationCreateInput,
  LeadNotificationRecord,
  LeadNotificationRepository,
} from "../leadNotificationTypes";
import { NOTIFICATION_PENDING_STALE_MINUTES } from "../leadNotificationRetryPolicy";
import { LAUNCH_LEAD_ALERT_TEMPLATE_VERSION, readFrozenLaunchAlert, type FrozenLaunchAlert } from "../leadAlertLaunch";
import {
  normalizeAssignmentAgentRow,
  normalizeAssignmentLeadRow,
  normalizeLeadNotificationRow,
} from "./supabase/leadNotificationRepository";

type Query = ReturnType<typeof neon>;
export type PrivateLaunchEnvelope = {
  notification: LeadNotificationRecord;
  snapshot: FrozenLaunchAlert;
  firstProviderAttemptAt: string | null;
};
export type LaunchAlertHealth = {
  unresolved_over_5m: number; ambiguous_over_5m: number;
  failed_over_5m: number; accepted_not_delivered_over_5m: number;
};
function launchRow(value: unknown): PrivateLaunchEnvelope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const snapshot = readFrozenLaunchAlert(raw.private_intake_snapshot);
  const notification = row(raw);
  if (!snapshot || !notification || snapshot.inquiry_id !== notification.lead_id || notification.template_version !== LAUNCH_LEAD_ALERT_TEMPLATE_VERSION) return null;
  const attempted = raw.first_provider_attempt_at;
  return { notification, snapshot, firstProviderAttemptAt: attempted instanceof Date ? attempted.toISOString() : typeof attempted === "string" ? attempted : null };
}

function queryFromEnv(env: Record<string, string | undefined> = process.env): Query | null {
  return env.DATABASE_URL ? neon(env.DATABASE_URL) : null;
}

const PATCH_COLUMNS = new Set([
  "status", "attempt_count", "max_attempts", "provider", "provider_message_id",
  "error_code", "error_summary", "next_attempt_at", "sent_at", "failed_at", "metadata",
]);

function row(value: unknown): LeadNotificationRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? normalizeLeadNotificationRow(value as Record<string, unknown>)
    : null;
}

/** Direct Postgres outbox repository. It deliberately persists delivery state
 * before provider delivery, and only accepts an allowlisted update patch. */
export class NeonLeadNotificationRepository implements LeadNotificationRepository {
  constructor(private readonly sql: Query) {}

  static fromEnv(env: Record<string, string | undefined> = process.env) {
    return env.DATABASE_URL ? new NeonLeadNotificationRepository(neon(env.DATABASE_URL)) : null;
  }

  async create(input: LeadNotificationCreateInput): Promise<LeadNotificationRecord> {
    const rows = await this.sql.query(
      `INSERT INTO public.lead_notifications (
        lead_id, agent_id, assignment_audit_id, assignment_event_at,
        notification_type, channel, recipient_type, recipient_reference,
        template_version, idempotency_key, status, max_attempts, provider, metadata
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::timestamptz,
        $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
      ) ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
      [
        input.lead_id, input.agent_id, input.assignment_audit_id || null,
        input.assignment_event_at || null, input.notification_type, input.channel,
        input.recipient_type, input.recipient_reference || null, input.template_version,
        input.idempotency_key, input.status || "pending", input.max_attempts ?? 3,
        input.provider || null, JSON.stringify(input.metadata || {}),
      ],
    );
    const created = row((rows as unknown[])[0]);
    if (created) return created;
    const existing = await this.findByIdempotencyKey(input.idempotency_key);
    if (existing) return existing;
    throw new Error("notification_create_failed");
  }

  async findById(id: string) {
    const rows = await this.sql.query("SELECT * FROM public.lead_notifications WHERE id = $1::uuid LIMIT 1", [id]);
    return row((rows as unknown[])[0]);
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    const rows = await this.sql.query("SELECT * FROM public.lead_notifications WHERE idempotency_key = $1 LIMIT 1", [idempotencyKey]);
    return row((rows as unknown[])[0]);
  }

  async update(id: string, patch: Partial<LeadNotificationRecord>) {
    const entries = Object.entries(patch).filter(([key]) => PATCH_COLUMNS.has(key));
    if (!entries.length) return this.findById(id);
    const values: unknown[] = [];
    const assignments = entries.map(([key, value], index) => {
      values.push(key === "metadata" ? JSON.stringify(value || {}) : value);
      return `${key} = $${index + 1}${key === "metadata" ? "::jsonb" : ""}`;
    });
    values.push(id);
    const rows = await this.sql.query(
      `UPDATE public.lead_notifications SET ${assignments.join(", ")} WHERE id = $${values.length}::uuid RETURNING *`,
      values,
    );
    return row((rows as unknown[])[0]);
  }

  async claimForProcessing(id: string, patch: Partial<LeadNotificationRecord>, options: { allowInitialInternalQa?: boolean } = {}) {
    const entries = Object.entries(patch).filter(([key]) => PATCH_COLUMNS.has(key));
    if (!entries.length) return null;
    const values: unknown[] = [];
    const assignments = entries.map(([key, value], index) => {
      values.push(key === "metadata" ? JSON.stringify(value || {}) : value);
      return `${key} = $${index + 1}${key === "metadata" ? "::jsonb" : ""}`;
    });
    values.push(id);
    const rows = await this.sql.query(
      `UPDATE public.lead_notifications SET ${assignments.join(", ")}
       WHERE id = $${values.length}::uuid
         AND status IN ('pending', 'failed', 'retry_scheduled')
         AND attempt_count < max_attempts
         AND provider_message_id IS NULL
         AND template_version <> 'lead_alert_email_v6'
         AND (status <> 'pending' OR attempt_count = 0)
         AND (status = 'pending' OR next_attempt_at <= now())
         AND NOT EXISTS (
           SELECT 1 FROM public.leads l WHERE l.id=lead_notifications.lead_id
             AND (COALESCE(l.is_test,false) OR COALESCE(l.communication_suppressed,false)
               OR COALESCE(l.email_suppressed,false) OR COALESCE(l.sms_suppressed,false))
             AND NOT (lead_notifications.notification_type='lead_alert'
               AND lead_notifications.channel='email' AND l.is_test=true
               AND lead_notifications.status='pending' AND lead_notifications.attempt_count=0
               AND $${values.length + 1}::boolean)
         ) RETURNING *`,
      [...values, options.allowInitialInternalQa === true],
    );
    return row((rows as unknown[])[0]);
  }

  async listRecent(limit = 50) {
    const rows = await this.sql.query(
      `SELECT n.*, l.is_test AS lead_is_test
         FROM public.lead_notifications n
         LEFT JOIN public.leads l ON l.id = n.lead_id
        ORDER BY n.created_at DESC
        LIMIT $1`,
      [Math.max(1, Math.min(limit, 100))],
    );
    return (rows as unknown[]).map(row).filter((value): value is LeadNotificationRecord => Boolean(value));
  }

  async listByLead(leadId: string, limit = 25) {
    const rows = await this.sql.query(
      `SELECT n.*, l.is_test AS lead_is_test
         FROM public.lead_notifications n
         LEFT JOIN public.leads l ON l.id = n.lead_id
        WHERE n.lead_id = $1::uuid
        ORDER BY n.created_at DESC
        LIMIT $2`,
      [leadId, Math.max(1, Math.min(limit, 50))],
    );
    return (rows as unknown[]).map(row).filter((value): value is LeadNotificationRecord => Boolean(value));
  }

  async listRetryable(limit = 25, now = new Date()) {
    const rows = await this.sql.query(
      `SELECT n.*, l.is_test AS lead_is_test
         FROM public.lead_notifications n
         LEFT JOIN public.leads l ON l.id = n.lead_id
        WHERE (
          (
            n.status IN ('failed', 'retry_scheduled')
            AND n.next_attempt_at <= $1::timestamptz
          )
          OR (
            n.status = 'pending'
            AND n.attempt_count = 0
            AND n.created_at <= $1::timestamptz
              - make_interval(mins => $2::int)
          )
        )
          AND n.attempt_count < n.max_attempts
          AND n.provider_message_id IS NULL
          AND n.template_version <> 'lead_alert_email_v6'
          AND left(n.notification_type,11) <> 'allocation_'
          AND l.is_test = false AND l.communication_suppressed = false
          AND l.email_suppressed = false AND l.sms_suppressed = false
        ORDER BY
          CASE WHEN n.status = 'pending' THEN n.created_at ELSE n.next_attempt_at END ASC,
          n.created_at ASC
        LIMIT $3`,
      [
        now.toISOString(),
        NOTIFICATION_PENDING_STALE_MINUTES,
        Math.max(1, Math.min(limit, 50)),
      ],
    );
    return (rows as unknown[]).map(row).filter((value): value is LeadNotificationRecord => Boolean(value));
  }

  /** Dedicated server-only reader. Normal notification DTOs omit the snapshot. */
  async findLaunchEnvelope(id: string): Promise<PrivateLaunchEnvelope | null> {
    const rows = await this.sql.query("SELECT * FROM public.lead_notifications WHERE id=$1::uuid AND template_version='lead_alert_email_v6'", [id]);
    return launchRow((rows as unknown[])[0]);
  }

  async listLaunchDue(cutoff: string, limit = 4): Promise<LeadNotificationRecord[]> {
    const rows = await this.sql.query(
      `SELECT n.*,l.is_test AS lead_is_test FROM public.lead_notifications n JOIN public.leads l ON l.id=n.lead_id
       WHERE n.template_version='lead_alert_email_v6' AND n.notification_type='lead_alert' AND n.channel='email' AND n.recipient_type='internal'
         AND n.created_at >= $1::timestamptz AND l.created_at >= $1::timestamptz
         AND n.private_intake_snapshot->>'launch_cutoff'=to_char($1::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
         AND n.provider_message_id IS NULL AND n.provider_accepted_at IS NULL AND n.attempt_count<least(n.max_attempts,3)
         AND (n.first_provider_attempt_at IS NULL OR now()<n.first_provider_attempt_at+interval '23 hours 59 minutes')
         AND NOT l.is_test AND NOT l.communication_suppressed AND n.private_intake_snapshot->>'is_test'='false'
         AND ((n.status='pending' AND n.attempt_count=0) OR (n.status IN ('failed','retry_scheduled')
           AND n.error_code IN ('resend_http_429','resend_http_425') AND n.next_attempt_at<=now()))
       ORDER BY coalesce(n.next_attempt_at,n.created_at),n.id LIMIT $2`, [cutoff, Math.max(1, Math.min(limit, 4))]);
    return (rows as unknown[]).map(row).filter((value): value is LeadNotificationRecord => Boolean(value));
  }

  async claimLaunchEnvelope(id: string, cutoff: string, initialSend = false, lease: string | null = null): Promise<PrivateLaunchEnvelope | null> {
    const rows = await this.sql.query("SELECT * FROM public.claim_launch_lead_alert_v1($1::uuid,$2::timestamptz,$3::boolean,$4::uuid)", [id, cutoff, initialSend, lease]);
    return launchRow((rows as unknown[])[0]);
  }

  async finishLaunchAttempt(id: string, patch: {
    status: string; providerMessageId?: string; acceptedAt?: string; errorCode?: string;
    nextAttemptAt?: string;
  }): Promise<LeadNotificationRecord | null> {
    // A signed callback may win the race. Never overwrite its accepted message,
    // delivered/bounced state or evidence with the later HTTP result.
    const rows = await this.sql.query(
      `UPDATE public.lead_notifications SET status=$2,provider_message_id=$3,
       provider_accepted_at=$4::timestamptz,sent_at=CASE WHEN $4::timestamptz IS NOT NULL THEN $4::timestamptz ELSE sent_at END,
       error_code=$5,error_summary=CASE WHEN $5::text IS NULL THEN NULL ELSE 'Launch delivery requires review; see per-envelope evidence.' END,
       failed_at=CASE WHEN $5::text IS NOT NULL THEN now() ELSE NULL END,next_attempt_at=$6::timestamptz
       WHERE id=$1::uuid AND template_version='lead_alert_email_v6' AND status='processing'
         AND provider_message_id IS NULL AND provider_accepted_at IS NULL RETURNING *`,
      [id, patch.status, patch.providerMessageId || null, patch.acceptedAt || null, patch.errorCode || null, patch.nextAttemptAt || null]);
    return row((rows as unknown[])[0]) || this.findById(id);
  }

  async holdExpiredLaunchEnvelopes(cutoff: string) {
    await this.sql.query(
      `WITH expired AS (SELECT id FROM public.lead_notifications WHERE template_version='lead_alert_email_v6'
       AND created_at >= $1::timestamptz AND private_intake_snapshot->>'launch_cutoff'=to_char($1::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
       AND status IN ('failed','retry_scheduled') AND provider_message_id IS NULL AND provider_accepted_at IS NULL
       AND first_provider_attempt_at<=now()-interval '23 hours 59 minutes' ORDER BY created_at LIMIT 4 FOR UPDATE SKIP LOCKED)
       UPDATE public.lead_notifications n SET status='permanently_failed',error_code='provider_retry_window_expired',
       error_summary='Provider-key retention window ended; no automatic resubmission.',next_attempt_at=NULL,failed_at=now()
       FROM expired WHERE n.id=expired.id`, [cutoff]);
  }

  async acquireLaunchBatch(cutoff: string): Promise<string | null> {
    const rows = await this.sql.query("SELECT public.acquire_launch_alert_batch_v1($1::timestamptz) AS lease", [cutoff]);
    const lease = (rows as Array<Record<string, unknown>>)[0]?.lease;
    return typeof lease === "string" ? lease : null;
  }
  async releaseLaunchBatch(lease: string) {
    await this.sql.query("UPDATE public.lead_notifications SET launch_batch_lease_token=NULL,launch_batch_lease_until=NULL WHERE template_version='lead_alert_email_v6' AND launch_batch_lease_token=$1::uuid", [lease]);
  }
  async readLaunchHealth(cutoff: string): Promise<LaunchAlertHealth> {
    const rows = await this.sql.query(
      `SELECT count(*)::integer AS unresolved_over_5m,
       count(*) FILTER(WHERE n.status='processing')::integer AS ambiguous_over_5m,
       count(*) FILTER(WHERE n.status IN ('failed','retry_scheduled','permanently_failed','skipped'))::integer AS failed_over_5m,
       count(*) FILTER(WHERE n.provider_accepted_at IS NOT NULL AND coalesce(n.metadata->>'provider_delivery_confirmed','false')<>'true')::integer AS accepted_not_delivered_over_5m
       FROM public.lead_notifications n JOIN public.leads l ON l.id=n.lead_id
       WHERE n.template_version='lead_alert_email_v6' AND n.notification_type='lead_alert' AND n.channel='email' AND n.recipient_type='internal'
       AND n.created_at>=$1::timestamptz AND l.created_at>=$1::timestamptz AND n.private_intake_snapshot->>'launch_cutoff'=to_char($1::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
       AND n.created_at<=now()-interval '5 minutes' AND NOT l.is_test AND NOT l.communication_suppressed
       AND (n.status<>'sent' OR coalesce(n.metadata->>'provider_delivery_confirmed','false')<>'true')`, [cutoff]);
    const raw = (rows as Array<Record<string, unknown>>)[0] || {};
    return Object.fromEntries(["unresolved_over_5m", "ambiguous_over_5m", "failed_over_5m", "accepted_not_delivered_over_5m"]
      .map(key => [key, Math.max(0, Number(raw[key]) || 0)])) as LaunchAlertHealth;
  }
}

export async function loadNeonLeadForNotification(
  leadId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<AssignmentNotificationLead | null> {
  const sql = queryFromEnv(env);
  if (!sql) return null;
  const rows = await sql.query(
    `SELECT id, created_at, status, assigned_agent_id, assigned_at,
            assignment_status, first_name, last_name, address_raw,
            primary_intent, timeline_months, lead_type, source,
            source_detail, page_url, question_raw
       FROM public.leads
      WHERE id = $1::uuid
      LIMIT 1`,
    [leadId],
  ) as Array<Record<string, unknown>>;
  return rows[0] ? normalizeAssignmentLeadRow(rows[0]) : null;
}

export async function loadNeonAgentForNotification(
  agentId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<AssignmentNotificationAgent | null> {
  const sql = queryFromEnv(env);
  if (!sql) return null;
  const rows = await sql.query(
    `SELECT id, name, email, phone, notification_phone, role, is_active
       FROM public.agents
      WHERE id = $1::uuid
      LIMIT 1`,
    [agentId],
  ) as Array<Record<string, unknown>>;
  return rows[0] ? normalizeAssignmentAgentRow(rows[0]) : null;
}
