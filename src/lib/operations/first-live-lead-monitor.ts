import { neon } from "@neondatabase/serverless";

type QueryClient = {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
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

export class FirstLiveLeadMonitor {
  constructor(private readonly sql: QueryClient) {}

  async run(input: { leadId?: string; lookbackHours?: number } = {}): Promise<FirstLiveLeadMonitorReport> {
    const lookbackHours = Math.max(1, Math.min(input.lookbackHours ?? 48, 168));
    const rows = await this.sql.query(
      `SELECT
         l.id::text AS lead_id,
         l.created_at IS NOT NULL AS valid_created_at,
         NULLIF(BTRIM(COALESCE(l.lead_type, '')), '') IS NOT NULL AS valid_lead_type,
         EXISTS (SELECT 1 FROM public.consents c WHERE c.lead_id = l.id) AS consent_present,
         EXISTS (SELECT 1 FROM public.source_attribution s WHERE s.lead_id = l.id) AS source_present,
         l.assigned_agent_id IS NOT NULL AND COALESCE(l.assignment_status, 'unassigned') = 'assigned' AS assignment_present,
         COALESCE(l.is_duplicate, false) OR l.duplicate_of_lead_id IS NOT NULL AS duplicate_suspected,
         latest_email.status AS email_status
       FROM public.leads l
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
         AND l.created_at >= NOW() - ($1::int * INTERVAL '1 hour')
         AND ($2::uuid IS NULL OR l.id = $2::uuid)
       ORDER BY l.created_at ASC
       LIMIT 500`,
      [lookbackHours, input.leadId ?? null],
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
      const missingInternalEmail = row.email_status === null;
      const deliveryFailure = DELIVERY_FAILURES.has(row.email_status ?? "");
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
        const inserted = await this.sql.query(
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
        const inserted = await this.sql.query(
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

    const invariantRows = await this.sql.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE COALESCE(l.is_test, false) = true
             AND COALESCE(l.communication_suppressed, false) = false
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
  }
}

export function createFirstLiveLeadMonitor(env: Record<string, string | undefined> = process.env) {
  return env.DATABASE_URL ? new FirstLiveLeadMonitor(neon(env.DATABASE_URL)) : null;
}
