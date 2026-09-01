import { describe, expect, it } from "vitest";
import {
  LEAD_CONSENT_LANGUAGE_TEXT,
  LEAD_CONSENT_LANGUAGE_VERSION,
  resolveAuthoritativeConsentEvidence,
  WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_TEXT,
  WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_VERSION,
} from "../../app/lib/leadConsent";

describe("authoritative lead consent evidence", () => {
  it("ignores public payload copy and uses the server-owned canonical language", () => {
    expect(resolveAuthoritativeConsentEvidence({
      consent: true,
      consent_email: true,
      consent_language_version: "spoofed_v99",
      consent_language_text: "Spoofed public copy",
      consent_source: "unknown",
    }, { trustedWordPressBridge: false })).toEqual({
      consent: true,
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
      consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
    });
  });

  it("preserves exact source-specific evidence only after bridge verification", () => {
    expect(resolveAuthoritativeConsentEvidence({
      consent: false,
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_language_version: "otp_form7_property_alert_email_v1",
      consent_language_text: "EMAIL: Approved property-alert language.",
      consent_source: "gravity_forms_7",
    }, { trustedWordPressBridge: true })).toEqual({
      consent: false,
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_language_version: "otp_form7_property_alert_email_v1",
      consent_language_text: "EMAIL: Approved property-alert language.",
    });
  });

  it.each([
    { consent_source: "not_gravity_forms" },
    { consent_language_version: "" },
    { consent_language_text: "" },
    { consent_language_version: "bad version with spaces" },
  ])("fails a malformed signed bridge contract closed: %o", (override) => {
    expect(resolveAuthoritativeConsentEvidence({
      consent: true,
      consent_email: true,
      consent_call: true,
      consent_sms: true,
      consent_language_version: "otp_form7_v1",
      consent_language_text: "Exact displayed language.",
      consent_source: "gravity_forms_7",
      ...override,
    }, { trustedWordPressBridge: true })).toEqual({
      consent: false,
      consent_email: false,
      consent_call: false,
      consent_sms: false,
      consent_language_version: WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_VERSION,
      consent_language_text: WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_TEXT,
    });
  });

  it("does not let a bridge umbrella flag silently grant every channel", () => {
    expect(resolveAuthoritativeConsentEvidence({
      consent: true,
      consent_email: false,
      consent_call: false,
      consent_sms: false,
      consent_language_version: "wordpress_gravity_forms_unverified_v1",
      consent_language_text: WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_TEXT,
      consent_source: "gravity_forms_3",
    }, { trustedWordPressBridge: true }).consent).toBe(false);
  });
});
