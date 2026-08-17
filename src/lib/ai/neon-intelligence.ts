import { createHash } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { AiLeadIntelligenceResult, LeadIntelligenceFacts } from "./openai-responses";

type Query = NeonQueryFunction<false, false>;

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

export async function loadLeadIntelligenceFacts(sql: Query, leadId: string, assignedAgentId?: string | null) {
  const scoped = Boolean(assignedAgentId);
  const rows = await sql.query(
    `SELECT l.id, l.lead_type, l.status, l.score, l.score_factors,
            l.source, l.source_detail, l.timeline_months,
            l.target_geography, l.city, l.consent_email, l.consent_sms,
            l.consent_call, l.is_test, l.communication_suppressed,
            l.question_raw, l.notes, l.assigned_agent_id,
            sa.placement_id
       FROM public.leads l
       LEFT JOIN LATERAL (
         SELECT placement_id FROM public.source_attribution
          WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1
       ) sa ON true
      WHERE l.id = $1::uuid${scoped ? " AND l.assigned_agent_id = $2::uuid" : ""}
      LIMIT 1`,
    scoped ? [leadId, assignedAgentId] : [leadId],
  ) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return null;
  const facts: LeadIntelligenceFacts = {
    leadType: asText(row.lead_type) || "general",
    status: asText(row.status) || "unknown",
    score: asNumber(row.score),
    scoreExplanation: scoreExplanations(row.score_factors),
    source: asText(row.source) || asText(row.source_detail) || "unknown",
    placement: asText(row.placement_id) || asText(row.source_detail),
    timeline: asNumber(row.timeline_months) == null ? "" : `${asNumber(row.timeline_months)} months`,
    targetGeography: asText(row.target_geography) || asText(row.city),
    consentEmail: asBoolean(row.consent_email),
    consentSms: asBoolean(row.consent_sms),
    consentCall: asBoolean(row.consent_call),
    isTest: asBoolean(row.is_test),
    suppressed: asBoolean(row.communication_suppressed),
    question: [asText(row.question_raw), asText(row.notes)].filter(Boolean).join("\n").slice(0, 4_000),
  };
  return { leadId: String(row.id), facts };
}

export async function persistLeadIntelligence(input: {
  sql: Query;
  leadId: string;
  facts: LeadIntelligenceFacts;
  result: AiLeadIntelligenceResult;
  actor: string;
  feature?: string;
}) {
  const fingerprint = createHash("sha256").update(JSON.stringify(input.facts)).digest("hex");
  const intelligenceRows = await input.sql.query(
    `INSERT INTO public.ai_lead_intelligence
      (lead_id, schema_version, prompt_version, mode, model, output,
       input_fingerprint, confidence, is_test, created_by)
     VALUES ($1::uuid, 'phase7-v1', 'phase7-v1', $2, $3, $4::jsonb,
             $5, $6, $7, $8)
     ON CONFLICT (lead_id, schema_version, prompt_version, input_fingerprint)
     DO UPDATE SET mode = EXCLUDED.mode, model = EXCLUDED.model,
                   output = EXCLUDED.output, confidence = EXCLUDED.confidence,
                   created_at = now()
     RETURNING id`,
    [input.leadId, input.result.mode, input.result.model, JSON.stringify(input.result.output),
      fingerprint, input.result.output.confidence, input.facts.isTest, input.actor],
  ) as Array<{ id: string }>;
  await input.sql.query(
    `INSERT INTO public.ai_usage_events
      (lead_id, feature, model, mode, input_tokens, output_tokens,
       estimated_cost_usd, latency_ms, fallback_reason, is_test)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [input.leadId, input.feature || "lead_center_copilot", input.result.model, input.result.mode,
      input.result.usage.inputTokens, input.result.usage.outputTokens,
      input.result.usage.estimatedCostUsd, input.result.latencyMs, input.result.reason || null,
      input.facts.isTest],
  );
  return intelligenceRows[0]?.id || null;
}
