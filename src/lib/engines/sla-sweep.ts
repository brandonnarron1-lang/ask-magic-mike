/**
 * SLA sweep orchestrator.
 *
 * Fetches uncontacted leads from Supabase, runs them through the pure
 * `SlaEngine`, and reports breaches. When the call site asks, it also
 * creates `compliance_flags` + `analytics_events` rows so the admin
 * cockpit can show overdue counts.
 *
 * Intended to be triggered by `POST /api/admin/sla/sweep` (manual) or a
 * Vercel Cron later.
 */
import {
  detectBreaches,
  rankBreaches,
  summarizeSla,
  type LeadSlaState,
  type SlaBreach,
} from "./sla";
import type { LeadGrade } from "@/lib/leads/lead-types";
import { trackEventNoWait } from "@/lib/analytics/ledger";

export interface SlaSweepReport {
  scanned: number;
  breaches: SlaBreach[];
  summary: ReturnType<typeof summarizeSla>;
  flaggedCount: number;
}

export interface SlaSweepRepository {
  /** Returns lead states needed for breach detection. Implementations
   *  decide how many days back to scan (default ~7) so the sweep stays
   *  cheap. */
  fetchOpenLeadStates(limit?: number): Promise<LeadSlaState[]>;
  /** Creates a `compliance_flags` row of type `sla_*_breached`. */
  recordBreach(breach: SlaBreach): Promise<void>;
}

export class SlaSweepEngine {
  constructor(private readonly repo: SlaSweepRepository) {}

  async sweep(opts?: {
    now?: Date;
    limit?: number;
    persistBreaches?: boolean;
  }): Promise<SlaSweepReport> {
    const states = await this.repo.fetchOpenLeadStates(opts?.limit);
    const now = opts?.now ?? new Date();
    const breaches = rankBreaches(detectBreaches(states, now));
    const summary = summarizeSla(states, now);

    let flaggedCount = 0;
    if (opts?.persistBreaches) {
      for (const b of breaches) {
        await this.repo.recordBreach(b);
        flaggedCount += 1;
        trackEventNoWait({
          eventName: b.type === "accept_missed" ? "sla_accept_breached" : "sla_contact_breached",
          leadId: b.leadId,
          properties: {
            grade: b.grade,
            type: b.type,
            dueAt: b.dueAt.toISOString(),
          },
        });
      }
    }

    return {
      scanned: states.length,
      breaches,
      summary,
      flaggedCount,
    };
  }
}

/** Build a Supabase-backed repository. */
export function createSupabaseSlaSweepRepo(): SlaSweepRepository {
  return {
    async fetchOpenLeadStates(limit = 500): Promise<LeadSlaState[]> {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // The new columns live in migration 00012; cast through untyped.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = createAdminClient() as any;
      const { data, error } = await client
        .from("leads")
        .select("id, created_at, lead_grade, last_contacted_at, status")
        .in("status", ["new", "qualified", "contacted", "assigned"])
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`[sla-sweep] fetch: ${error.message}`);
      return (data ?? []).map((row: Record<string, unknown>): LeadSlaState => ({
        leadId: row.id as string,
        grade: ((row.lead_grade as LeadGrade | null) ?? "C"),
        createdAt: new Date(row.created_at as string),
        acceptedAt: null, // Could read from lead_routing when needed.
        contactedAt: row.last_contacted_at
          ? new Date(row.last_contacted_at as string)
          : null,
      }));
    },

    async recordBreach(b: SlaBreach) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = createAdminClient() as any;
      await client.from("compliance_flags").insert({
        lead_id: b.leadId,
        flag_type:
          b.type === "accept_missed"
            ? "sla_accept_breached"
            : "sla_contact_breached",
        severity: b.grade === "A+" || b.grade === "A" ? "critical" : "warn",
        notes: JSON.stringify({ grade: b.grade, dueAt: b.dueAt.toISOString() }),
      });
    },
  };
}
