import { NextRequest, NextResponse } from "next/server";
import { SubmitIntakeSchema } from "@/schemas/lead.schema";
import { computeScore } from "@/lib/scoring";
import { getCRMAdapter } from "@/lib/crm";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { stripToDigits } from "@/lib/utils/phone";
import type { ScoringInput } from "@/types/domain.types";
import type { Json } from "@/types/database.types";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SubmitIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const input = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // 1. Build scoring input
  const scoringInput: ScoringInput = {
    primaryIntent: input.primaryIntent,
    timelineMonths: input.timelineMonths,
    questionRaw: input.questionRaw,
    hasEmail: !!input.email,
    hasPhone: !!input.phone,
    hasAddress: !!(input.addressRaw || input.addressLine1),
    hasName: !!(input.firstName || input.lastName),
    consentSms: input.consentSms,
    consentCall: input.consentCall,
    consentEmail: input.consentEmail,
    ctaChipUsed: input.ctaChipUsed,
    utmSource: null,
    utmMedium: null,
  };

  const score = computeScore(scoringInput);

  // 2. Persist lead + score to DB if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let leadId: string | null = null;
  let routingDecision = null;

  if (supabaseUrl && serviceKey) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();

    const consentTimestamp =
      input.consentSms || input.consentCall || input.consentEmail
        ? new Date().toISOString()
        : null;

    // Upsert lead
    const { data: lead, error: leadError } = await client
      .from("leads")
      .upsert(
        {
          session_id: input.sessionId,
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          phone: input.phone,
          phone_normalized: input.phone ? stripToDigits(input.phone) : null,
          address_line1: input.addressLine1,
          address_line2: input.addressLine2,
          city: input.city,
          state: input.state,
          zip: input.zip,
          address_raw: input.addressRaw,
          primary_intent: input.primaryIntent,
          question_raw: input.questionRaw,
          timeline_months: input.timelineMonths,
          consent_sms: input.consentSms,
          consent_call: input.consentCall,
          consent_email: input.consentEmail,
          consent_timestamp: consentTimestamp,
          consent_ip: ip,
          cta_chip_used: input.ctaChipUsed,
          status: "scored",
        },
        { onConflict: "session_id" }
      )
      .select("id")
      .single();

    if (leadError) {
      console.error("[intake/submit] Lead upsert error:", leadError.message);
    } else {
      leadId = lead.id;

      // Upsert score
      await client.from("lead_scores").upsert(
        {
          lead_id: leadId,
          seller_certainty_score: score.sellerCertaintyScore,
          buyer_certainty_score: score.buyerCertaintyScore,
          composite_score: score.compositeScore,
          temperature: score.temperature,
          factor_log: score.factorLog as unknown as Json,
          scorer_version: score.scorerVersion,
        },
        { onConflict: "lead_id" }
      );

      // 3. Route to agent
      const { data: agentsData } = await client
        .from("agents")
        .select("*")
        .eq("is_active", true);

      if (agentsData && agentsData.length > 0) {
        const { assignAgent } = await import("@/lib/routing/assign-agent");
        const agents = agentsData.map((a) => ({
          id: a.id,
          createdAt: new Date(a.created_at),
          updatedAt: new Date(a.updated_at),
          name: a.name,
          email: a.email,
          phone: a.phone,
          role: a.role as "primary" | "backup" | "admin",
          isActive: a.is_active,
          maxDailyLeads: a.max_daily_leads,
          currentLoad: a.current_load,
          priorityScore: a.priority_score,
          availability: a.availability as Record<string, [number, number]>,
          timezone: a.timezone,
          notificationEmail: a.notification_email,
          notificationSms: a.notification_sms,
          notificationPhone: a.notification_phone,
        }));

        const decision = assignAgent(agents);
        if (decision) {
          const now = new Date();
          await client.from("lead_routing").upsert(
            {
              lead_id: leadId,
              agent_id: decision.agentId,
              assignment_reason: decision.assignmentReason,
              agent_priority_score: decision.agentPriorityScore,
              status: "pending",
            },
            { onConflict: "lead_id" }
          );

          await client
            .from("leads")
            .update({ status: "assigned" })
            .eq("id", leadId);

          await client
            .from("agents")
            .update({ current_load: agentsData.find((a) => a.id === decision.agentId)!.current_load + 1 })
            .eq("id", decision.agentId);

          routingDecision = decision;
          void now;

          trackEventNoWait({
            eventName: "lead_assigned",
            leadId: leadId ?? undefined,
            sessionId: input.sessionId,
            properties: {
              agentId: decision.agentId,
              agentName: decision.agentName,
              temperature: score.temperature,
            },
          });
        }
      }

      // 4. CRM sync (fire and forget)
      const crm = getCRMAdapter();
      const crmStart = Date.now();
      try {
        const contactResult = await crm.createOrUpdateContact({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          source: "ask-magic-mike",
          tags: [
            `intent:${input.primaryIntent}`,
            `temperature:${score.temperature}`,
          ],
        });

        await crm.createOrUpdateLead({
          contactId: contactResult.contactId,
          address: input.addressRaw ?? input.addressLine1,
          intent: input.primaryIntent,
          temperature: score.temperature,
          sellerScore: score.sellerCertaintyScore,
          buyerScore: score.buyerCertaintyScore,
          notes: `Ask Magic Mike intake. Question: ${input.questionRaw ?? "N/A"}`,
        });

        const duration = Date.now() - crmStart;
        await client.from("crm_sync_log").insert({
          lead_id: leadId,
          operation: "create_contact",
          adapter: crm.name,
          status: "success",
          duration_ms: duration,
        });

        await client
          .from("leads")
          .update({
            crm_contact_id: contactResult.contactId,
            crm_synced_at: new Date().toISOString(),
          })
          .eq("id", leadId);

        trackEventNoWait({
          eventName: "crm_sync_success",
          leadId: leadId ?? undefined,
          properties: { adapter: crm.name, contactCreated: contactResult.created },
        });
      } catch (crmErr) {
        const duration = Date.now() - crmStart;
        const errorMsg =
          crmErr instanceof Error ? crmErr.message : String(crmErr);
        console.error("[intake/submit] CRM sync failed:", errorMsg);

        await client.from("crm_sync_log").insert({
          lead_id: leadId,
          operation: "create_contact",
          adapter: crm.name,
          status: "error",
          error_message: errorMsg,
          duration_ms: duration,
        });

        trackEventNoWait({
          eventName: "crm_sync_error",
          leadId: leadId ?? undefined,
          properties: { adapter: crm.name, error: errorMsg },
        });
      }
    }
  }

  // Fire intake_completed event
  trackEventNoWait({
    eventName: "intake_completed",
    leadId: leadId ?? undefined,
    sessionId: input.sessionId,
    properties: {
      temperature: score.temperature,
      compositeScore: score.compositeScore,
      primaryIntent: input.primaryIntent,
    },
  });

  trackEventNoWait({
    eventName: "lead_scored",
    leadId: leadId ?? undefined,
    sessionId: input.sessionId,
    properties: {
      sellerScore: score.sellerCertaintyScore,
      buyerScore: score.buyerCertaintyScore,
      compositeScore: score.compositeScore,
      temperature: score.temperature,
      factorCount: score.factorLog.length,
    },
  });

  if (input.consentSms || input.consentCall || input.consentEmail) {
    trackEventNoWait({
      eventName: "consent_granted",
      leadId: leadId ?? undefined,
      sessionId: input.sessionId,
      properties: {
        sms: input.consentSms,
        call: input.consentCall,
        email: input.consentEmail,
      },
    });
  }

  return NextResponse.json({
    leadId,
    score: {
      sellerCertaintyScore: score.sellerCertaintyScore,
      buyerCertaintyScore: score.buyerCertaintyScore,
      compositeScore: score.compositeScore,
      temperature: score.temperature,
    },
    routing: routingDecision,
  });
}
