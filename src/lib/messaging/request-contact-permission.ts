import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../../app/lib/leadConsent";
import type { LeadPermissionFacts, StoredPermission } from "./permission-service";

export type RequestConsentRecord = {
  lead_id: unknown;
  consent_type: unknown;
  granted: unknown;
  language_version: unknown;
  language_text: unknown;
  collected_at: unknown;
};

function timestamp(value: unknown) {
  if (!(typeof value === "string" || value instanceof Date)) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function assessRequestContactEvidence(lead: LeadPermissionFacts, records: RequestConsentRecord[], consentTimestamp: unknown, channel: "email" | "phone", now = Date.now()) {
  const blocked = (reason: string) => ({ eligible: false, reason });
  if (lead.isTest || lead.suppressed) return blocked("This record is for internal review only; consumer contact remains suppressed.");
  if (LEAD_CONSENT_LANGUAGE_VERSION !== "amm_contact_v2" || lead.consentVersion !== "amm_contact_v2" || lead.consentText !== LEAD_CONSENT_LANGUAGE_TEXT) {
    return blocked("The saved consent copy/version does not establish permission to reply about this request.");
  }
  const at = timestamp(consentTimestamp);
  if (at === null || at > now) return blocked("A valid, recorded consent time is missing or inconsistent.");
  if (!(channel === "email" ? lead.consentEmail : lead.consentCall)) return blocked(`Permission for ${channel === "email" ? "email" : "a phone call"} was not selected for this request.`);
  const evidence = records.filter(r => r.lead_id === lead.leadId && r.consent_type === (channel === "email" ? "email" : "call"));
  if (evidence.length !== 1) return blocked("One unambiguous consent record for this inquiry and contact method is required; it is missing or conflicting.");
  const row = evidence[0];
  if (row.granted !== true) return blocked("The saved consent record does not grant this contact method.");
  if (row.language_version !== "amm_contact_v2" || row.language_text !== LEAD_CONSENT_LANGUAGE_TEXT || timestamp(row.collected_at) !== at) {
    return blocked("The inquiry and its consent record disagree on the wording, version or time. Keep contact restricted until the factual evidence is resolved.");
  }
  return { eligible: true, reason: "The saved, versioned consent permits a human response about this request only—not marketing, SMS or automatic follow-up." };
}

/** Read-only interpretation of the existing, versioned request-contact copy.
 * Never an amendment/backfill, a generic consent-flag fallback, or a grant for
 * acknowledgments, marketing, SMS, subscriptions, sequences or automation. */
export function projectManualRequestPermissions(
  lead: LeadPermissionFacts,
  stored: StoredPermission[],
  records: RequestConsentRecord[],
  consentTimestamp: unknown,
  now = Date.now(),
): StoredPermission[] {
  const result = [...stored];
  for (const channel of ["email", "phone"] as const) {
    // An existing purpose-specific decision (including ambiguous/held/denied)
    // always wins; do not overwrite or reinterpret it from another record.
    if (stored.some(p => p.channel === channel && p.purpose === "manual_one_to_one") ||
      !assessRequestContactEvidence(lead, records, consentTimestamp, channel, now).eligible) continue;
    result.push({ channel, purpose: "manual_one_to_one", state: "allowed",
      consentVersion: LEAD_CONSENT_LANGUAGE_VERSION, source: "public.consents:request_contact",
      evidenceAt: new Date(timestamp(consentTimestamp)!).toISOString(), evidenceKind: "canonical_request_consent" });
  }
  return result;
}
