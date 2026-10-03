import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { checkBearerSecret } from "@/lib/admin/auth";
import {
  finalizeAiBudget,
  loadLeadIntelligenceFacts,
  loadLatestAiDraft,
  persistLeadIntelligenceDraft,
  reserveAiBudget,
} from "@/lib/ai/neon-intelligence";
import {
  generateAiLeadIntelligence,
  getAiRuntimeConfig,
  reservedAiRequestCost,
} from "@/lib/ai/openai-responses";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: NextRequest) {
  if (!checkBearerSecret(request, process.env.CRON_SECRET)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if ((process.env.AI_ASYNC_WORKER_ENABLED || "false").toLowerCase() !== "true") return NextResponse.json({ ok: true, processed: 0, disabled: true }, { headers: NO_STORE });
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return NextResponse.json({ ok: false, error: mutation.error }, { status: mutation.statusCode, headers: NO_STORE });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });
  const sql = neon(process.env.DATABASE_URL);
  const runtime = getAiRuntimeConfig();
  const jobs = await sql.query(
    `WITH candidate AS (
       SELECT id FROM public.ai_intelligence_jobs
        WHERE status = 'queued' AND not_before <= now() AND attempt_count < max_attempts
        ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
     )
     UPDATE public.ai_intelligence_jobs jobs
        SET status = 'processing', claimed_at = now(), attempt_count = attempt_count + 1, updated_at = now()
       FROM candidate WHERE jobs.id = candidate.id
     RETURNING jobs.id, jobs.lead_id, jobs.requested_by`,
  ) as Array<{ id: string; lead_id: string; requested_by: string }>;
  const job = jobs[0];
  if (!job) return NextResponse.json({ ok: true, processed: 0 }, { headers: NO_STORE });
  try {
    const loaded = await loadLeadIntelligenceFacts(sql, job.lead_id);
    if (!loaded) throw new Error("lead_not_found");
    if (loaded.facts.isTest || loaded.facts.suppressed) throw new Error("lead_not_eligible_for_ai_draft");
    const reservation = await reserveAiBudget({
      sql,
      requestKey: `ai-job:${job.id}`,
      leadId: job.lead_id,
      feature: "async_agent_command_center_draft",
      model: runtime.model,
      dailyLimitUsd: runtime.dailyCostLimitUsd,
      reserveCostUsd: reservedAiRequestCost(runtime),
      actorUserId: job.requested_by,
    });
    if (!reservation.ok || !reservation.id) throw new Error(reservation.error || "ai_budget_reservation_failed");
    if (reservation.idempotentReplay) {
      if (reservation.status === "reserved") throw new Error("ai_draft_generation_in_progress");
      const existing = await loadLatestAiDraft({ sql, leadId: job.lead_id, artifactType: "lead_summary" });
      const intelligenceId = typeof existing?.intelligence_id === "string" ? existing.intelligence_id : null;
      await sql.query(
        `UPDATE public.ai_intelligence_jobs SET status = 'completed', result_id = $1::uuid,
                completed_at = now(), updated_at = now(), last_error_code = NULL WHERE id = $2::uuid`,
        [intelligenceId, job.id],
      );
      return NextResponse.json({ ok: true, processed: 1, jobId: job.id, replayed: true }, { headers: NO_STORE });
    }
    const result = await generateAiLeadIntelligence(loaded.facts, { reservationAuthorized: true });
    await finalizeAiBudget({ sql, reservationId: reservation.id, result, isTest: loaded.facts.isTest });
    const persisted = await persistLeadIntelligenceDraft({
      sql,
      leadId: job.lead_id,
      facts: loaded.facts,
      result,
      actor: job.requested_by,
      artifactType: "lead_summary",
    });
    const resultId = typeof persisted.intelligence_id === "string" ? persisted.intelligence_id : null;
    await sql.query(
      `UPDATE public.ai_intelligence_jobs SET status = $1, result_id = $2::uuid,
              completed_at = now(), updated_at = now(), last_error_code = $3 WHERE id = $4::uuid`,
      [result.mode === "blocked" ? "blocked" : "completed", resultId, result.reason || null, job.id],
    );
    return NextResponse.json({ ok: true, processed: 1, jobId: job.id, mode: result.mode, cost: result.usage.estimatedCostUsd }, { headers: NO_STORE });
  } catch (error) {
    const code = error instanceof Error && [
      "lead_not_found",
      "lead_not_eligible_for_ai_draft",
      "daily_ai_cost_cap_reached",
      "ai_draft_generation_in_progress",
    ].includes(error.message) ? error.message : "ai_job_failed";
    await sql.query(
      `UPDATE public.ai_intelligence_jobs SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'queued' END,
              not_before = now() + interval '5 minutes', last_error_code = $1, updated_at = now() WHERE id = $2::uuid`,
      [code, job.id],
    );
    return NextResponse.json({ ok: false, error: code, jobId: job.id }, { status: 503, headers: NO_STORE });
  }
}
