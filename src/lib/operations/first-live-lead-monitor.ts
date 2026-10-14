import { neon } from "@neondatabase/serverless";
import { LAUNCH_LEAD_ALERT_TEMPLATE_VERSION } from "../../../app/lib/leadAlertLaunch";

export const FIRST_LIVE_MONITOR_BUDGET_MS = 10_000;
type QueryOptions = { signal: AbortSignal; deadline: number };

type QueryClient = {
  query(sql: string, params?: unknown[], options?: QueryOptions): Promise<unknown[]>;
};

type MonitorRow = {
  lead_id: string;
  valid_created_at: boolean;
  valid_lead_type: boolean;
  consent_present: boolean;
  source_present: boolean;
  assignment_present: boolean;
  duplicate_suspected: boolean;
  email_status: string | null;
  missing_launch_recipient?: boolean;
  launch_delivery_failed?: boolean;
};

type QueueInvariantRow = {
  unsuppressed_qa: number | string;
  qa_without_explicit_evidence: number | string;
};

export type FirstLiveLeadMonitorReport = {
  scanned: number;
  detected: number;
  escalated: number;
  states: {
    invalidConsent: number;
    missingSource: number;
    missingAssignment: number;
    missingInternalEmail: number;
    deliveryFailure: number;
    duplicateSuspicion: number;
  };
  queue: {
    unsuppressedQa: number;
    qaWithoutExplicitEvidence: number;
  };
};

const DELIVERY_FAILURES = new Set(["failed", "permanently_failed"]);

export class FirstLiveMonitorError extends Error {
  constructor(readonly stage: string, readonly safeCode: string) { super("first_live_monitor_failed"); }
}

function safeCode(error: unknown, aborted: boolean) {
  if (aborted) return "deadline_exceeded";
  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" && /^[A-Z0-9]{5}$/.test(code) ? code : "query_error";
}

export function firstLiveMonitorUnhealthy(report: FirstLiveLeadMonitorReport) {
  return report.escalated > 0 || Object.values(report.states).some(count => count > 0)
    || Object.values(report.queue).some(count => count > 0);
}

export class FirstLiveLeadMonitor {
  constructor(private readonly sql: QueryClient) {}

  async run(input: { leadId?: string; lookbackHours?: number; budgetMs?: number } = {}): Promise<FirstLiveLeadMonitorReport> {
    const budget = Math.max(1, Math.min(input.budgetMs ?? FIRST_LIVE_MONITOR_BUDGET_MS, FIRST_LIVE_MONITOR_BUDGET_MS));
    const controller = new AbortController();
    const deadline = Date.now() + budget;
    const timer = setTimeout(() => controller.abort(), budget);
    let stage = "assessment";
    const query = (statement: string, params?: unknown[]) => {
      controller.signal.throwIfAborted();
      return this.sql.query(statement, params, { signal: controller.signal, deadline });
    };
    try {
    const lookbackHours = Math.max(1, Math.min(input.lookbackHours ?? 48, 168));
    const rows = await query(
      `SELECT
         l.id::text AS lead_id,
         l.created_at IS NOT NULL AS valid_created_at,
         NULLIF(BTRIM(COALESCE(l.lead_type, '')), '') IS NOT NULL AS valid_lead_type,
         EXISTS (SELECT 1 FROM public.consents c WHERE c.lead_id = l.id) AS consent_present,
         EXISTS (SELECT 1 FROM public.source_attribution s WHERE s.lead_id = l.id) AS source_present,
         COALESCE(l.assigned_agent_id, original.assigned_agent_id) IS NOT NULL
           AND CASE WHEN l.assigned_agent_id IS NOT NULL THEN COALESCE(l.assignment_status,'unassigned')='assigned'
                    ELSE COALESCE(original.assignment_status,'unassigned')='assigned' END AS assignment_present,
         (COALESCE(l.is_duplicate, false) OR l.duplicate_of_lead_id IS NOT NULL) AND NOT COALESCE(
           original.id IS NOT NULL AND original.id<>l.id AND original.contact_id=l.contact_id
           AND original.session_id<>l.session_id AND NULLIF(to_jsonb(l)->>'inquiry_request_fingerprint','') IS NOT NULL, false) AS duplicate_suspected,
         latest_email.status AS email_status,
         launch.total>0 AND (launch.mike<>1 OR launch.brandon<>1 OR launch.total<>2) AS missing_launch_recipient,
         launch.failed>0 AS launch_delivery_failed
       FROM public.leads l
       LEFT JOIN public.leads original ON original.id=l.duplicate_of_lead_id
       LEFT JOIN LATERAL (
         SELECT count(*) AS total,
                count(*) FILTER (WHERE n.recipient_reference='operator:mike') AS mike,
                count(*) FILTER (WHERE n.recipient_reference='operator:brandon') AS brandon,
                count(*) FILTER (WHERE n.status IN('failed','permanently_failed','skipped','cancelled')) AS failed
         FROM public.lead_notifications n WHERE n.lead_id=l.id AND n.notification_type='lead_alert'
           AND n.channel='email' AND n.template_version=$3
       ) launch ON true
       LEFT JOIN LATERAL (
         SELECT n.status
           FROM public.lead_notifications n
          WHERE n.lead_id = l.id
            AND n.notification_type = 'lead_alert'
            AND n.channel = 'email'
          ORDER BY n.created_at DESC
          LIMIT 1
       ) latest_email ON true
       WHERE l.is_test = false
         AND l.communication_suppressed = false
         AND (l.created_at >= NOW() - ($1::int * INTERVAL '1 hour') OR NOT EXISTS (
           SELECT 1 FROM public.audit_logs a WHERE a.resource_type='lead' AND a.resource_id=l.id
             AND a.action IN('lead.first_live_detected','lead.first_live_escalation')))
         AND ($2::uuid IS NULL OR l.id = $2::uuid)
       ORDER BY EXISTS (SELECT 1 FROM public.audit_logs a WHERE a.resource_type='lead' AND a.resource_id=l.id
           AND a.action IN('lead.first_live_detected','lead.first_live_escalation')), l.created_at ASC, l.id ASC
       LIMIT 500`,
      [lookbackHours, input.leadId ?? null, LAUNCH_LEAD_ALERT_TEMPLATE_VERSION],
    ) as MonitorRow[];

    const report: FirstLiveLeadMonitorReport = {
      scanned: rows.length,
      detected: 0,
      escalated: 0,
      states: { invalidConsent: 0, missingSource: 0, missingAssignment: 0, missingInternalEmail: 0, deliveryFailure: 0, duplicateSuspicion: 0 },
      queue: { unsuppressedQa: 0, qaWithoutExplicitEvidence: 0 },
    };

    for (const row of rows) {
      const eligible = row.valid_created_at && row.valid_lead_type && row.consent_present && row.source_present;
      const missingInternalEmail = row.email_status === null || row.missing_launch_recipient === true;
      const deliveryFailure = row.launch_delivery_failed === true || DELIVERY_FAILURES.has(row.email_status ?? "");
      const escalationReasons = [
        !row.consent_present && "invalid_consent",
        !row.source_present && "missing_source",
        !row.assignment_present && "missing_assignment",
        missingInternalEmail && "internal_email_missing",
        deliveryFailure && "internal_email_failed",
        row.duplicate_suspected && "duplicate_suspicion",
      ].filter(Boolean) as string[];

      if (!row.consent_present) report.states.invalidConsent += 1;
      if (!row.source_present) report.states.missingSource += 1;
      if (!row.assignment_present) report.states.missingAssignment += 1;
      if (missingInternalEmail) report.states.missingInternalEmail += 1;
      if (deliveryFailure) report.states.deliveryFailure += 1;
      if (row.duplicate_suspected) report.states.duplicateSuspicion += 1;

      if (eligible) {
        stage = "detection_audit";
        const inserted = await query(
          `INSERT INTO public.audit_logs
             (actor, action, resource_type, resource_id, metadata)
           VALUES ('system:first-live-monitor', 'lead.first_live_detected', 'lead', $1::uuid,
             jsonb_build_object(
               'consent_present', $2::boolean,
               'source_present', $3::boolean,
               'assignment_present', $4::boolean,
               'email_status', $5::text,
               'duplicate_suspected', $6::boolean
             ))
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [row.lead_id, row.consent_present, row.source_present, row.assignment_present, row.email_status, row.duplicate_suspected],
        );
        report.detected += inserted.length;
      }

      if (escalationReasons.length > 0) {
        stage = "incident_audit";
        const inserted = await query(
          `INSERT INTO public.audit_logs
             (actor, action, resource_type, resource_id, metadata)
           VALUES ('system:first-live-monitor', 'lead.first_live_escalation', 'lead', $1::uuid,
             jsonb_build_object('reasons', $2::jsonb))
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [row.lead_id, JSON.stringify(escalationReasons)],
        );
        report.escalated += inserted.length;
      }
    }

    stage = "qa_invariants";
    const invariantRows = await query(
      `SELECT
         COUNT(*) FILTER (
           WHERE COALESCE(l.is_test, false) = true
             AND (
               COALESCE(l.communication_suppressed, false) = false
               OR COALESCE(l.email_suppressed, false) = false
               OR COALESCE(l.sms_suppressed, false) = false
             )
         )::int AS unsuppressed_qa,
         COUNT(*) FILTER (
           WHERE COALESCE(l.is_test, false) = true
             AND NOT (
               EXISTS (
                 SELECT 1
                   FROM public.source_attribution s
                  WHERE s.lead_id::text = l.id::text
                    AND (
                      LOWER(COALESCE(s.utm_source, '')) LIKE 'internal_qa%'
                      OR LOWER(COALESCE(s.utm_medium, '')) = 'qa'
                    )
               )
               OR EXISTS (
                 SELECT 1
                   FROM public.audit_logs a
                  WHERE a.resource_type = 'lead'
                    AND a.resource_id::text = l.id::text
                    AND a.action IN ('lead.qa_suppressed', 'lead.test_created')
               )
             )
         )::int AS qa_without_explicit_evidence
       FROM public.leads l`,
    ) as QueueInvariantRow[];
    const invariant = invariantRows[0];
    report.queue.unsuppressedQa = Number(invariant?.unsuppressed_qa ?? 0);
    report.queue.qaWithoutExplicitEvidence = Number(invariant?.qa_without_explicit_evidence ?? 0);

    return report;
    } catch (error) {
      throw new FirstLiveMonitorError(stage, safeCode(error, controller.signal.aborted));
    } finally { clearTimeout(timer); }
  }
}

export function createFirstLiveLeadMonitor(env: Record<string, string | undefined> = process.env) {
  if (!env.DATABASE_URL) return null;
  const sql = neon(env.DATABASE_URL);
  return new FirstLiveLeadMonitor({
    async query(statement, params, options) {
      if (!options) throw new Error("monitor_deadline_required");
      options.signal.throwIfAborted();
      // HTTP abort bounds transport; transaction-local statement_timeout also
      // bounds server work if the client disconnects. No shared session SET.
      const timeout = Math.max(1, Math.min(8_000, options.deadline - Date.now()));
      const results = await sql.transaction([
        sql.query("SELECT set_config('statement_timeout', $1, true)", [`${timeout}ms`]),
        sql.query(statement, params),
      ], { fetchOptions: { signal: options.signal } });
      return results[1];
    },
  });
}

/** Sanitized execution diagnostics, not an alert delivery receipt. */
export async function observeFirstLiveMonitor(monitor: FirstLiveLeadMonitor | null, input: { leadId?: string; lookbackHours?: number }, correlation: string) {
  const start = performance.now();
  if (!monitor) {
    console.error("[first-live-monitor]", { correlation, outcome: "missing_configuration", stage: "factory", durationMs: 0 });
    return { ok: false as const, error: "monitor_store_not_configured", correlation_id: correlation };
  }
  try {
    const report = await monitor.run(input);
    const ok = !firstLiveMonitorUnhealthy(report);
    console[ok ? "info" : "error"]("[first-live-monitor]", { correlation, outcome: ok ? "healthy" : "unhealthy_report", stage: "complete", durationMs: Math.round(performance.now() - start), ...report });
    return { ok, ...report };
  } catch (error) {
    console.error("[first-live-monitor]", { correlation, outcome: "execution_error", stage: error instanceof FirstLiveMonitorError ? error.stage : "factory", code: error instanceof FirstLiveMonitorError ? error.safeCode : "unexpected_error", durationMs: Math.round(performance.now() - start) });
    return { ok: false as const, error: "first_live_monitor_failed", correlation_id: correlation };
  }
}
