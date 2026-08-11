/**
 * The exact language and version shown on public lead forms. Keep this value
 * versioned so the stored consent evidence can be reconstructed later.
 * Brokerage/BIC counsel should approve copy before production activation.
 */
export const LEAD_CONSENT_LANGUAGE_VERSION = "amm_contact_v2";
export const LEAD_CONSENT_LANGUAGE_TEXT =
  "I agree that Our Town Properties may contact me about this request using the contact information I provide. Consent is not a condition of purchase or service. Message and data rates may apply where applicable. I can opt out at any time.";

export function consentGrantedForEmail(input: {
  consent?: boolean;
  consent_email?: boolean;
  email?: string;
}) {
  return Boolean(input.email && (input.consent_email || input.consent));
}

export function consentGrantedForCall(input: {
  consent?: boolean;
  consent_call?: boolean;
  phone?: string;
}) {
  return Boolean(input.phone && (input.consent_call || input.consent));
}

export function consentGrantedForSms(input: {
  consent?: boolean;
  consent_sms?: boolean;
  phone?: string;
}) {
  return Boolean(input.phone && input.consent_sms);
}
