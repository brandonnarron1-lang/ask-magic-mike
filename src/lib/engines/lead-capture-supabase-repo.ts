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
      const { data, error } = await client
        .from("leads")
        .insert({
          id: rec.id,
          session_id: rec.sessionId,
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
          // Note: status defaults to 'new' on the column.
          status: "new",
        })
        .select("id")
        .single();
      if (error) throw new Error(`[lead-capture-repo] insert: ${error.message}`);

      // Source attribution row so dashboards / utm reports work.
      if (
        rec.utm.source ||
        rec.utm.medium ||
        rec.utm.campaign ||
        rec.referrer ||
        rec.landingPage
      ) {
        await client.from("source_attribution").insert({
          lead_id: data.id as string,
          utm_source:   rec.utm.source,
          utm_medium:   rec.utm.medium,
          utm_campaign: rec.utm.campaign,
          utm_content:  rec.utm.content,
          utm_term:     rec.utm.term,
          referrer_url: rec.referrer,
          landing_page: rec.landingPage,
          is_paid:
            rec.utm.medium === "cpc" ||
            rec.utm.medium === "paid_social" ||
            rec.utm.medium === "paid",
        });
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
  };
}
