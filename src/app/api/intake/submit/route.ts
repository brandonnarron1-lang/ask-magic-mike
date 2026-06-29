import { NextRequest, NextResponse } from "next/server";
import { SubmitIntakeSchema } from "@/schemas/lead.schema";
import { computeScore } from "@/lib/scoring";
import { getCRMAdapter } from "@/lib/crm";
import { allocateLead } from "@/lib/leads/allocation";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { upsertContact } from "@/lib/db/contact-repository";
import { upsertLead, updateLeadStatus, updateLeadCRM } from "@/lib/db/lead-repository";
import { upsertProperty } from "@/lib/db/property-repository";
import { createConsentsFromLead } from "@/lib/db/consent-repository";
import { completeSession } from "@/lib/db/session-repository";
import { shouldUseDevStorage, isProduction, isSupabaseConfigured } from "@/lib/db/types";
import { classifyReferrer } from "@/lib/attribution/referrer-classifier";
import type { ScoringInput } from "@/types/domain.types";

const NO_STORE = { "Cache-Control": "no-store" };

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

  // Production without Supabase: reject — leads must persist somewhere real
  if (isProduction() && !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Configuration error", message: "Lead storage is not configured." },
      { status: 503, headers: NO_STORE }
    );
  }

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
    utmSource:      input.utmSource,
    utmMedium:      input.utmMedium,
  };

  const score = computeScore(scoringInput);

  let leadId: string | null = null;
  let routingDecision = null;
  let persistenceFailed = false;

  // 2. Persist to DB
  if (!shouldUseDevStorage()) {
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

        // Funnel events for this capture path. The canonical engine fires
        // these on /api/leads; the intake path computes the allocation with
        // the same pure engine so the funnel rollup sees both paths.
        // Emission failures must never block capture.
        try {
          const allocation = allocateLead(
            {
              lead_type:
                input.primaryIntent === "sell" || input.primaryIntent === "both"
                  ? "seller"
                  : input.primaryIntent === "buy"
                    ? "buyer"
                    : "unknown",
              source: "ask_magic_mike_landing",
              email: input.email ?? null,
              phone: input.phone ?? null,
              property_address: input.addressRaw ?? input.addressLine1 ?? null,
              city: input.city ?? null,
              state: input.state ?? undefined,
              zip: input.zip ?? null,
              intent: input.questionRaw ?? null,
              metadata: {},
            },
            {
              hasValidEmail: Boolean(input.email),
              hasValidPhone: Boolean(input.phone),
              hasValidAddress: Boolean(input.addressRaw || input.addressLine1),
              spamScore: 0,
            }
          );

          trackEventNoWait({
            eventName: "lead_created",
            leadId,
            sessionId: input.sessionId,
            properties: {
              source: "ask_magic_mike_landing",
              capturePath: "intake_submit",
              temperature: score.temperature,
            },
            utmSource:   input.utmSource   ?? undefined,
            utmMedium:   input.utmMedium   ?? undefined,
            utmCampaign: input.utmCampaign ?? undefined,
          });

          trackEventNoWait({
            eventName: "lead_allocated",
            leadId,
            sessionId: input.sessionId,
            properties: {
              allocatedQueue: allocation.allocatedQueue,
              allocatedOwner: allocation.allocatedOwner,
              intentCategory: allocation.intentCategory,
              leadTemperature: allocation.leadTemperature,
              capturePath: "intake_submit_computed",
            },
            utmSource:   input.utmSource   ?? undefined,
            utmMedium:   input.utmMedium   ?? undefined,
            utmCampaign: input.utmCampaign ?? undefined,
          });
        } catch (funnelErr) {
          console.warn(
            "[intake/submit] funnel event emission failed:",
            funnelErr instanceof Error ? funnelErr.message : funnelErr
          );
        }

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

        // Write source attribution row so dashboard / UTM reports can resolve
        // this lead. Mirrors the canonical /api/leads path. Must not block.
        if (
          input.utmSource || input.utmMedium || input.utmCampaign ||
          input.utmContent || input.utmTerm ||
          input.referrerUrl || input.landingPath
        ) {
          try {
            const referrerType = classifyReferrer(
              input.referrerUrl ?? "",
              input.utmMedium ?? null,
            );

            await client.from("source_attribution").upsert({
              lead_id:       leadId,
              session_id:    input.sessionId,
              utm_source:    input.utmSource,
              utm_medium:    input.utmMedium,
              utm_campaign:  input.utmCampaign,
              utm_content:   input.utmContent,
              utm_term:      input.utmTerm,
              referrer_url:  input.referrerUrl,
              referrer_type: referrerType,
              landing_page:  input.landingPath,
              is_paid:       referrerType === "paid",
            }, { onConflict: "lead_id", ignoreDuplicates: true });
          } catch (attrErr) {
            console.warn(
              "[intake/submit] source_attribution write failed:",
              attrErr instanceof Error ? attrErr.message : attrErr
            );
          }
        }

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
            source:    input.utmSource
              ? `ask-magic-mike:${input.utmSource}`
              : "ask-magic-mike",
            tags: [
              `intent:${input.primaryIntent}`,
              `temperature:${score.temperature}`,
              ...(input.utmSource   ? [`utm_source:${input.utmSource}`]     : []),
              ...(input.utmMedium   ? [`utm_medium:${input.utmMedium}`]     : []),
              ...(input.utmCampaign ? [`utm_campaign:${input.utmCampaign}`] : []),
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
      } else {
        // upsertLead returned null — DB error was logged inside upsertLead
        persistenceFailed = true;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[intake/submit] persistence error:", msg);
      persistenceFailed = true;
    }

    // Mark session complete only when the lead was actually saved
    if (!persistenceFailed) {
      await completeSession(input.sessionId);
    }
  }

  // Return 503 if production persistence failed — do not let the caller
  // believe the lead was captured when it was not.
  if (!shouldUseDevStorage() && persistenceFailed) {
    return NextResponse.json(
      {
        error:   "submission_failed",
        message: "Your request could not be saved. Please try again in a moment.",
      },
      { status: 503, headers: NO_STORE }
    );
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
      sourceUrl:      input.sourceUrl,
      landingPath:    input.landingPath,
      referrerUrl:    input.referrerUrl,
    },
    utmSource:   input.utmSource ?? undefined,
    utmMedium:   input.utmMedium ?? undefined,
    utmCampaign: input.utmCampaign ?? undefined,
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
    utmSource:   input.utmSource ?? undefined,
    utmMedium:   input.utmMedium ?? undefined,
    utmCampaign: input.utmCampaign ?? undefined,
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

  return NextResponse.json(
    {
      leadId,
      score: {
        sellerCertaintyScore: score.sellerCertaintyScore,
        buyerCertaintyScore:  score.buyerCertaintyScore,
        compositeScore:       score.compositeScore,
        temperature:          score.temperature,
      },
      routing: routingDecision,
    },
    { headers: NO_STORE }
  );
}
