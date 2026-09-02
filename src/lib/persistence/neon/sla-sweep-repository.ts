import { neon } from "@neondatabase/serverless";
import type { LeadGrade } from "@/lib/leads/lead-types";
import { isSyntheticEmail } from "@/lib/leads/synthetic-detection";
import type { LeadSlaState, SlaBreach } from "@/lib/engines/sla";
import type { SlaSweepRepository } from "@/lib/engines/sla-sweep";

type NeonQuery = {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
};

type LeadRow = {
  id: string;
  created_at: string;
  lead_grade: LeadGrade | null;
  first_human_response_at: string | null;
  email: string | null;
  is_test: boolean | null;
  communication_suppressed: boolean | null;
  accepted_at: string | null;
};

const OPEN_SLA_LEAD_STATUSES = [
  "new",
  "scored",
  "assigned",
  "escalated",
  "qualified",
  "contacted",
  "appointment_requested",
] as const;

/** Neon implementation of the provider-neutral SLA repository.
 * The query excludes test, synthetic, and communication-suppressed records
 * before the SLA engine sees them. Contact proof comes only from the immutable
 * first-response ledger; mutable `leads.last_contacted_at` is not evidence. */
export class NeonSlaSweepRepository implements SlaSweepRepository {
  constructor(private readonly sql: NeonQuery) {}

  async fetchOpenLeadStates(limit = 500): Promise<LeadSlaState[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 1_000));
    const rows = await this.sql.query(
      `SELECT
         l.id,
         l.created_at,
         l.lead_grade,
         first_response.first_human_response_at,
         l.email,
         COALESCE(l.is_test, false) AS is_test,
         COALESCE(l.communication_suppressed, false) AS communication_suppressed,
         latest_routing.accepted_at
       FROM public.leads AS l
       LEFT JOIN LATERAL (
         SELECT lr.accepted_at
           FROM public.lead_routing AS lr
          WHERE lr.lead_id = l.id
            AND lr.accepted_at IS NOT NULL
          ORDER BY lr.accepted_at DESC
          LIMIT 1
       ) AS latest_routing ON true
       LEFT JOIN LATERAL (
         SELECT rm.first_human_response_at
           FROM public.lead_response_milestones AS rm
          WHERE rm.lead_id = l.id
            AND rm.is_test = false
            AND rm.communication_suppressed = false
          LIMIT 1
       ) AS first_response ON true
       WHERE l.status = ANY($1::text[])
         AND COALESCE(l.is_test, false) = false
         AND COALESCE(l.communication_suppressed, false) = false
       ORDER BY l.created_at DESC
       LIMIT $2`,
      [[...OPEN_SLA_LEAD_STATUSES], boundedLimit],
    ) as LeadRow[];

    return rows
      .filter((row) =>
        row.is_test !== true &&
        row.communication_suppressed !== true &&
        !isSyntheticEmail(row.email)
      )
      .map((row) => ({
        leadId: row.id,
        grade: row.lead_grade ?? "C",
        createdAt: new Date(row.created_at),
        acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
        contactedAt: row.first_human_response_at
          ? new Date(row.first_human_response_at)
          : null,
      }));
  }

  async recordBreach(breach: SlaBreach): Promise<void> {
    const flagType = breach.type === "accept_missed"
      ? "sla_accept_breached"
      : "sla_contact_breached";
    const severity = breach.grade === "A+" || breach.grade === "A"
      ? "critical"
      : "warn";

    await this.sql.query(
      "SELECT public.record_sla_breach_v1($1::uuid, $2::text, $3::text, $4::text)",
      [
        breach.leadId,
        flagType,
        severity,
        JSON.stringify({ grade: breach.grade, dueAt: breach.dueAt.toISOString() }),
      ],
    );
  }
}

export function createNeonSlaSweepRepo(
  env: Record<string, string | undefined> = process.env,
): SlaSweepRepository | null {
  return env.DATABASE_URL
    ? new NeonSlaSweepRepository(neon(env.DATABASE_URL))
    : null;
}
