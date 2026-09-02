import { describe, expect, it } from "vitest";
import {
  consentGrantedForCall,
  consentGrantedForEmail,
  LEAD_CONSENT_LANGUAGE_TEXT,
  LEAD_CONSENT_LANGUAGE_VERSION,
  resolveAuthoritativeConsentEvidence,
  WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_TEXT,
  WORDPRESS_UNVERIFIED_CONSENT_LANGUAGE_VERSION,
} from "../../app/lib/leadConsent";

describe("authoritative lead consent evidence", () => {
  const receivedAt = "2026-09-01T20:00:00.000Z";

  it("ignores public payload copy and uses the server-owned canonical language", () => {
    expect(resolveAuthoritativeConsentEvidence({
      consent: true,
      consent_email: true,
      consent_sms: true,
      consent_language_version: "spoofed_v99",
      consent_language_text: "Spoofed public copy",
      consent_source: "unknown",
    }, { trustedWordPressBridge: false, receivedAt })).toEqual({
      consent: true,
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_timestamp: receivedAt,
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
      consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
    });
  });

  it("denies standalone public channel grants without umbrella consent", () => {
    expect(resolveAuthoritativeConsentEvidence({
      consent: false,
      consent_email: true,
      consent_call: true,
    }, { trustedWordPressBridge: false, receivedAt })).toMatchObject({
      consent: false,
      consent_email: false,
      consent_call: false,
      consent_sms: false,
    });
  });

  it("requires the exact authoritative channel grant at send time", () => {
    expect(consentGrantedForEmail({
      email: "lead@example.test",
      consent: true,
      consent_email: false,
    })).toBe(false);
    expect(consentGrantedForCall({
      phone: "2525550119",
      consent: true,
      consent_call: false,
    })).toBe(false);
    expect(consentGrantedForEmail({
      email: "lead@example.test",
      consent_email: true,
    })).toBe(true);
    expect(consentGrantedForCall({
      phone: "2525550119",
      consent_call: true,
    })).toBe(true);
  });

  it("preserves exact source-specific evidence only after bridge verification", () => {
    expect(resolveAuthoritativeConsentEvidence({
      consent: false,
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_timestamp: "2026-09-01T19:58:24Z",
      consent_language_version: "otp_form7_property_alert_email_v1",
      consent_language_text: "EMAIL: Approved property-alert language.",
      consent_source: "gravity_forms_7",
    }, { trustedWordPressBridge: true })).toEqual({
      consent: false,
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_timestamp: "2026-09-01T19:58:24.000Z",
      consent_language_version: "otp_form7_property_alert_email_v1",
      consent_language_text: "EMAIL: Approved property-alert language.",
    });
  });

  it.each([
    { consent_source: "not_gravity_forms" },
    { consent_language_version: "" },
    { consent_language_text: "" },
    { consent_language_version: "bad version with spaces" },
    { consent_timestamp: "not-a-timestamp" },
    { consent_call: true },
    { consent_sms: true },
    { consent_source: "gravity_forms_3" },
  ])("fails a malformed signed bridge contract closed: %o", (override) => {
    expect(resolveAuthoritativeConsentEvidence({
      consent: true,
      consent_email: true,
      consent_call: false,
      consent_sms: false,
      consent_timestamp: "2026-09-01T19:58:24Z",
      consent_language_version: "otp_form7_v1",
      consent_language_text: "Exact displayed language.",
      consent_source: "gravity_forms_7",
      ...override,
    }, { trustedWordPressBridge: true })).toEqual({
      consent: false,
      consent_email: false,
      consent_call: false,
      consent_sms: false,
      consent_timestamp: null,
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
