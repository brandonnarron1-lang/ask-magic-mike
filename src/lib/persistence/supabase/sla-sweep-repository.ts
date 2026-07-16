import type { LeadGrade } from "@/lib/leads/lead-types";
import { isSyntheticEmail } from "@/lib/leads/synthetic-detection";
import type { LeadSlaState, SlaBreach } from "@/lib/engines/sla";
import type { SlaSweepRepository } from "@/lib/engines/sla-sweep";

/** Supabase-specific implementation of the provider-neutral SLA repository. */
export function createSupabaseSlaSweepRepo(): SlaSweepRepository {
  return {
    async fetchOpenLeadStates(limit = 500): Promise<LeadSlaState[]> {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // The generated client predates the lifecycle columns in migration 00012.
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
        (row: Record<string, unknown>) => !isSyntheticEmail(row.email as string | null),
      );
      const leadIds = nonSynth.map((row: Record<string, unknown>) => row.id as string);
      const acceptedAtByLeadId = new Map<string, Date>();
      if (leadIds.length > 0) {
        const { data: routingRows, error: routingError } = await client
          .from("lead_routing")
          .select("lead_id, accepted_at")
          .in("lead_id", leadIds)
          .not("accepted_at", "is", null);
        if (routingError) throw new Error(`[sla-sweep] routing fetch: ${routingError.message}`);
        for (const row of routingRows ?? []) {
          if (row.accepted_at) {
            acceptedAtByLeadId.set(row.lead_id as string, new Date(row.accepted_at as string));
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

    async recordBreach(breach: SlaBreach) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = createAdminClient() as any;
      const flagType = breach.type === "accept_missed"
        ? "sla_accept_breached"
        : "sla_contact_breached";
      const { error } = await client.rpc("record_sla_breach_v1", {
        p_lead_id: breach.leadId,
        p_flag_type: flagType,
        p_severity: breach.grade === "A+" || breach.grade === "A" ? "critical" : "warn",
        p_notes: JSON.stringify({ grade: breach.grade, dueAt: breach.dueAt.toISOString() }),
      });
      if (error) throw new Error(`[sla-sweep] recordBreach rpc: ${error.message}`);
    },
  };
}
