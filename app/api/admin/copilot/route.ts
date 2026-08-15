import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAiLeadIntelligence, type LeadIntelligenceFacts } from "@/lib/ai/openai-responses";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "@/lib/admin/rbac-policy";

const requestSchema = z.object({ leadId: z.string().uuid() });
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return value === true || value === "true";
}

function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function scoreExplanations(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((factor) => {
    if (!factor || typeof factor !== "object") return [];
    const row = factor as Record<string, unknown>;
    const label = asText(row.label || row.factor || row.name);
    const explanation = asText(row.explanation || row.reason);
    return label || explanation ? [`${label}${label && explanation ? ": " : ""}${explanation}`] : [];
  }).slice(0, 8);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers: NO_STORE });
  }
  const auth = await requireLeadCenterApiPermission(request, "lead:view_assigned");
  if (!auth.ok) return auth.response;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });
  }

  const sql = neon(process.env.DATABASE_URL);
  const scoped = !hasLeadCenterPermission(auth.principal.role, "lead:view_all");
  if (scoped && !auth.principal.agentId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  const rows = await sql.query(
    `SELECT l.id, l.funnel_type, l.status, l.score, l.score_factors,
            l.source, l.lead_source_surface, l.timeline, l.timeline_months,
            l.target_geography, l.city, l.consent_email, l.consent_sms,
            l.consent_call, l.is_test, l.communication_suppressed,
            l.question, l.notes, l.assigned_agent_id,
            sa.placement_id
       FROM public.leads l
       LEFT JOIN LATERAL (
         SELECT placement_id
           FROM public.source_attribution
          WHERE lead_id = l.id
          ORDER BY created_at DESC
          LIMIT 1
       ) sa ON true
      WHERE l.id = $1::uuid${scoped ? " AND l.assigned_agent_id = $2::uuid" : ""}
      LIMIT 1`,
    scoped ? [parsed.data.leadId, auth.principal.agentId] : [parsed.data.leadId],
  ) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404, headers: NO_STORE });
  }

  const facts: LeadIntelligenceFacts = {
    leadType: asText(row.funnel_type) || "general",
    status: asText(row.status) || "unknown",
    score: asNumber(row.score),
    scoreExplanation: scoreExplanations(row.score_factors),
    source: asText(row.source) || asText(row.lead_source_surface) || "unknown",
    placement: asText(row.placement_id) || asText(row.lead_source_surface),
    timeline: asText(row.timeline) || (asNumber(row.timeline_months) == null ? "" : `${asNumber(row.timeline_months)} months`),
    targetGeography: asText(row.target_geography) || asText(row.city),
    consentEmail: asBoolean(row.consent_email),
    consentSms: asBoolean(row.consent_sms),
    consentCall: asBoolean(row.consent_call),
    isTest: asBoolean(row.is_test),
    suppressed: asBoolean(row.communication_suppressed),
    question: [asText(row.question), asText(row.notes)].filter(Boolean).join("\n").slice(0, 4_000),
  };

  const result = await generateAiLeadIntelligence(facts);
  const fingerprint = createHash("sha256").update(JSON.stringify(facts)).digest("hex");
  if ((process.env.AI_INTELLIGENCE_PERSIST_ENABLED || "false").toLowerCase() === "true") {
    await Promise.all([
      sql.query(
        `INSERT INTO public.ai_lead_intelligence
          (lead_id, schema_version, prompt_version, mode, model, output,
           input_fingerprint, confidence, is_test, created_by)
         VALUES ($1::uuid, 'phase6-v1', 'phase6-v1', $2, $3, $4::jsonb,
                 $5, $6, $7, $8)
         ON CONFLICT (lead_id, schema_version, prompt_version, input_fingerprint)
         DO UPDATE SET mode = EXCLUDED.mode, model = EXCLUDED.model,
                       output = EXCLUDED.output, confidence = EXCLUDED.confidence,
                       created_at = now()`,
        [row.id, result.mode, result.model, JSON.stringify(result.output), fingerprint,
          result.output.confidence, facts.isTest, auth.principal.userId],
      ),
      sql.query(
        `INSERT INTO public.ai_usage_events
          (lead_id, feature, model, mode, input_tokens, output_tokens,
           estimated_cost_usd, latency_ms, fallback_reason, is_test)
         VALUES ($1::uuid, 'lead_center_copilot', $2, $3, $4, $5, $6, $7, $8, $9)`,
        [row.id, result.model, result.mode, result.usage.inputTokens,
          result.usage.outputTokens, result.usage.estimatedCostUsd,
          result.latencyMs, result.reason || null, facts.isTest],
      ),
    ]).catch(() => undefined);
  }

  return NextResponse.json(result, { headers: NO_STORE });
}
