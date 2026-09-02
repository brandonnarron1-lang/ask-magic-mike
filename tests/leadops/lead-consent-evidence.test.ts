import { describe, expect, it } from "vitest";
import {
  consentGrantedForCall,
  consentGrantedForEmail,
  consentGrantedForSms,
} from "../../app/lib/leadConsent";

describe("authoritative lead communication permissions", () => {
  it("requires the exact channel permission at use time", () => {
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
    expect(consentGrantedForSms({
      phone: "2525550119",
      consent: true,
      consent_sms: false,
    })).toBe(false);
  });

  it("grants only an explicitly recorded channel", () => {
    expect(consentGrantedForEmail({
      email: "lead@example.test",
      consent_email: true,
    })).toBe(true);
    expect(consentGrantedForCall({
      phone: "2525550119",
      consent_call: true,
    })).toBe(true);
    expect(consentGrantedForSms({
      phone: "2525550119",
      consent_sms: true,
    })).toBe(true);
  });
});
