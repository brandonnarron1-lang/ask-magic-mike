import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAiLeadIntelligence, type LeadIntelligenceFacts } from "@/lib/ai/openai-responses";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "@/lib/admin/rbac-policy";
import { copilotToolsForRole } from "@/lib/ai/copilot-tool-register";

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
    `SELECT l.id, l.lead_type, l.status, l.score, l.score_factors,
            l.source, l.source_detail, l.timeline_months,
            l.target_geography, l.city, l.consent_email, l.consent_sms,
            l.consent_call, l.is_test, l.communication_suppressed,
            l.question_raw, l.notes, l.assigned_agent_id, l.routing_reason,
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

  const dailyUsageRows = await sql.query(
    `SELECT COALESCE(sum(estimated_cost_usd), 0)::numeric AS cost
       FROM public.ai_usage_events
      WHERE feature IN ('lead_center_copilot', 'async_lead_center_copilot')
        AND created_at >= date_trunc('day', now())`,
  ).catch(() => [{ cost: 0 }]) as Array<{ cost: string | number }>;
  const dailyEstimatedCostUsd = Number(dailyUsageRows[0]?.cost || 0);
  const result = await generateAiLeadIntelligence(facts, { dailyEstimatedCostUsd });
  const [permissionRows, notificationRows, attributionRows, providerEventRows, priorAiRows] = await Promise.all([
    sql.query(
      `SELECT channel, purpose, state, consent_version, source, evidence_at
         FROM public.communication_permissions WHERE lead_id = $1::uuid
        ORDER BY updated_at DESC LIMIT 25`,
      [row.id],
    ).catch(() => []),
    sql.query(
      `SELECT channel, notification_type, status, provider, provider_message_id,
              attempt_count, error_code, error_summary, sent_at, failed_at, updated_at
         FROM public.lead_notifications WHERE lead_id = $1::uuid
        ORDER BY created_at DESC LIMIT 10`,
      [row.id],
    ).catch(() => []),
    sql.query(
      `SELECT utm_source, utm_medium, utm_campaign, utm_content, utm_term,
              referrer_url, landing_page, first_touch, last_touch, click_ids,
              placement_id, page_title, listing_id, property_id, agent_id, created_at
         FROM public.source_attribution
        WHERE lead_id = $1::uuid
        ORDER BY created_at ASC LIMIT 10`,
      [row.id],
    ).catch(() => []),
    sql.query(
      `SELECT pwe.provider, pwe.provider_message_id, pwe.event_type,
              pwe.signature_verified, pwe.processing_status, pwe.error_code,
              pwe.occurred_at, pwe.received_at, pwe.processed_at
         FROM public.provider_webhook_events pwe
         JOIN public.lead_notifications ln
           ON ln.provider_message_id = pwe.provider_message_id
          AND (ln.provider IS NULL OR lower(ln.provider) = lower(pwe.provider))
        WHERE ln.lead_id = $1::uuid
        ORDER BY COALESCE(pwe.occurred_at, pwe.received_at) DESC LIMIT 25`,
      [row.id],
    ).catch(() => []),
    sql.query(
      `SELECT ali.schema_version, ali.prompt_version, ali.mode, ali.model,
              ali.output, ali.confidence, ali.created_at,
              aue.input_tokens, aue.output_tokens, aue.estimated_cost_usd,
              aue.latency_ms, aue.fallback_reason
         FROM public.ai_lead_intelligence ali
         LEFT JOIN LATERAL (
           SELECT input_tokens, output_tokens, estimated_cost_usd, latency_ms, fallback_reason
             FROM public.ai_usage_events
            WHERE lead_id = ali.lead_id
            ORDER BY created_at DESC LIMIT 1
         ) aue ON true
        WHERE ali.lead_id = $1::uuid
        ORDER BY ali.created_at DESC LIMIT 1`,
      [row.id],
    ).catch(() => []),
  ]);
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

  return NextResponse.json({
    ...result,
    context: {
      recordedFacts: {
        leadType: facts.leadType,
        status: facts.status,
        score: facts.score,
        source: facts.source,
        placement: facts.placement,
        isTest: facts.isTest,
        suppressed: facts.suppressed,
      },
      deterministicControls: {
        consent: { email: facts.consentEmail, sms: facts.consentSms, call: facts.consentCall },
        communicationPermissions: permissionRows,
        recentNotifications: notificationRows,
        attribution: attributionRows,
        currentAssignment: {
          agentId: asText(row.assigned_agent_id) || null,
          routingReason: asText(row.routing_reason) || "not_recorded",
        },
        providerEvents: providerEventRows,
        previousAiIntelligence: priorAiRows[0] || null,
        aiCanSend: false,
        aiCanAssign: false,
        aiCanChangeScore: false,
        dailyEstimatedCostUsd,
        dailyCostLimitUsd: Math.max(0, Number(process.env.AI_DAILY_COST_LIMIT_USD) || 1),
      },
    },
    tools: copilotToolsForRole(auth.principal.role),
  }, { headers: NO_STORE });
}
