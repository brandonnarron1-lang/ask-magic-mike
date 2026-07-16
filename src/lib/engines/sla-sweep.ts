/**
 * SLA sweep orchestrator.
 *
 * Fetches uncontacted leads from Supabase, runs them through the pure
 * `SlaEngine`, and reports breaches. When the call site asks, it also
 * creates `compliance_flags` + `analytics_events` rows so the admin
 * cockpit can show overdue counts.
 *
 * Intended to be triggered through the active root `GET /api/admin/sla/sweep`
 * cron route. The legacy src/app POST route remains inactive while root app/
 * is the canonical Next.js router.
 */
import {
  detectBreaches,
  rankBreaches,
  summarizeSla,
  type LeadSlaState,
  type SlaBreach,
} from "./sla";
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
