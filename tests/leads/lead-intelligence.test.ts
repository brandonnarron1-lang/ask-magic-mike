import { describe, expect, it } from "vitest";
import { buildLeadIntelligence, type LeadIntelligenceInput } from "@/lib/leads/lead-intelligence";

function base(overrides: Partial<LeadIntelligenceInput> = {}): LeadIntelligenceInput {
  return {
    leadType:    "seller",
    temperature: "warm",
    grade:       "B",
    score:       65,
    hasEmail:    true,
    hasPhone:    true,
    hasAddress:  true,
    consentSms:  true,
    consentEmail: true,
    ...overrides,
  };
}

describe("buildLeadIntelligence", () => {
  it("returns all required keys", () => {
    const r = buildLeadIntelligence(base());
    expect(typeof r.buyingIntent).toBe("number");
    expect(typeof r.sellingIntent).toBe("number");
    expect(typeof r.urgencyScore).toBe("number");
    expect(typeof r.likelyToConvert).toBe("number");
    expect(typeof r.closingProbability).toBe("number");
    expect(typeof r.commissionRange.label).toBe("string");
    expect(typeof r.nextAction).toBe("string");
    expect(typeof r.suggestedScript).toBe("string");
    expect(typeof r.objectionHandling).toBe("string");
    expect(typeof r.appointmentCTA).toBe("string");
    expect(typeof r.recommendedFollowUpHours).toBe("number");
  });

  it("scores seller intent high for seller_cash_offer type", () => {
    const r = buildLeadIntelligence(base({ leadType: "seller_cash_offer" }));
    expect(r.sellingIntent).toBeGreaterThanOrEqual(75);
    expect(r.sellingIntentLabel).toBe("high");
  });

  it("scores buying intent high for buyer type", () => {
    const r = buildLeadIntelligence(base({ leadType: "buyer" }));
    expect(r.buyingIntent).toBeGreaterThanOrEqual(55);
    expect(r.buyingIntentLabel).not.toBe("none");
  });

  it("scores urgency high for urgent temperature", () => {
    const r = buildLeadIntelligence(base({ temperature: "urgent" }));
    expect(r.urgencyScore).toBeGreaterThanOrEqual(85);
  });

  it("scores urgency low for low temperature", () => {
    const r = buildLeadIntelligence(base({ temperature: "low" }));
    expect(r.urgencyScore).toBeLessThan(30);
  });

  it("follow-up interval is 15 min or less for A+ urgent leads", () => {
    const r = buildLeadIntelligence(base({ grade: "A+", temperature: "urgent" }));
    expect(r.recommendedFollowUpHours).toBeLessThanOrEqual(0.25);
  });

  it("follow-up interval is 7 days for nurture", () => {
    const r = buildLeadIntelligence(base({ temperature: "nurture" }));
    expect(r.recommendedFollowUpHours).toBe(24 * 7);
  });

  it("commission range uses Wilson NC avg when no home value provided", () => {
    const r = buildLeadIntelligence(base({ leadType: "seller" }));
    expect(r.commissionRange.low).toBeGreaterThan(0);
    expect(r.commissionRange.high).toBeGreaterThan(0);
    expect(r.commissionRange.label).toMatch(/\$\d+K/);
  });

  it("uses provided home value for commission range", () => {
    const r = buildLeadIntelligence(base({ estimatedHomeValue: 300_000 }));
    expect(r.commissionRange.low).toBe(300_000 * 0.03);
    expect(r.commissionRange.high).toBe(300_000 * 0.03);
  });

  it("comms pref is call when phone + call consent", () => {
    const r = buildLeadIntelligence(base({ hasPhone: true, consentCall: true }));
    expect(r.commPref).toBe("call");
  });

  it("comms pref is text when phone + sms consent but no call consent", () => {
    const r = buildLeadIntelligence(base({ hasPhone: true, consentSms: true, consentCall: false, consentEmail: false }));
    expect(r.commPref).toBe("text");
  });

  it("comms pref is unknown when no contact info", () => {
    const r = buildLeadIntelligence(base({ hasPhone: false, hasEmail: false, consentSms: false, consentEmail: false, consentCall: false }));
    expect(r.commPref).toBe("unknown");
  });

  it("closing probability is higher for A+ than D grade", () => {
    const aPlus = buildLeadIntelligence(base({ grade: "A+", temperature: "urgent", score: 95 }));
    const dGrade = buildLeadIntelligence(base({ grade: "D", temperature: "low", score: 10 }));
    expect(aPlus.closingProbability).toBeGreaterThan(dGrade.closingProbability);
  });

  it("sells script includes Wilson NC for unknown type", () => {
    const r = buildLeadIntelligence(base({ leadType: "general_question" }));
    expect(r.suggestedScript).toContain("Wilson");
  });

  it("returns safe values for all-null input", () => {
    const r = buildLeadIntelligence({});
    expect(r.buyingIntent).toBeGreaterThanOrEqual(0);
    expect(r.sellingIntent).toBeGreaterThanOrEqual(0);
    expect(r.urgencyScore).toBeGreaterThanOrEqual(0);
    expect(r.closingProbability).toBeGreaterThanOrEqual(0);
  });
});
