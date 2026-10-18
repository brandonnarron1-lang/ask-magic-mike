import type { AiBudgetReservation } from "../ai/neon-intelligence";
import type { GroundedBudget } from "./grounded-generation";
import type { WorkerQuery } from "./bounded-workers";

/** Separate evaluation purpose, same canonical reservation/usage tables. This
 * intentionally keeps unknown charges held across expiry/day boundaries.
 * The caller must use an owned synthetic database, not a Production lead. */
export function evaluationBudget(sql: WorkerQuery, input: {
  leadId: string; actor: string; phase: "sentinel" | "fixed";
}): GroundedBudget {
  const reservations = new Map<string, { id: string; maximumUsd: number }>();
  return {
    async reserve(request) {
      const rows = await sql.query("SELECT public.reserve_r2_evaluation_v1($1,$2::uuid,$3,$4,$5::numeric,$6) AS result",
        [request.key, input.leadId, request.model, input.phase, request.maximumUsd, input.actor]);
      const r = rows[0]?.result as { ok?: boolean; id?: string; idempotent_replay?: boolean } | undefined;
      if (!r?.ok || !r.id || r.idempotent_replay) return { authorized: false };
      reservations.set(request.key, { id: r.id, maximumUsd: request.maximumUsd });
      return { authorized: true };
    },
    async settle(result) {
      const r = reservations.get(result.key); if (!r || result.costUsd > r.maximumUsd) throw new Error("evaluation_reservation_required");
      // Existing finalizer writes usage and reservation atomically. No provider
      // receipt is a delivery event; model ids are private evaluation evidence.
      const rows = await sql.query(`SELECT public.finalize_ai_budget_reservation_v1(
        $1::uuid,$2::numeric,$3::integer,$4::integer,'openai_responses',NULL,true,0,now()) AS result`,
      [r.id, result.costUsd, result.inputTokens, result.outputTokens]);
      if (!(rows[0]?.result as { ok?: boolean } | undefined)?.ok) throw new Error("evaluation_finalization_failed");
    },
    async hold(result) {
      const r = reservations.get(result.key); if (!r) throw new Error("evaluation_reservation_required");
      await sql.query("UPDATE public.ai_budget_reservations SET fallback_reason=$2 WHERE id=$1::uuid AND status='reserved'",
        [r.id, result.reason]);
    },
  };
}

// Preserve the existing reservation type dependency for callers that inspect it;
// no alternate budget model, provider billing API or key fallback is introduced.
export type EvaluationReservation = AiBudgetReservation;
