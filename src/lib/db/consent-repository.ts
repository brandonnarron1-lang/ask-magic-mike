import { shouldUseDevStorage } from "./types";

export interface CreateConsentInput {
  leadId: string;
  contactId?: string | null;
  consentType: "sms" | "call" | "email" | "all";
  granted: boolean;
  languageVersion?: string;
  languageText?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createConsent(input: CreateConsentInput): Promise<void> {
  if (shouldUseDevStorage()) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  const { error } = await client.from("consents").insert({
    lead_id:          input.leadId,
    contact_id:       input.contactId ?? null,
    consent_type:     input.consentType,
    granted:          input.granted,
    language_version: input.languageVersion ?? "v1",
    language_text:    input.languageText ?? null,
    ip_address:       input.ipAddress ?? null,
    user_agent:       input.userAgent ?? null,
    collected_at:     new Date().toISOString(),
  });

  if (error) {
    console.error("[consent-repository] createConsent error:", error.message);
  }
}

export async function createConsentsFromLead(params: {
  leadId: string;
  contactId?: string | null;
  sms: boolean;
  call: boolean;
  email: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  if (shouldUseDevStorage()) return;
  if (!params.sms && !params.call && !params.email) return;

  const types: Array<"sms" | "call" | "email"> = [];
  if (params.sms)   types.push("sms");
  if (params.call)  types.push("call");
  if (params.email) types.push("email");

  await Promise.all(
    types.map((t) =>
      createConsent({
        leadId:      params.leadId,
        contactId:   params.contactId,
        consentType: t,
        granted:     true,
        ipAddress:   params.ipAddress,
        userAgent:   params.userAgent,
      })
    )
  );
}
