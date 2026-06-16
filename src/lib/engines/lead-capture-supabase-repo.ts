/**
 * Supabase-backed repository for LeadCaptureEngine.
 *
 * Stays narrow on purpose — only the three methods the engine needs.
 * Schema additions (migration 00012) make the persisted columns line up
 * with what `PersistableLead` carries.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LeadCaptureRepository,
  PersistableLead,
} from "./lead-capture";
import type { KnownLeadIdentity } from "@/lib/leads/duplicate-detection";
import type { LeadAllocationResult } from "@/lib/leads/allocation";

/**
 * The new canonical columns (normalized_email/phone/property_address,
 * lead_type, spam_score, etc.) land via migration 00012 but the generated
 * `database.types.ts` hasn't been refreshed yet. We cast through the
 * untyped client surface for these queries until the types are regenerated
 * (`supabase gen types typescript --linked > src/types/database.types.ts`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any;

export function createSupabaseLeadCaptureRepo(): LeadCaptureRepository {
  return {
    async findKnownByIdentity({ normalizedEmail, normalizedPhone }) {
      if (!normalizedEmail && !normalizedPhone) return [];
      const client = createAdminClient() as UntypedClient;
      let query = client
        .from("leads")
        .select(
          "id, normalized_email, normalized_phone, normalized_property_address, created_at"
        )
        .limit(50);

      const orFilters: string[] = [];
      if (normalizedEmail)
        orFilters.push(`normalized_email.eq.${normalizedEmail}`);
      if (normalizedPhone)
        orFilters.push(`normalized_phone.eq.${normalizedPhone}`);

      if (orFilters.length) query = query.or(orFilters.join(","));

      const { data, error } = await query;
      if (error && isMissingCanonicalLeadColumn(error)) {
        return findKnownByLegacyIdentity(client, normalizedEmail, normalizedPhone);
      }
      if (error) throw new Error(`[lead-capture-repo] find: ${error.message}`);
      return (data ?? []).map(
        (row: Record<string, unknown>): KnownLeadIdentity => ({
          leadId: row.id as string,
          normalizedEmail: (row.normalized_email as string | null) ?? null,
          normalizedPhone: (row.normalized_phone as string | null) ?? null,
          normalizedAddressFingerprint:
            (row.normalized_property_address as string | null) ?? null,
          createdAt: row.created_at as string,
        })
      );
    },

    async insertLead(rec: PersistableLead) {
      const client = createAdminClient() as UntypedClient;
      const sessionId = rec.sessionId ?? (await createCanonicalSession(client, rec));
      const { data, error } = await client
        .from("leads")
        .insert({
          id: rec.id,
          session_id: sessionId,
          contact_id: rec.contactId,
          lead_type: rec.leadType,
          primary_intent: rec.legacyIntent,
          first_name: rec.firstName,
          last_name: rec.lastName,
          email: rec.email,
          phone: rec.phone,
          phone_normalized: rec.normalizedPhone,
          normalized_email: rec.normalizedEmail,
          normalized_phone: rec.normalizedPhone,
          address_raw: rec.propertyAddress,
          normalized_property_address: rec.normalizedPropertyAddress,
          city: rec.city,
          county: rec.county,
          state: rec.state,
          zip: rec.zip,
          source: rec.source,
          source_detail: rec.sourceDetail,
          page_url: rec.pageUrl,
          widget_session_id: rec.widgetSessionId,
          listing_id: rec.listingId,
          spam_score: rec.spamScore,
          spam_reasons: rec.spamReasons,
          lead_grade: rec.leadGrade,
          consent_sms: rec.consent.sms,
          consent_email: rec.consent.email,
          consent_call: rec.consent.call,
          consent_timestamp: rec.consent.timestamp,
          consent_language_version: "canonical_v1",
          status: legacyLeadStatusFor(rec.allocation),
        })
        .select("id")
        .single();
      if (error && isMissingCanonicalLeadColumn(error)) {
        return insertLegacyLead(client, rec, sessionId);
      }
      if (error) throw new Error(`[lead-capture-repo] insert: ${error.message}`);

      // Source attribution row so dashboards / utm reports work.
      if (
        rec.utm.source ||
        rec.utm.medium ||
        rec.utm.campaign ||
        rec.referrer ||
        rec.landingPage
      ) {
        await client.from("source_attribution").upsert({
          lead_id:       data.id as string,
          session_id:    sessionId,
          utm_source:    rec.utm.source,
          utm_medium:    rec.utm.medium,
          utm_campaign:  rec.utm.campaign,
          utm_content:   rec.utm.content,
          utm_term:      rec.utm.term,
          referrer_url:  rec.referrer,
          referrer_type: referrerTypeFor(rec),
          landing_page:  rec.landingPage,
          is_paid:
            rec.utm.medium === "cpc" ||
            rec.utm.medium === "paid_social" ||
            rec.utm.medium === "paid",
        }, { onConflict: "lead_id", ignoreDuplicates: true });
      }

      return data.id as string;
    },

    async recordDuplicateAttempt({
      existingLeadId,
      spamScore,
      spamReasons,
    }) {
      const client = createAdminClient() as UntypedClient;
      await client.from("compliance_flags").insert({
        lead_id: existingLeadId,
        flag_type: "duplicate_lead",
        severity: "info",
        notes: JSON.stringify({ spamScore, spamReasons }),
      });
    },

    async recordAllocation({ leadId, allocation, source, utm }) {
      const client = createAdminClient() as UntypedClient;
      await persistAllocation(client, leadId, allocation, source, utm);
    },
  };
}

async function findKnownByLegacyIdentity(
  client: UntypedClient,
  normalizedEmail: string | null,
  normalizedPhone: string | null
): Promise<KnownLeadIdentity[]> {
  const rows = new Map<string, Record<string, unknown>>();
  const select = "id, email, phone, phone_normalized, address_raw, created_at";
  const queries = [];

  if (normalizedEmail) {
    queries.push(client.from("leads").select(select).eq("email", normalizedEmail).limit(25));
  }
  if (normalizedPhone) {
    queries.push(client.from("leads").select(select).eq("phone", normalizedPhone).limit(25));
    const digits = stripPhoneDigits(normalizedPhone);
    if (digits) {
      queries.push(client.from("leads").select(select).eq("phone_normalized", digits).limit(25));
    }
  }

  const results = await Promise.all(queries);
  for (const result of results) {
    if (result.error) {
      throw new Error(`[lead-capture-repo] legacy find: ${result.error.message}`);
    }
    for (const row of result.data ?? []) rows.set(row.id as string, row);
  }

  return [...rows.values()].map(
    (row): KnownLeadIdentity => ({
      leadId: row.id as string,
      normalizedEmail: (row.email as string | null)?.toLowerCase() ?? null,
      normalizedPhone: (row.phone as string | null) ?? null,
      normalizedAddressFingerprint: (row.address_raw as string | null) ?? null,
      createdAt: row.created_at as string,
    })
  );
}

async function insertLegacyLead(
  client: UntypedClient,
  rec: PersistableLead,
  sessionId: string
): Promise<string> {
  const { data, error } = await client
    .from("leads")
    .insert({
      id: rec.id,
      session_id: sessionId,
      primary_intent: rec.legacyIntent,
      first_name: rec.firstName,
      last_name: rec.lastName,
      email: rec.email,
      phone: rec.phone,
      phone_normalized: stripPhoneDigits(rec.normalizedPhone ?? rec.phone),
      address_raw: rec.propertyAddress,
      city: rec.city,
      state: rec.state,
      zip: rec.zip,
      question_raw: rec.metadata?.source_intent ?? null,
      consent_sms: rec.consent.sms,
      consent_email: rec.consent.email,
      consent_call: rec.consent.call,
      consent_timestamp: rec.consent.timestamp,
      consent_language_version: "canonical_v1",
      status: legacyLeadStatusFor(rec.allocation),
    })
    .select("id")
    .single();

  if (error) throw new Error(`[lead-capture-repo] legacy insert: ${error.message}`);
  await persistLegacyAttribution(client, data.id as string, rec);
  return data.id as string;
}

async function createCanonicalSession(
  client: UntypedClient,
  rec: PersistableLead
): Promise<string> {
  const { data, error } = await client
    .from("sessions")
    .insert({
      utm_source: rec.utm.source,
      utm_medium: rec.utm.medium,
      utm_campaign: rec.utm.campaign,
      utm_content: rec.utm.content,
      utm_term: rec.utm.term,
      referrer_url: rec.referrer,
      referrer_type: referrerTypeFor(rec),
      landing_page: rec.landingPage ?? rec.pageUrl,
      initial_question: rec.metadata?.intent ?? null,
      initial_address: rec.propertyAddress,
      status: "completed",
      step_reached: 5,
    })
    .select("id")
    .single();

  if (error) throw new Error(`[lead-capture-repo] session insert: ${error.message}`);
  return data.id as string;
}

function referrerTypeFor(rec: PersistableLead) {
  const medium = (rec.utm.medium ?? "").toLowerCase();
  const source = (rec.utm.source ?? "").toLowerCase();
  if (["cpc", "paid", "paid_social", "ppc"].includes(medium)) return "paid";
  if (["facebook", "instagram", "meta", "tiktok", "youtube"].includes(source)) return "social";
  if (medium === "email") return "email";
  if (rec.referrer) return "referral";
  return "direct";
}

function isMissingCanonicalLeadColumn(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  const canonicalOnlyLeadColumns = [
    "contact_id",
    "lead_type",
    "normalized_email",
    "normalized_phone",
    "normalized_property_address",
    "county",
    "source",
    "source_detail",
    "page_url",
    "widget_session_id",
    "listing_id",
    "spam_score",
    "spam_reasons",
    "lead_grade",
  ];
  return (
    error.code === "42703" ||
    canonicalOnlyLeadColumns.some((column) => message.includes(column))
  );
}

function stripPhoneDigits(phone: string | null | undefined) {
  return phone?.replace(/\D/g, "") || null;
}

function legacyLeadStatusFor(allocation: LeadAllocationResult | null | undefined) {
  if (!allocation) return "new";
  if (allocation.status === "spam") return "dead";
  if (allocation.status === "nurture") return "nurture";
  return "assigned";
}

async function persistLegacyAttribution(
  client: UntypedClient,
  leadId: string,
  rec: PersistableLead
) {
  if (
    !rec.utm.source &&
    !rec.utm.medium &&
    !rec.utm.campaign &&
    !rec.referrer &&
    !rec.landingPage
  ) {
    return;
  }

  const { error } = await client.from("source_attribution").upsert({
    lead_id: leadId,
    utm_source: rec.utm.source,
    utm_medium: rec.utm.medium,
    utm_campaign: rec.utm.campaign,
    utm_content: rec.utm.content,
    utm_term: rec.utm.term,
    referrer_url: rec.referrer,
    referrer_type: referrerTypeFor(rec),
    landing_page: rec.landingPage,
    is_paid:
      rec.utm.medium === "cpc" ||
      rec.utm.medium === "paid_social" ||
      rec.utm.medium === "paid",
  }, { onConflict: "lead_id", ignoreDuplicates: true });

  if (error) {
    console.error("[lead-capture-repo] legacy attribution warning:", error.message);
  }
}

async function persistAllocation(
  client: UntypedClient,
  leadId: string,
  allocation: LeadAllocationResult,
  source: string,
  utm: PersistableLead["utm"]
) {
  const taskPriority =
    allocation.allocatedQueue === "compliance_review" ||
    allocation.leadTemperature === "HOT"
      ? "urgent"
      : allocation.leadTemperature === "WARM"
        ? "high"
        : "normal";

  const allocationPayload = {
    ...allocation,
    source,
    utm,
    noRealSend: true,
    crmEmailSmsActive: false,
  };

  const taskResult = await client.from("tasks").insert({
    lead_id: leadId,
    created_by: "system",
    title: allocation.nextAction,
    body: [
      `Queue: ${allocation.allocatedQueue}`,
      `Owner: ${allocation.allocatedOwner}`,
      `Intent: ${allocation.intentCategory}`,
      `Temperature: ${allocation.leadTemperature}`,
      `Audit reason: ${allocation.auditReason}`,
    ].join("\n"),
    priority: taskPriority,
    category: allocation.allocatedQueue,
  });

  if (taskResult.error) {
    if (isMissingRelation(taskResult.error, "tasks")) {
      console.warn(
        "[lead-capture-repo] tasks table unavailable; allocation persisted through status/score/audit compatibility path"
      );
    } else {
      console.error("[lead-capture-repo] allocation task warning:", taskResult.error.message);
    }
  }

  const writes = [
    client.from("lead_scores").upsert(
      {
        lead_id: leadId,
        seller_certainty_score:
          allocation.intentCategory === "seller_valuation" ||
          allocation.intentCategory === "seller_appointment"
            ? allocation.leadScore
            : 0,
        buyer_certainty_score:
          allocation.intentCategory === "buyer_search" ? allocation.leadScore : 0,
        composite_score: allocation.leadScore,
        temperature: temperatureForScoreRow(allocation.leadTemperature),
        factor_log: [
          { key: "queue", category: "allocation", reason: allocation.allocatedQueue },
          { key: "intent", category: "allocation", reason: allocation.intentCategory },
          { key: "audit", category: "allocation", reason: allocation.auditReason },
        ],
        scorer_version: "operating-allocation-v1",
      },
      { onConflict: "lead_id" }
    ),
    client.from("audit_logs").insert({
      actor: "system",
      action: "lead.allocated",
      resource_type: "lead",
      resource_id: leadId,
      before_state: null,
      after_state: allocationPayload,
      metadata: {
        queue: allocation.allocatedQueue,
        owner: allocation.allocatedOwner,
        no_live_send: true,
      },
    }),
  ];

  if (allocation.allocatedQueue === "invalid_spam_review") {
    writes.push(
      client.from("compliance_flags").insert({
        lead_id: leadId,
        flag_type: "invalid_email",
        severity: "warn",
        notes: JSON.stringify({
          auditReason: allocation.auditReason,
          queue: allocation.allocatedQueue,
        }),
      })
    );
  }

  const results = await Promise.allSettled(writes);
  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.error) {
      if (isMissingRelation(result.value.error, "lead_scores") || isMissingRelation(result.value.error, "audit_logs")) {
        console.warn("[lead-capture-repo] optional allocation persistence table unavailable:", result.value.error.message);
      } else {
        console.error("[lead-capture-repo] allocation persistence warning:", result.value.error.message);
      }
    }
    if (result.status === "rejected") {
      console.error("[lead-capture-repo] allocation persistence warning:", result.reason);
    }
  }
}

function temperatureForScoreRow(temperature: LeadAllocationResult["leadTemperature"]) {
  if (temperature === "HOT") return "hot";
  if (temperature === "WARM") return "warm";
  if (temperature === "NURTURE") return "nurture";
  return "low";
}

function isMissingRelation(error: { message?: string; code?: string }, relation: string) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    message.includes(`table 'public.${relation}'`) ||
    message.includes(`relation "${relation}" does not exist`) ||
    message.includes(`relation "public.${relation}" does not exist`)
  );
}
