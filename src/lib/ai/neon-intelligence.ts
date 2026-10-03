import { createHash } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { AiLeadIntelligenceResult, LeadIntelligenceFacts } from "./openai-responses";

type Query = NeonQueryFunction<false, false>;

export const AI_ARTIFACT_TYPES = [
  "lead_summary",
  "appointment_brief",
  "clarifying_questions",
  "email_draft",
  "sms_draft",
  "call_script",
] as const;
export type AiArtifactType = (typeof AI_ARTIFACT_TYPES)[number];

export type AiBudgetReservation = {
  ok: boolean;
  id?: string;
  status?: "reserved" | "finalized" | "released";
  error?: string;
  idempotentReplay?: boolean;
};

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
    return label || explanation ? [`${label}${label && explanation ? ": " : ""}${explanation}`.slice(0, 300)] : [];
  }).slice(0, 8);
}

function boundedText(value: unknown, maximum: number) {
  return asText(value).slice(0, maximum);
}

function channelAllowed(
  rows: Array<Record<string, unknown>>,
  channel: "email" | "sms" | "phone",
) {
  return rows.some((row) =>
    asText(row.channel) === channel
    && asText(row.state) === "allowed"
    && row.manual_review_required !== true
    && row.manual_review_required !== "true"
    && ["requested_service_response", "appointment_coordination", "manual_one_to_one"].includes(asText(row.purpose)),
  );
}

export function leadFactsFingerprint(facts: LeadIntelligenceFacts) {
  return createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}

export async function reserveAiBudget(input: {
  sql: Query;
  requestKey: string;
  leadId: string;
  feature: string;
  model: string;
  dailyLimitUsd: number;
  reserveCostUsd: number;
  actorUserId: string;
}): Promise<AiBudgetReservation> {
  const rows = await input.sql.query(
    `SELECT public.reserve_ai_budget_v1(
       $1::text, $2::uuid, $3::text, $4::text, $5::numeric,
       $6::numeric, $7::text, now()
     ) AS result`,
    [input.requestKey, input.leadId, input.feature, input.model,
      input.dailyLimitUsd, input.reserveCostUsd, input.actorUserId],
  ) as Array<{ result?: Record<string, unknown> }>;
  const result = rows[0]?.result || {};
  return {
    ok: result.ok === true,
    id: asText(result.id) || undefined,
    status: ["reserved", "finalized", "released"].includes(asText(result.status))
      ? asText(result.status) as AiBudgetReservation["status"]
      : undefined,
    error: asText(result.error) || undefined,
    idempotentReplay: result.idempotent_replay === true,
  };
}

export async function finalizeAiBudget(input: {
  sql: Query;
  reservationId: string;
  result: AiLeadIntelligenceResult;
  isTest: boolean;
}) {
  const rows = await input.sql.query(
    `SELECT public.finalize_ai_budget_reservation_v1(
       $1::uuid, $2::numeric, $3::integer, $4::integer, $5::text,
       $6::text, $7::boolean, $8::integer, now()
     ) AS result`,
    [input.reservationId, input.result.usage.estimatedCostUsd,
      input.result.usage.inputTokens, input.result.usage.outputTokens,
      input.result.mode, input.result.reason || null, input.isTest,
      input.result.latencyMs],
  ) as Array<{ result?: Record<string, unknown> }>;
  const result = rows[0]?.result || {};
  if (result.ok !== true) throw new Error(asText(result.error) || "ai_budget_finalization_failed");
  return result;
}

function artifactContent(type: AiArtifactType, result: AiLeadIntelligenceResult) {
  if (type === "email_draft") return result.output.suggestedEmailDraft;
  if (type === "sms_draft") return result.output.suggestedSmsDraft;
  if (type === "call_script") return result.output.suggestedCallOpener;
  if (type === "clarifying_questions") return result.output.suggestedQuestions.map((item) => `- ${item}`).join("\n");
  if (type === "appointment_brief") {
    return [result.output.summary, "", "Key facts", ...result.output.keyFacts.map((item) => `- ${item}`), "", "Questions", ...result.output.suggestedQuestions.map((item) => `- ${item}`)].join("\n");
  }
  return [result.output.summary, "", result.output.recommendedNextHumanAction].join("\n");
}

function artifactChannel(type: AiArtifactType) {
  if (type === "email_draft") return "email";
  if (type === "sms_draft") return "sms";
  if (type === "call_script") return "phone";
  return null;
}

export function aiArtifactPermissionAllowed(
  rows: Array<Record<string, unknown>>,
  artifactType: AiArtifactType,
) {
  const channel = artifactChannel(artifactType);
  if (!channel) return true;
  return rows.some((row) =>
    asText(row.channel) === channel
    && asText(row.purpose) === "requested_service_response"
    && asText(row.state) === "allowed"
    && row.manual_review_required !== true
    && row.manual_review_required !== "true",
  );
}

export async function persistLeadIntelligenceDraft(input: {
  sql: Query;
  leadId: string;
  facts: LeadIntelligenceFacts;
  result: AiLeadIntelligenceResult;
  actor: string;
  artifactType: AiArtifactType;
}) {
  const sourceFingerprint = leadFactsFingerprint(input.facts);
  const content = artifactContent(input.artifactType, input.result);
  const contentHash = createHash("sha256").update(content).digest("hex");
  const evidenceReferences = [
    `lead:${input.leadId}`,
    input.facts.source ? `source:${input.facts.source}` : null,
    input.facts.placement ? `placement:${input.facts.placement}` : null,
  ].filter((value): value is string => Boolean(value));
  const limitations = [
    "Human review required. Approval does not send communication.",
    input.facts.isTest ? "Test record — do not contact." : null,
    input.facts.suppressed ? "Communication suppressed." : null,
    ...input.result.output.consentLimitations,
  ].filter((value): value is string => Boolean(value));
  const rows = await input.sql.query(
    `SELECT public.persist_ai_intelligence_draft_v1(
       $1::uuid, 'acc-v1', 'acc-v1', $2::text, $3::text, $4::jsonb,
       $5::text, $6::boolean, $7::text, $8::text, $9::text, $10::text,
       $11::text, $12::text, $13::jsonb, $14::jsonb, $15::jsonb, now()
     ) AS result`,
    [input.leadId, input.result.mode, input.result.model, JSON.stringify(input.result.output),
      sourceFingerprint, input.facts.isTest, input.actor, input.artifactType,
      artifactChannel(input.artifactType), "requested_service_response", content,
      contentHash, JSON.stringify(evidenceReferences),
      JSON.stringify(input.result.output.missingFacts), JSON.stringify(limitations)],
  ) as Array<{ result?: Record<string, unknown> }>;
  const result = rows[0]?.result || {};
  if (result.ok !== true) throw new Error(asText(result.error) || "ai_draft_persistence_failed");
  return result;
}

export async function loadLatestAiDraft(input: {
  sql: Query;
  leadId: string;
  artifactType: AiArtifactType;
  sourceFingerprint?: string;
}) {
  const rows = await input.sql.query(
    `SELECT DISTINCT ON (draft_key)
            id, draft_key, version, lead_id, intelligence_id, artifact_type, channel, purpose,
            status, content, content_hash, source_fingerprint,
            evidence_references, missing_facts, limitations,
            model, created_by, reviewed_by, reviewed_at, created_at, updated_at
       FROM public.ai_draft_reviews
      WHERE lead_id = $1::uuid AND artifact_type = $2
        AND ($3::text IS NULL OR source_fingerprint = $3)
      ORDER BY draft_key, version DESC`,
    [input.leadId, input.artifactType, input.sourceFingerprint || null],
  ) as Array<Record<string, unknown>>;
  return rows.sort((a, b) => asText(b.updated_at).localeCompare(asText(a.updated_at)))[0] || null;
}

export async function loadLeadIntelligenceFacts(sql: Query, leadId: string, assignedAgentId?: string | null) {
  const scoped = Boolean(assignedAgentId);
  const rows = await sql.query(
    `SELECT l.id, l.lead_type, l.status, l.score, l.score_factors,
            l.source, l.source_detail, l.timeline_months,
            l.target_geography, l.city, l.is_test, l.communication_suppressed,
            l.question_raw, l.notes, l.assigned_agent_id, l.routing_reason,
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
  const permissionRows = await sql.query(
    `SELECT channel, purpose, state, consent_version, source, evidence_at,
            manual_review_required, updated_at
       FROM public.communication_permissions
      WHERE lead_id = $1::uuid
      ORDER BY updated_at DESC, id DESC`,
    [row.id],
  ) as Array<Record<string, unknown>>;
  const facts: LeadIntelligenceFacts = {
    leadType: boundedText(row.lead_type, 100) || "general",
    status: boundedText(row.status, 100) || "unknown",
    score: asNumber(row.score),
    scoreExplanation: scoreExplanations(row.score_factors),
    source: boundedText(row.source, 200) || boundedText(row.source_detail, 200) || "unknown",
    placement: boundedText(row.placement_id, 200) || boundedText(row.source_detail, 200),
    timeline: asNumber(row.timeline_months) == null ? "" : `${asNumber(row.timeline_months)} months`,
    targetGeography: boundedText(row.target_geography, 300) || boundedText(row.city, 300),
    consentEmail: channelAllowed(permissionRows, "email"),
    consentSms: channelAllowed(permissionRows, "sms"),
    consentCall: channelAllowed(permissionRows, "phone"),
    isTest: asBoolean(row.is_test),
    suppressed: asBoolean(row.communication_suppressed),
    question: [asText(row.question_raw), asText(row.notes)].filter(Boolean).join("\n").slice(0, 4_000),
  };
  return {
    leadId: String(row.id),
    facts,
    permissionRows,
    assignedAgentId: asText(row.assigned_agent_id) || null,
    routingReason: asText(row.routing_reason) || null,
  };
}

export async function persistLeadIntelligence(input: {
  sql: Query;
  leadId: string;
  facts: LeadIntelligenceFacts;
  result: AiLeadIntelligenceResult;
  actor: string;
  feature?: string;
}) {
  const fingerprint = leadFactsFingerprint(input.facts);
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
      fingerprint, null, input.facts.isTest, input.actor],
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
