import { neon } from "@neondatabase/serverless";
import {
  NOTIFICATION_PENDING_STALE_MINUTES,
  NOTIFICATION_PROCESSING_STALE_MINUTES,
} from "../leadNotificationRetryPolicy";

export {
  NOTIFICATION_PENDING_STALE_MINUTES,
  NOTIFICATION_PROCESSING_STALE_MINUTES,
} from "../leadNotificationRetryPolicy";

type QueryClient = {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
};

type NotificationOperationsRow = Record<string, unknown>;

export type LeadNotificationOperationsSnapshot = {
  exact: true;
  liveTotal: number;
  testTotal: number;
  orphanedTotal: number;
  queueDepth: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  permanentlyFailed: number;
  skipped: number;
  retryScheduled: number;
  retryDue: number;
  stalePending: number;
  staleProcessing: number;
  providerConfirmed: number;
  providerTerminalFailure: number;
  oldestActionableAt: string | null;
  lastSentAt: string | null;
  lastProviderConfirmationAt: string | null;
  generatedAt: string;
};

function count(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function timestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

export function normalizeLeadNotificationOperationsRow(
  row: NotificationOperationsRow,
): LeadNotificationOperationsSnapshot {
  const pending = count(row.pending);
  const processing = count(row.processing);
  const retryScheduled = count(row.retry_scheduled);
  return {
    exact: true,
    liveTotal: count(row.live_total),
    testTotal: count(row.test_total),
    orphanedTotal: count(row.orphaned_total),
    queueDepth: pending + processing + retryScheduled,
    pending,
    processing,
    sent: count(row.sent),
    failed: count(row.failed),
    permanentlyFailed: count(row.permanently_failed),
    skipped: count(row.skipped),
    retryScheduled,
    retryDue: count(row.retry_due),
    stalePending: count(row.stale_pending),
    staleProcessing: count(row.stale_processing),
    providerConfirmed: count(row.provider_confirmed),
    providerTerminalFailure: count(row.provider_terminal_failure),
    oldestActionableAt: timestamp(row.oldest_actionable_at),
    lastSentAt: timestamp(row.last_sent_at),
    lastProviderConfirmationAt: timestamp(row.last_provider_confirmation_at),
    generatedAt: timestamp(row.generated_at) ?? new Date(0).toISOString(),
  };
}

/**
 * Exact, read-only notification operations snapshot. Production KPIs exclude
 * unmistakable QA leads while retaining separate test and orphan counters so
 * operational failures cannot disappear inside a recent-record sample.
 */
export async function queryLeadNotificationOperations(
  sql: QueryClient,
): Promise<LeadNotificationOperationsSnapshot> {
  const rows = await sql.query(
    `WITH notification_scope AS (
       SELECT
         n.*,
         CASE
           WHEN l.id IS NULL THEN 'orphan'
           WHEN COALESCE(l.is_test, false) THEN 'test'
           ELSE 'live'
         END AS lead_scope
       FROM public.lead_notifications n
       LEFT JOIN public.leads l ON l.id = n.lead_id
     )
     SELECT
       COUNT(*) FILTER (WHERE lead_scope = 'live')::int AS live_total,
       COUNT(*) FILTER (WHERE lead_scope = 'test')::int AS test_total,
       COUNT(*) FILTER (WHERE lead_scope = 'orphan')::int AS orphaned_total,
       COUNT(*) FILTER (WHERE lead_scope = 'live' AND status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE lead_scope = 'live' AND status = 'processing')::int AS processing,
       COUNT(*) FILTER (WHERE lead_scope = 'live' AND status = 'sent')::int AS sent,
       COUNT(*) FILTER (WHERE lead_scope = 'live' AND status = 'failed')::int AS failed,
       COUNT(*) FILTER (WHERE lead_scope = 'live' AND status = 'permanently_failed')::int AS permanently_failed,
       COUNT(*) FILTER (WHERE lead_scope = 'live' AND status = 'skipped')::int AS skipped,
       COUNT(*) FILTER (WHERE lead_scope = 'live' AND status = 'retry_scheduled')::int AS retry_scheduled,
       COUNT(*) FILTER (
         WHERE lead_scope = 'live'
           AND status = 'retry_scheduled'
           AND next_attempt_at <= NOW()
           AND attempt_count < max_attempts
       )::int AS retry_due,
       COUNT(*) FILTER (
         WHERE lead_scope = 'live'
           AND status = 'pending'
           AND created_at <= NOW() - make_interval(mins => $1::int)
       )::int AS stale_pending,
       COUNT(*) FILTER (
         WHERE lead_scope = 'live'
           AND status = 'processing'
           AND updated_at <= NOW() - make_interval(mins => $2::int)
       )::int AS stale_processing,
       COUNT(*) FILTER (
         WHERE lead_scope = 'live'
           AND (
             metadata->>'provider_delivery_confirmed' = 'true'
             OR metadata->>'provider_delivery_status' = 'delivered'
           )
       )::int AS provider_confirmed,
       COUNT(*) FILTER (
         WHERE lead_scope = 'live'
           AND (
             metadata->>'provider_last_event' IN ('bounced', 'complained', 'suppressed', 'failed')
             OR metadata->>'provider_delivery_status' IN ('failed', 'undelivered')
           )
       )::int AS provider_terminal_failure,
       MIN(COALESCE(next_attempt_at, updated_at, created_at)) FILTER (
         WHERE lead_scope = 'live'
           AND status IN ('pending', 'processing', 'retry_scheduled')
       )::text AS oldest_actionable_at,
       MAX(sent_at) FILTER (
         WHERE lead_scope = 'live' AND status = 'sent'
       )::text AS last_sent_at,
       MAX(updated_at) FILTER (
         WHERE lead_scope = 'live'
           AND (
             metadata->>'provider_delivery_confirmed' = 'true'
             OR metadata->>'provider_delivery_status' = 'delivered'
           )
       )::text AS last_provider_confirmation_at,
       NOW()::text AS generated_at
     FROM notification_scope`,
    [NOTIFICATION_PENDING_STALE_MINUTES, NOTIFICATION_PROCESSING_STALE_MINUTES],
  );
  return normalizeLeadNotificationOperationsRow(
    (rows[0] && typeof rows[0] === "object" ? rows[0] : {}) as NotificationOperationsRow,
  );
}

export async function loadNeonLeadNotificationOperations(
  env: Record<string, string | undefined> = process.env,
) {
  if (!env.DATABASE_URL) return null;
  return queryLeadNotificationOperations(neon(env.DATABASE_URL));
}
