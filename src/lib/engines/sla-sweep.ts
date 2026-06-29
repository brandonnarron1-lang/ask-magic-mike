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
import { isSyntheticEmail } from "@/lib/leads/synthetic-detection";

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
        .select("id, created_at, lead_grade, last_contacted_at, status, email")
        .in("status", ["new", "qualified", "contacted", "assigned"])
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`[sla-sweep] fetch: ${error.message}`);

      const nonSynth = (data ?? []).filter(
        (row: Record<string, unknown>) => !isSyntheticEmail(row.email as string | null)
      );

      // Read accepted_at from lead_routing for any lead that has been accepted,
      // so we don't generate false-positive accept-breach flags.
      const leadIds = nonSynth.map((r: Record<string, unknown>) => r.id as string);
      const acceptedAtByLeadId = new Map<string, Date>();
      if (leadIds.length > 0) {
        const { data: routingRows, error: routingError } = await client
          .from("lead_routing")
          .select("lead_id, accepted_at")
          .in("lead_id", leadIds)
          .not("accepted_at", "is", null);
        if (routingError) throw new Error(`[sla-sweep] routing fetch: ${routingError.message}`);
        for (const r of routingRows ?? []) {
          if (r.accepted_at) {
            acceptedAtByLeadId.set(r.lead_id as string, new Date(r.accepted_at as string));
          }
        }
      }

      return nonSynth.map((row: Record<string, unknown>): LeadSlaState => ({
        leadId: row.id as string,
        grade: ((row.lead_grade as LeadGrade | null) ?? "C"),
        createdAt: new Date(row.created_at as string),
        acceptedAt: acceptedAtByLeadId.get(row.id as string) ?? null,
        contactedAt: row.last_contacted_at
          ? new Date(row.last_contacted_at as string)
          : null,
      }));
    },

    async recordBreach(b: SlaBreach) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = createAdminClient() as any;
      const flagType =
        b.type === "accept_missed" ? "sla_accept_breached" : "sla_contact_breached";

      // Skip if an identical flag already exists — prevents duplicate rows on repeated sweeps.
      const { data: existing } = await client
        .from("compliance_flags")
        .select("id")
        .eq("lead_id", b.leadId)
        .eq("flag_type", flagType)
        .maybeSingle();
      if (existing) return;

      const { error: insertError } = await client.from("compliance_flags").insert({
        lead_id: b.leadId,
        flag_type: flagType,
        severity: b.grade === "A+" || b.grade === "A" ? "critical" : "warn",
        notes: JSON.stringify({ grade: b.grade, dueAt: b.dueAt.toISOString() }),
      });
      if (insertError) throw new Error(`[sla-sweep] recordBreach insert: ${insertError.message}`);
    },
  };
}
