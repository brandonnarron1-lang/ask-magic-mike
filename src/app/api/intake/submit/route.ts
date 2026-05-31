import { NextRequest, NextResponse } from "next/server";
import { SubmitIntakeSchema } from "@/schemas/lead.schema";
import { computeScore } from "@/lib/scoring";
import { getCRMAdapter } from "@/lib/crm";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { upsertContact } from "@/lib/db/contact-repository";
import { upsertLead, updateLeadStatus, updateLeadCRM } from "@/lib/db/lead-repository";
import { upsertProperty } from "@/lib/db/property-repository";
import { createConsentsFromLead } from "@/lib/db/consent-repository";
import { completeSession } from "@/lib/db/session-repository";
import { isDev } from "@/lib/db/types";
import type { ScoringInput } from "@/types/domain.types";

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
  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  // 1. Compute score (always — no DB required)
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
    utmSource:      null,
    utmMedium:      null,
  };

  const score = computeScore(scoringInput);

  let leadId: string | null = null;
  let routingDecision = null;

  // 2. Persist to DB
  if (!isDev()) {
    try {
      // Upsert contact (dedup by email/phone)
      const contact = await upsertContact({
        firstName: input.firstName,
        lastName:  input.lastName,
        email:     input.email,
        phone:     input.phone,
      });

      const consentTimestamp =
        input.consentSms || input.consentCall || input.consentEmail
          ? new Date().toISOString()
          : null;

      // Upsert lead
      const lead = await upsertLead({
        sessionId:        input.sessionId,
        contactId:        contact?.id ?? null,
        firstName:        input.firstName,
        lastName:         input.lastName,
        email:            input.email,
        phone:            input.phone,
        addressLine1:     input.addressLine1,
        addressLine2:     input.addressLine2,
        city:             input.city,
        state:            input.state ?? "NC",
        zip:              input.zip,
        addressRaw:       input.addressRaw,
        primaryIntent:    input.primaryIntent,
        questionRaw:      input.questionRaw,
        timelineMonths:   input.timelineMonths,
        consentSms:       input.consentSms,
        consentCall:      input.consentCall,
        consentEmail:     input.consentEmail,
        consentTimestamp,
        consentIp:        ip,
        ctaChipUsed:      input.ctaChipUsed,
        status:           "scored",
      });

      if (lead) {
        leadId = lead.id;

        // Upsert property
        if (input.addressLine1 || input.addressRaw) {
          await upsertProperty({
            leadId:       leadId,
            addressLine1: input.addressLine1,
            addressLine2: input.addressLine2,
            city:         input.city,
            state:        input.state ?? "NC",
            zip:          input.zip,
            addressRaw:   input.addressRaw,
          });
        }

        // Write consents
        if (consentTimestamp) {
          await createConsentsFromLead({
            leadId,
            contactId:  contact?.id ?? null,
            sms:        input.consentSms,
            call:       input.consentCall,
            email:      input.consentEmail,
            ipAddress:  ip,
            userAgent,
          });
        }

        // Persist score
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const client = createAdminClient();

        await client.from("lead_scores").upsert(
          {
            lead_id:                leadId,
            seller_certainty_score: score.sellerCertaintyScore,
            buyer_certainty_score:  score.buyerCertaintyScore,
            composite_score:        score.compositeScore,
            temperature:            score.temperature,
            factor_log:             score.factorLog as unknown as import("@/types/database.types").Json,
            scorer_version:         score.scorerVersion,
          },
          { onConflict: "lead_id" }
        );

        // Route to agent
        const { data: agentsData } = await client
          .from("agents")
          .select("*")
          .eq("is_active", true);

        if (agentsData && agentsData.length > 0) {
          const { assignAgent } = await import("@/lib/routing/assign-agent");
          const agents = agentsData.map((a) => ({
            id:                 a.id,
            createdAt:          new Date(a.created_at),
            updatedAt:          new Date(a.updated_at),
            name:               a.name,
            email:              a.email,
            phone:              a.phone,
            role:               a.role as "primary" | "backup" | "admin",
            isActive:           a.is_active,
            maxDailyLeads:      a.max_daily_leads,
            currentLoad:        a.current_load,
            priorityScore:      a.priority_score,
            availability:       a.availability as Record<string, [number, number]>,
            timezone:           a.timezone,
            notificationEmail:  a.notification_email,
            notificationSms:    a.notification_sms,
            notificationPhone:  a.notification_phone,
          }));

          const decision = assignAgent(agents);
          if (decision) {
            await client.from("lead_routing").upsert(
              {
                lead_id:              leadId,
                agent_id:             decision.agentId,
                assignment_reason:    decision.assignmentReason,
                agent_priority_score: decision.agentPriorityScore,
                status:               "pending",
              },
              { onConflict: "lead_id" }
            );

            await updateLeadStatus(leadId, "assigned");

            await client
              .from("agents")
              .update({
                current_load:
                  agentsData.find((a) => a.id === decision.agentId)!.current_load + 1,
              })
              .eq("id", decision.agentId);

            routingDecision = decision;

            trackEventNoWait({
              eventName: "lead_assigned",
              leadId:    leadId,
              sessionId: input.sessionId,
              properties: {
                agentId:     decision.agentId,
                agentName:   decision.agentName,
                temperature: score.temperature,
              },
            });
          }
        }

        // CRM sync (fire and forget)
        const crm = getCRMAdapter();
        const crmStart = Date.now();
        try {
          const contactResult = await crm.createOrUpdateContact({
            firstName: input.firstName,
            lastName:  input.lastName,
            email:     input.email,
            phone:     input.phone,
            source:    "ask-magic-mike",
            tags: [
              `intent:${input.primaryIntent}`,
              `temperature:${score.temperature}`,
            ],
          });

          await crm.createOrUpdateLead({
            contactId:   contactResult.contactId,
            address:     input.addressRaw ?? input.addressLine1,
            intent:      input.primaryIntent,
            temperature: score.temperature,
            sellerScore: score.sellerCertaintyScore,
            buyerScore:  score.buyerCertaintyScore,
            notes:       `Ask Magic Mike intake. Question: ${input.questionRaw ?? "N/A"}`,
          });

          const duration = Date.now() - crmStart;
          await client.from("crm_sync_log").insert({
            lead_id:    leadId,
            operation:  "create_contact",
            adapter:    crm.name,
            status:     "success",
            duration_ms: duration,
          });

          await updateLeadCRM(leadId, contactResult.contactId);
          if (contact) await (await import("@/lib/db/contact-repository")).updateContactCRM(contact.id, contactResult.contactId);

          trackEventNoWait({
            eventName: "crm_sync_success",
            leadId:    leadId,
            properties: { adapter: crm.name, contactCreated: contactResult.created },
          });
        } catch (crmErr) {
          const duration = Date.now() - crmStart;
          const errorMsg = crmErr instanceof Error ? crmErr.message : String(crmErr);
          console.error("[intake/submit] CRM sync failed:", errorMsg);

          await client.from("crm_sync_log").insert({
            lead_id:       leadId,
            operation:     "create_contact",
            adapter:       crm.name,
            status:        "error",
            error_message: errorMsg,
            duration_ms:   duration,
          });

          trackEventNoWait({
            eventName: "crm_sync_error",
            leadId:    leadId,
            properties: { adapter: crm.name, error: errorMsg },
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[intake/submit] persistence error:", msg);
    }

    // Mark session complete
    await completeSession(input.sessionId);
  }

  // 3. Fire analytics events (dev + prod)
  trackEventNoWait({
    eventName: "intake_completed",
    leadId:    leadId ?? undefined,
    sessionId: input.sessionId,
    properties: {
      temperature:    score.temperature,
      compositeScore: score.compositeScore,
      primaryIntent:  input.primaryIntent,
    },
  });

  trackEventNoWait({
    eventName: "lead_scored",
    leadId:    leadId ?? undefined,
    sessionId: input.sessionId,
    properties: {
      sellerScore:    score.sellerCertaintyScore,
      buyerScore:     score.buyerCertaintyScore,
      compositeScore: score.compositeScore,
      temperature:    score.temperature,
      factorCount:    score.factorLog.length,
    },
  });

  if (input.consentSms || input.consentCall || input.consentEmail) {
    trackEventNoWait({
      eventName: "consent_granted",
      leadId:    leadId ?? undefined,
      sessionId: input.sessionId,
      properties: {
        sms:   input.consentSms,
        call:  input.consentCall,
        email: input.consentEmail,
      },
    });
  }

  return NextResponse.json({
    leadId,
    score: {
      sellerCertaintyScore: score.sellerCertaintyScore,
      buyerCertaintyScore:  score.buyerCertaintyScore,
      compositeScore:       score.compositeScore,
      temperature:          score.temperature,
    },
    routing: routingDecision,
  });
}
