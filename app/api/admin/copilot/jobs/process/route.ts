import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { checkBearerSecret } from "@/lib/admin/auth";
import { loadLeadIntelligenceFacts, persistLeadIntelligence } from "@/lib/ai/neon-intelligence";
import { generateAiLeadIntelligence } from "@/lib/ai/openai-responses";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: NextRequest) {
  if (!checkBearerSecret(request, process.env.CRON_SECRET)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if ((process.env.AI_ASYNC_WORKER_ENABLED || "false").toLowerCase() !== "true") return NextResponse.json({ ok: true, processed: 0, disabled: true }, { headers: NO_STORE });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });
  const sql = neon(process.env.DATABASE_URL);
  const dailyRows = await sql.query(
    `SELECT COALESCE(sum(estimated_cost_usd), 0)::numeric AS cost
       FROM public.ai_usage_events WHERE created_at >= date_trunc('day', now())`,
  ) as Array<{ cost: string | number }>;
  const dailyCost = Number(dailyRows[0]?.cost || 0);
  const dailyLimit = Math.max(0, Number(process.env.AI_DAILY_COST_LIMIT_USD) || 1);
  if (dailyCost >= dailyLimit) return NextResponse.json({ ok: false, error: "daily_ai_cost_cap_reached", dailyCost }, { status: 429, headers: NO_STORE });
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
    const result = await generateAiLeadIntelligence(loaded.facts);
    const resultId = await persistLeadIntelligence({ sql, leadId: job.lead_id, facts: loaded.facts, result, actor: job.requested_by, feature: "async_lead_center_copilot" });
    await sql.query(
      `UPDATE public.ai_intelligence_jobs SET status = $1, result_id = $2::uuid,
              completed_at = now(), updated_at = now(), last_error_code = $3 WHERE id = $4::uuid`,
      [result.mode === "blocked" ? "blocked" : "completed", resultId, result.reason || null, job.id],
    );
    return NextResponse.json({ ok: true, processed: 1, jobId: job.id, mode: result.mode, cost: result.usage.estimatedCostUsd }, { headers: NO_STORE });
  } catch (error) {
    const code = error instanceof Error && error.message === "lead_not_found" ? "lead_not_found" : "ai_job_failed";
    await sql.query(
      `UPDATE public.ai_intelligence_jobs SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'queued' END,
              not_before = now() + interval '5 minutes', last_error_code = $1, updated_at = now() WHERE id = $2::uuid`,
      [code, job.id],
    );
    return NextResponse.json({ ok: false, error: code, jobId: job.id }, { status: 503, headers: NO_STORE });
  }
}
