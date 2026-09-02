/**
 * The exact language and version shown on public lead forms. Keep this value
 * versioned so the stored consent evidence can be reconstructed later.
 * Brokerage/BIC counsel should approve copy before production activation.
 */
export const LEAD_CONSENT_LANGUAGE_VERSION = "amm_contact_v2";
export const LEAD_CONSENT_LANGUAGE_TEXT =
  "I agree that Our Town Properties may contact me about this request using the contact information I provide. Consent is not a condition of purchase or service. Message and data rates may apply where applicable. I can opt out at any time.";

export const WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_VERSION =
  "wordpress_gravity_forms_unverified_v1";
export const WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_TEXT =
  "Canonical communication consent language was not captured by this Gravity Forms submission; communication permissions are denied.";

type ConsentEvidenceInput = {
  consent?: boolean;
  consent_email?: boolean;
  consent_call?: boolean;
  consent_sms?: boolean;
  consent_timestamp?: string | null;
  consent_language_version?: string;
  consent_language_text?: string;
  consent_source?: string;
};

export type AuthoritativeConsentEvidence = {
  consent: boolean;
  consent_email: boolean;
  consent_call: boolean;
  consent_sms: boolean;
  consent_timestamp: string | null;
  consent_language_version: string;
  consent_language_text: string;
};

function cleanEvidenceValue(value: unknown, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 && text.length <= maxLength ? text : "";
}

function cleanConsentTimestamp(value: unknown) {
  const text = cleanEvidenceValue(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) {
    return undefined;
  }
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

/**
 * Public Ask Magic Mike forms always use the server-owned canonical copy.
 * A verified WordPress bridge may preserve source-specific consent evidence,
 * but only with a bounded version, exact text, and an audited Gravity Forms
 * source marker. Missing or malformed bridge evidence fails closed by denying
 * every communication channel instead of claiming the public app copy.
 */
export function resolveAuthoritativeConsentEvidence(
  input: ConsentEvidenceInput,
  options: { trustedWordPressBridge: boolean; receivedAt?: string },
): AuthoritativeConsentEvidence {
  if (!options.trustedWordPressBridge) {
    const consentAccepted = input.consent === true;
    return {
      consent: consentAccepted,
      // Public channel permissions must be consistent with the displayed
      // umbrella consent control. A caller cannot grant a channel by sending
      // a standalone boolean that the public UI would never produce.
      consent_email: consentAccepted && input.consent_email === true,
      consent_call: consentAccepted && input.consent_call === true,
      // No current public lead form displays a separate SMS consent control.
      // A caller-supplied boolean cannot widen the server-owned public copy.
      consent_sms: false,
      consent_timestamp: cleanConsentTimestamp(options.receivedAt) ?? new Date().toISOString(),
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
      consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
    };
  }

  const version = cleanEvidenceValue(input.consent_language_version, 120);
  const text = cleanEvidenceValue(input.consent_language_text, 4_000);
  const source = cleanEvidenceValue(input.consent_source, 120);
  const timestamp = cleanConsentTimestamp(input.consent_timestamp);
  const form7EmailOnly = source === "gravity_forms_7";
  const unexpectedChannelGrant = input.consent_call === true ||
    input.consent_sms === true ||
    (input.consent_email === true && !form7EmailOnly);
  const channelGranted = input.consent_email === true ||
    input.consent_call === true ||
    input.consent_sms === true;
  const valid =
    /^[a-z0-9][a-z0-9_.:-]*$/i.test(version) &&
    /^gravity_forms_[1-7]$/.test(source) &&
    text.length > 0 &&
    !unexpectedChannelGrant &&
    (!channelGranted || timestamp !== undefined);

  if (!valid) {
    return {
      consent: false,
      consent_email: false,
      consent_call: false,
      consent_sms: false,
      consent_timestamp: null,
      consent_language_version: WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_VERSION,
      consent_language_text: WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_TEXT,
    };
  }

  const email = input.consent_email === true;
  const call = input.consent_call === true;
  const sms = input.consent_sms === true;
  return {
    // The legacy umbrella flag grants both email and call in public forms.
    // Keep it false at the signed bridge boundary so one channel can never
    // inflate permission for another channel.
    consent: false,
    consent_email: email,
    consent_call: call,
    consent_sms: sms,
    consent_timestamp: timestamp ?? null,
    consent_language_version: version,
    consent_language_text: text,
  };
}

export function consentGrantedForEmail(input: {
  consent?: boolean;
  consent_email?: boolean;
  email?: string;
}) {
  return Boolean(input.email && input.consent_email === true);
}

export function consentGrantedForCall(input: {
  consent?: boolean;
  consent_call?: boolean;
  phone?: string;
}) {
  return Boolean(input.phone && input.consent_call === true);
}

export function consentGrantedForSms(input: {
  consent?: boolean;
  consent_sms?: boolean;
  phone?: string;
}) {
  return Boolean(input.phone && input.consent_sms);
}
