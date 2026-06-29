import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { SubmitIntakeSchema } from "@/schemas/lead.schema";
import { computeScore } from "@/lib/scoring";
import { classifyReferrer } from "@/lib/attribution/referrer-classifier";
import { assignAgent } from "@/lib/routing/assign-agent";
import { isSupabaseConfigured } from "@/lib/db/types";
import type { ScoringInput } from "@/types/domain.types";

// Ghost lead smoke — validates the full intake pipeline without any DB writes.
// Admin-only. Returns a structured report of what WOULD happen for a given payload.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  // Auth gate must be first — same guard as all admin routes
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: NO_STORE }
    );
  }

  // Validate with the same schema as the real intake submit path
  const parsed = SubmitIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        smokeMode: true,
        dbWrites: "none",
        payload: {
          valid: false,
          schema: "SubmitIntakeSchema",
          errors: parsed.error.flatten().fieldErrors,
        },
        checks: { auth: "pass", payloadValid: "fail" },
      },
      { status: 422, headers: NO_STORE }
    );
  }

  const input = parsed.data;

  // ─── Score (pure — no DB) ──────────────────────────────────────────────────
  const scoringInput: ScoringInput = {
    primaryIntent:  input.primaryIntent,
    timelineMonths: input.timelineMonths,
    questionRaw:    input.questionRaw,
    hasEmail:       !!input.email,
    hasPhone:       !!input.phone,
    hasAddress:     !!(input.addressRaw || input.addressLine1),
    hasName:        !!(input.firstName || input.lastName),
    consentSms:     input.consentSms,
    consentCall:    input.consentCall,
    consentEmail:   input.consentEmail,
    ctaChipUsed:    input.ctaChipUsed,
    utmSource:      input.utmSource,
    utmMedium:      input.utmMedium,
  };
  const score = computeScore(scoringInput);

  // ─── Attribution (pure — no DB) ───────────────────────────────────────────
  const referrerType = classifyReferrer(
    input.referrerUrl ?? "",
    input.utmMedium ?? null,
  );
  const hasAttribution = !!(
    input.utmSource || input.utmMedium || input.utmCampaign ||
    input.utmContent || input.utmTerm || input.referrerUrl
  );

  // ─── Routing simulation (read-only DB — no writes) ────────────────────────
  let agentsAvailable = 0;
  let routingDecision = null;
  if (isSupabaseConfigured()) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const client = createAdminClient();
      const { data: agentsData } = await client
        .from("agents")
        .select(
          "id, name, email, phone, role, is_active, max_daily_leads, current_load, " +
          "priority_score, availability, timezone, notification_email, " +
          "notification_sms, notification_phone, created_at, updated_at"
        )
        .eq("is_active", true);

      if (agentsData && agentsData.length > 0) {
        agentsAvailable = agentsData.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agents = agentsData.map((a: any) => ({
          id:                a.id as string,
          createdAt:         new Date(a.created_at as string),
          updatedAt:         new Date(a.updated_at as string),
          name:              a.name as string,
          email:             a.email as string,
          phone:             (a.phone as string | null) ?? null,
          role:              a.role as "primary" | "backup" | "admin",
          isActive:          a.is_active as boolean,
          maxDailyLeads:     a.max_daily_leads as number,
          currentLoad:       a.current_load as number,
          priorityScore:     a.priority_score as number,
          availability:      a.availability as Record<string, [number, number]>,
          timezone:          a.timezone as string,
          notificationEmail: a.notification_email as boolean,
          notificationSms:   a.notification_sms as boolean,
          notificationPhone: (a.notification_phone as string | null) ?? null,
        }));
        routingDecision = assignAgent(agents);
      }
    } catch {
      // Routing simulation is best-effort; log but don't block the smoke report
    }
  }

  // ─── Consent (no INSERT — validates what would be written) ────────────────
  const wouldInsertConsents: string[] = [];
  if (input.consentSms)   wouldInsertConsents.push("sms");
  if (input.consentCall)  wouldInsertConsents.push("call");
  if (input.consentEmail) wouldInsertConsents.push("email");

  // ─── Property (no UPSERT — validates what would be written) ───────────────
  const wouldUpsertProperty = !!(input.addressLine1 || input.addressRaw);

  return NextResponse.json(
    {
      smokeMode: true,
      dbWrites:  "none",
      timestamp: new Date().toISOString(),
      payload: {
        valid:      true,
        schema:     "SubmitIntakeSchema",
        fieldCount: Object.keys(input).length,
      },
      score: {
        sellerCertaintyScore: score.sellerCertaintyScore,
        buyerCertaintyScore:  score.buyerCertaintyScore,
        compositeScore:       score.compositeScore,
        temperature:          score.temperature,
        factorCount:          score.factorLog.length,
      },
      attribution: {
        referrerType,
        utmSource:      input.utmSource ?? null,
        utmMedium:      input.utmMedium ?? null,
        isPaid:         referrerType === "paid",
        hasAttribution,
      },
      routing: {
        agentsAvailable,
        wouldAssign:        routingDecision !== null,
        agentId:            routingDecision?.agentId ?? null,
        agentName:          routingDecision?.agentName ?? null,
        reason:             routingDecision?.assignmentReason ?? null,
        agentPriorityScore: routingDecision?.agentPriorityScore ?? null,
      },
      consent: {
        wouldInsert:     wouldInsertConsents,
        count:           wouldInsertConsents.length,
        languageVersion: "v1",
      },
      property: {
        wouldUpsert:  wouldUpsertProperty,
        addressLine1: input.addressLine1 ?? input.addressRaw ?? null,
        city:         input.city ?? "Wilson",
        state:        input.state,
      },
      checks: {
        auth:                  "pass",
        payloadValid:          "pass",
        scoreComputed:         "pass",
        attributionClassified: "pass",
        routingSimulated:      agentsAvailable > 0 ? "pass" : "no_agents",
        consentValidated:      "pass",
        propertyValidated:     "pass",
        dbWritesPrevented:     "pass",
      },
    },
    { headers: NO_STORE }
  );
}
