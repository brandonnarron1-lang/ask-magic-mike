import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAiLeadIntelligence,
  getAiRuntimeConfig,
  reservedAiRequestCost,
} from "@/lib/ai/openai-responses";
import {
  AI_ARTIFACT_TYPES,
  aiArtifactPermissionAllowed,
  finalizeAiBudget,
  leadFactsFingerprint,
  loadLeadIntelligenceFacts,
  loadLatestAiDraft,
  persistLeadIntelligenceDraft,
  reserveAiBudget,
} from "@/lib/ai/neon-intelligence";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "@/lib/admin/rbac-policy";
import { copilotToolsForRole } from "@/lib/ai/copilot-tool-register";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";

const requestSchema = z.object({
  leadId: z.string().uuid(),
  artifactType: z.enum(AI_ARTIFACT_TYPES).default("lead_summary"),
});
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
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
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return NextResponse.json({ ok: false, error: mutation.error }, { status: mutation.statusCode, headers: NO_STORE });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });
  }

  const sql = neon(process.env.DATABASE_URL);
  const scoped = !hasLeadCenterPermission(auth.principal.role, "lead:view_all");
  if (scoped && !auth.principal.agentId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  let loaded: Awaited<ReturnType<typeof loadLeadIntelligenceFacts>>;
  try {
    loaded = await loadLeadIntelligenceFacts(
      sql,
      parsed.data.leadId,
      scoped ? auth.principal.agentId : null,
    );
  } catch {
    return NextResponse.json({ ok: false, error: "communication_permissions_unavailable" }, { status: 503, headers: NO_STORE });
  }
  if (!loaded) {
    return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404, headers: NO_STORE });
  }
  const { facts, permissionRows } = loaded;
  if (facts.isTest || facts.suppressed) {
    return NextResponse.json({ ok: false, error: facts.isTest ? "test_record_ai_draft_blocked" : "suppressed_lead_ai_draft_blocked" }, { status: 409, headers: NO_STORE });
  }
  if (!aiArtifactPermissionAllowed(permissionRows, parsed.data.artifactType)) {
    return NextResponse.json({ ok: false, error: "communication_permission_missing" }, { status: 409, headers: NO_STORE });
  }

  const runtime = getAiRuntimeConfig();
  const sourceFingerprint = leadFactsFingerprint(facts);
  const requestKey = createHash("sha256")
    .update(`${loaded.leadId}:${sourceFingerprint}:${parsed.data.artifactType}:acc-v1:${runtime.model}`)
    .digest("hex");
  let reservation;
  try {
    reservation = await reserveAiBudget({
      sql,
      requestKey,
      leadId: loaded.leadId,
      feature: "agent_command_center_draft",
      model: runtime.model,
      dailyLimitUsd: runtime.dailyCostLimitUsd,
      reserveCostUsd: reservedAiRequestCost(runtime),
      actorUserId: auth.principal.userId,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "ai_budget_reservation_unavailable" }, { status: 503, headers: NO_STORE });
  }
  if (!reservation.ok || !reservation.id) {
    const capped = reservation.error === "daily_ai_cost_cap_reached";
    return NextResponse.json({ ok: false, error: reservation.error || "ai_budget_reservation_failed" }, { status: capped ? 429 : 503, headers: NO_STORE });
  }
  if (reservation.idempotentReplay) {
    if (reservation.status === "reserved") {
      return NextResponse.json({ ok: false, error: "ai_draft_generation_in_progress" }, { status: 409, headers: NO_STORE });
    }
    const existing = await loadLatestAiDraft({ sql, leadId: loaded.leadId, artifactType: parsed.data.artifactType, sourceFingerprint });
    if (existing) {
      return NextResponse.json({ ok: true, replayed: true, draft: existing, sendsCommunication: false }, { headers: NO_STORE });
    }
    return NextResponse.json({ ok: false, error: "ai_draft_receipt_missing" }, { status: 503, headers: NO_STORE });
  }

  const result = await generateAiLeadIntelligence(facts, { reservationAuthorized: true });
  try {
    await finalizeAiBudget({ sql, reservationId: reservation.id, result, isTest: facts.isTest });
  } catch {
    return NextResponse.json({ ok: false, error: "ai_usage_accounting_failed" }, { status: 503, headers: NO_STORE });
  }

  let draft: Record<string, unknown> | null;
  try {
    await persistLeadIntelligenceDraft({
      sql,
      leadId: loaded.leadId,
      facts,
      result,
      actor: auth.principal.userId,
      artifactType: parsed.data.artifactType,
    });
    draft = await loadLatestAiDraft({
      sql,
      leadId: loaded.leadId,
      artifactType: parsed.data.artifactType,
      sourceFingerprint,
    });
    if (!draft) throw new Error("ai_draft_receipt_missing");
  } catch {
    return NextResponse.json({ ok: false, error: "ai_draft_persistence_failed" }, { status: 503, headers: NO_STORE });
  }

  const [notificationRows, attributionRows] = await Promise.all([
    sql.query(
      `SELECT channel, notification_type, status, provider, attempt_count,
              error_code, sent_at, failed_at, updated_at
         FROM public.lead_notifications WHERE lead_id = $1::uuid
        ORDER BY created_at DESC, id DESC LIMIT 10`,
      [loaded.leadId],
    ).catch(() => []),
    sql.query(
      `SELECT utm_source, utm_medium, utm_campaign, utm_content,
              first_touch, last_touch, placement_id, created_at
         FROM public.source_attribution WHERE lead_id = $1::uuid
        ORDER BY created_at ASC, id ASC LIMIT 10`,
      [loaded.leadId],
    ).catch(() => []),
  ]);

  return NextResponse.json({
    ...result,
    draft,
    context: {
      recordedFacts: {
        leadType: facts.leadType,
        status: facts.status,
        score: facts.score,
        source: facts.source,
        placement: facts.placement,
      },
      deterministicControls: {
        consent: { email: facts.consentEmail, sms: facts.consentSms, call: facts.consentCall },
        communicationPermissions: permissionRows,
        recentNotifications: notificationRows,
        attribution: attributionRows,
        currentAssignment: {
          agentId: loaded.assignedAgentId,
          routingReason: loaded.routingReason || "not_recorded",
        },
        aiCanSend: false,
        aiCanAssign: false,
        aiCanChangeScore: false,
        dailyCostLimitUsd: runtime.dailyCostLimitUsd,
        perLeadCostLimitUsd: runtime.perLeadCostLimitUsd,
      },
    },
    tools: copilotToolsForRole(auth.principal.role),
    sendsCommunication: false,
  }, { headers: NO_STORE });
}
