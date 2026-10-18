import type { AiBudgetReservation } from "../ai/neon-intelligence";
import type { GroundedBudget } from "./grounded-generation";
import type { WorkerQuery } from "./bounded-workers";
import type { EvaluationCheckpoint } from "./evaluation-journal";
import { z } from "zod";

/** Restore only sanitized receipt totals into a verified fresh local synthetic
 * venue before authorizing another paid request. Never re-dispatch old keys or
 * lower a reservation on an ambiguous outcome. Caller proves physical venue
 * identity; this function does not accept a connection string or private key. */
export async function restoreEvaluationCheckpoint(sql: WorkerQuery, input: { leadId: string; actor: string; records: EvaluationCheckpoint[] }) {
  const records = z.array(z.object({ key: z.string().regex(/^[A-Za-z0-9:._-]{16,180}$/), model: z.string().min(1).max(100),
    phase: z.enum(["sentinel","fixed"]), maximumMicroUsd: z.number().int().positive().max(160000), sourceRef: z.string().regex(/^[a-f0-9]{40}$/),
    held: z.boolean().optional(), outcome: z.unknown().optional(),
    settled: z.object({ key: z.string(), inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(), costMicroUsd: z.number().int().nonnegative(), providerId: z.string().min(1).max(200) }).strict().optional(),
  }).strict()).max(500).parse(input.records);
  const keys = new Set<string>();
  for (const row of records) {
    if (keys.has(row.key) || (row.settled && (row.settled.key!==row.key || row.settled.costMicroUsd>row.maximumMicroUsd))) throw new Error("invalid_evaluation_checkpoint");
    keys.add(row.key);
  }
  const eligible = await sql.query("SELECT id FROM public.leads WHERE id=$1::uuid AND is_test=true AND communication_suppressed=true", [input.leadId]);
  if (eligible.length!==1) throw new Error("suppressed_synthetic_evaluation_lead_required");
  const existing = await sql.query("SELECT request_key FROM public.ai_budget_reservations WHERE feature IN ('r2_evaluation_sentinel','r2_evaluation_fixed')");
  if (existing.length) throw new Error("fresh_isolated_evaluation_budget_required");
  // This import may fail partway; that venue must be reconciled/rebuilt, not
  // reused with half a checkpoint. The journal remains the conservative fence.
  for (const row of records) {
    const inserted = await sql.query(`INSERT INTO public.ai_budget_reservations
      (request_key,lead_id,feature,model,status,reserved_cost_usd,actor_user_id,expires_at,fallback_reason)
      VALUES($1,$2::uuid,$3,$4,'reserved',$5::numeric,$6,now()+interval '24 hours','restored_private_evaluation_checkpoint') RETURNING id`,
    [row.key,input.leadId,`r2_evaluation_${row.phase}`,row.model,row.maximumMicroUsd/1000000,input.actor]);
    if (row.settled) {
      const settled=await sql.query(`SELECT public.finalize_ai_budget_reservation_v1(
        $1::uuid,$2::numeric,$3::integer,$4::integer,'openai_responses','restored_private_evaluation_checkpoint',true,0,now()) AS result`,
      [inserted[0].id,row.settled.costMicroUsd/1000000,row.settled.inputTokens,row.settled.outputTokens]);
      if (!(settled[0]?.result as {ok?:boolean}|undefined)?.ok) throw new Error("evaluation_checkpoint_finalization_failed");
    }
  }
  return { restored: records.length, providerCalls: 0 };
}

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
