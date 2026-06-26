/**
 * Tests for buildNextBestAction and isSyntheticLead.
 *
 * Pure functions — no DB, no writes, no outbound messaging.
 */
import { describe, expect, it } from "vitest";
import {
  buildNextBestAction,
  isSyntheticLead,
} from "../../src/lib/admin/next-best-action";
import type { NextBestActionInput } from "../../src/lib/admin/next-best-action";

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<NextBestActionInput> = {}): NextBestActionInput {
  return {
    leadType:    "general_question",
    status:      "new",
    temperature: "warm",
    score:       60,
    source:      "direct",
    utmMedium:   null,
    utmCampaign: null,
    firstName:   "Test",
    hasEmail:    true,
    hasPhone:    true,
    hasAddress:  true,
    email:       "real@ourtownproperties.com",
    phone:       "555-1234",
    addressRaw:  "123 Nash St NW, Wilson NC",
    consentSms:  true,
    consentEmail: true,
    isSynthetic: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isSyntheticLead
// ---------------------------------------------------------------------------

describe("isSyntheticLead", () => {
  it("flags @example.com as synthetic", () => {
    expect(isSyntheticLead("test@example.com")).toBe(true);
  });

  it("flags @test.com as synthetic", () => {
    expect(isSyntheticLead("qa@test.com")).toBe(true);
  });

  it("flags +qa suffix as synthetic", () => {
    expect(isSyntheticLead("user+qa@domain.com")).toBe(true);
  });

  it("flags +test suffix as synthetic", () => {
    expect(isSyntheticLead("user+test@domain.com")).toBe(true);
  });

  it("flags +synthetic suffix as synthetic", () => {
    expect(isSyntheticLead("user+synthetic@domain.com")).toBe(true);
  });

  it("returns false for a normal email", () => {
    expect(isSyntheticLead("mike@ourtownproperties.com")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSyntheticLead(null)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSyntheticLead("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Source path derivation
// ---------------------------------------------------------------------------

describe("sourcePath", () => {
  it("detects website_widget via utm_medium", () => {
    const r = buildNextBestAction(makeInput({ utmMedium: "website_widget" }));
    expect(r.sourcePath).toContain("website_widget");
  });

  it("detects wordpress_widget via utm_campaign", () => {
    const r = buildNextBestAction(makeInput({ utmCampaign: "wordpress_widget" }));
    expect(r.sourcePath).toContain("OTP WordPress embed");
  });

  it("detects homepage_cta via utm_medium", () => {
    const r = buildNextBestAction(makeInput({ utmMedium: "homepage_cta" }));
    expect(r.sourcePath).toBe("OTP homepage CTA");
  });

  it("detects agent_profile_cta via utm_medium", () => {
    const r = buildNextBestAction(makeInput({ utmMedium: "agent_profile_cta" }));
    expect(r.sourcePath).toBe("Mike Eatmon profile CTA");
  });

  it("falls back to Unknown when no source info", () => {
    const r = buildNextBestAction(makeInput({ source: "", utmMedium: null, utmCampaign: null }));
    expect(r.sourcePath).toMatch(/direct|Unknown/i);
  });
});

// ---------------------------------------------------------------------------
// Score label
// ---------------------------------------------------------------------------

describe("scoreLabel", () => {
  it("labels score >= 90 as very high", () => {
    const r = buildNextBestAction(makeInput({ score: 95 }));
    expect(r.scoreLabel).toContain("very high");
  });

  it("labels score >= 75 as high", () => {
    const r = buildNextBestAction(makeInput({ score: 80 }));
    expect(r.scoreLabel).toContain("high");
  });

  it("labels null score as Not scored", () => {
    const r = buildNextBestAction(makeInput({ score: null }));
    expect(r.scoreLabel).toBe("Not scored");
  });
});

// ---------------------------------------------------------------------------
// Temperature label
// ---------------------------------------------------------------------------

describe("temperatureLabel", () => {
  it("urgent maps to act same day", () => {
    const r = buildNextBestAction(makeInput({ temperature: "urgent" }));
    expect(r.temperatureLabel).toMatch(/same day/i);
  });

  it("hot maps to act within 24 h", () => {
    const r = buildNextBestAction(makeInput({ temperature: "hot" }));
    expect(r.temperatureLabel).toMatch(/24 h/i);
  });

  it("warm maps to follow up this week", () => {
    const r = buildNextBestAction(makeInput({ temperature: "warm" }));
    expect(r.temperatureLabel).toMatch(/this week/i);
  });

  it("nurture maps to follow up next month", () => {
    const r = buildNextBestAction(makeInput({ temperature: "nurture" }));
    expect(r.temperatureLabel).toMatch(/next month/i);
  });

  it("low maps to long-term list", () => {
    const r = buildNextBestAction(makeInput({ temperature: "low" }));
    expect(r.temperatureLabel).toMatch(/long-term/i);
  });

  it("null temperature maps to Not assessed", () => {
    const r = buildNextBestAction(makeInput({ temperature: null }));
    expect(r.temperatureLabel).toBe("Not assessed");
  });
});

// ---------------------------------------------------------------------------
// Intent summary
// ---------------------------------------------------------------------------

describe("intentSummary", () => {
  it("seller_cash_offer produces selling intent summary", () => {
    const r = buildNextBestAction(makeInput({ leadType: "seller_cash_offer" }));
    expect(r.intentSummary).toMatch(/selling/i);
  });

  it("buyer produces buying intent summary", () => {
    const r = buildNextBestAction(makeInput({ leadType: "buyer" }));
    expect(r.intentSummary).toMatch(/buying/i);
  });

  it("general_question produces general inquiry summary", () => {
    const r = buildNextBestAction(makeInput({ leadType: "general_question" }));
    expect(r.intentSummary).toMatch(/general inquiry/i);
  });
});

// ---------------------------------------------------------------------------
// Missing info detection
// ---------------------------------------------------------------------------

describe("missingInfo", () => {
  it("flags missing email", () => {
    const r = buildNextBestAction(makeInput({ hasEmail: false, email: null }));
    expect(r.missingInfo).toContain("Email address");
  });

  it("flags missing phone", () => {
    const r = buildNextBestAction(makeInput({ hasPhone: false, phone: null }));
    expect(r.missingInfo).toContain("Phone number");
  });

  it("flags missing address", () => {
    const r = buildNextBestAction(makeInput({ hasAddress: false, addressRaw: null }));
    expect(r.missingInfo).toContain("Property address");
  });

  it("flags missing consent when neither email nor SMS consent", () => {
    const r = buildNextBestAction(makeInput({ consentEmail: false, consentSms: false }));
    expect(r.missingInfo).toContain("Contact consent (email or SMS)");
  });

  it("returns empty array when all info present", () => {
    const r = buildNextBestAction(makeInput());
    expect(r.missingInfo).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Follow-up angle — synthetic leads MUST NOT be contacted
// ---------------------------------------------------------------------------

describe("followUpAngle — synthetic leads", () => {
  it("returns DO NOT CONTACT message for synthetic email", () => {
    const r = buildNextBestAction(makeInput({ email: "bot+synthetic@example.com" }));
    expect(r.followUpAngle).toMatch(/do not contact/i);
    expect(r.isSynthetic).toBe(true);
  });

  it("returns DO NOT CONTACT when isSynthetic flag is true", () => {
    const r = buildNextBestAction(makeInput({ isSynthetic: true }));
    expect(r.followUpAngle).toMatch(/do not contact/i);
    expect(r.isSynthetic).toBe(true);
  });

  it("sets doNotContact=true for synthetic leads", () => {
    const r = buildNextBestAction(makeInput({ email: "test@example.com" }));
    expect(r.doNotContact).toBe(true);
  });

  it("sets doNotContact=false for real leads with consent", () => {
    const r = buildNextBestAction(makeInput());
    expect(r.doNotContact).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Follow-up angle — consent gap blocks contact
// ---------------------------------------------------------------------------

describe("followUpAngle — consent gap", () => {
  it("surfaces consent gap when no consent granted", () => {
    const r = buildNextBestAction(makeInput({ consentEmail: false, consentSms: false }));
    expect(r.followUpAngle).toMatch(/consent/i);
  });

  it("does NOT block when email consent is granted", () => {
    const r = buildNextBestAction(makeInput({ consentEmail: true, consentSms: false }));
    expect(r.followUpAngle).not.toMatch(/consent gap/i);
  });
});

// ---------------------------------------------------------------------------
// Follow-up angle — temperature-driven suggestions
// ---------------------------------------------------------------------------

describe("followUpAngle — temperature", () => {
  it("hot seller gets call-or-text suggestion", () => {
    const r = buildNextBestAction(makeInput({ temperature: "hot", leadType: "seller_cash_offer" }));
    expect(r.followUpAngle).toMatch(/call|text/i);
  });

  it("warm buyer gets follow-up-this-week suggestion", () => {
    const r = buildNextBestAction(makeInput({ temperature: "warm", leadType: "buyer" }));
    expect(r.followUpAngle).toMatch(/week/i);
  });

  it("low lead with no missing info gets low-urgency message", () => {
    const r = buildNextBestAction(makeInput({ temperature: "low" }));
    expect(r.followUpAngle).toMatch(/low urgency|no immediate/i);
  });

  it("nurture lead gets 30-day re-engage suggestion", () => {
    const r = buildNextBestAction(makeInput({ temperature: "nurture" }));
    expect(r.followUpAngle).toMatch(/nurture|30.day|re-engage/i);
  });
});

// ---------------------------------------------------------------------------
// doNotContact flag
// ---------------------------------------------------------------------------

describe("doNotContact", () => {
  it("true when consent missing (not synthetic)", () => {
    const r = buildNextBestAction(makeInput({ consentEmail: false, consentSms: false }));
    expect(r.doNotContact).toBe(true);
  });

  it("true when isSynthetic=true regardless of consent", () => {
    const r = buildNextBestAction(makeInput({ isSynthetic: true, consentEmail: true, consentSms: true }));
    expect(r.doNotContact).toBe(true);
  });
});
