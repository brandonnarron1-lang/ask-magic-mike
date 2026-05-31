import { describe, it, expect } from "vitest";
import { computeScore } from "@/lib/scoring";
import type { ScoringInput } from "@/types/domain.types";

const BASE: ScoringInput = {
  primaryIntent:  "unknown",
  timelineMonths: null,
  questionRaw:    null,
  hasEmail:       false,
  hasPhone:       false,
  hasAddress:     false,
  hasName:        false,
  consentSms:     false,
  consentCall:    false,
  consentEmail:   false,
  ctaChipUsed:    null,
  utmSource:      null,
  utmMedium:      null,
};

describe("scoring integration scenarios", () => {
  it("seller ASAP + valuation CTA → urgent temperature", () => {
    const input: ScoringInput = {
      ...BASE,
      primaryIntent:  "sell",
      timelineMonths: 0,          // ASAP
      ctaChipUsed:    "home_worth",
      hasPhone:       true,
      hasName:        true,
      consentCall:    true,
    };
    const result = computeScore(input);
    // intent_sell=30 + timeline_asap=20 + cta_home_worth=20 + has_phone=10 + has_name=5 + consent_call=10 = 95
    expect(result.compositeScore).toBeGreaterThanOrEqual(80);
    expect(result.temperature).toBe("urgent");
  });

  it("seller ASAP + should_sell_now chip → urgent temperature", () => {
    const input: ScoringInput = {
      ...BASE,
      primaryIntent:  "sell",
      timelineMonths: 3,
      ctaChipUsed:    "should_sell_now",
      hasPhone:       true,
    };
    const result = computeScore(input);
    // intent_sell=30 + timeline_3mo=15 + cta_sell_now=25 + has_phone=10 = 80 → urgent at <=3mo
    expect(result.compositeScore).toBeGreaterThanOrEqual(80);
    expect(result.temperature).toBe("urgent");
  });

  it("just curious, no contact info → nurture or low temperature", () => {
    const input: ScoringInput = {
      ...BASE,
      primaryIntent:  "unknown",
      timelineMonths: null,
      questionRaw:    "just curious what homes are selling for",
      // no phone, email, name, consent, address
    };
    const result = computeScore(input);
    expect(result.compositeScore).toBeLessThan(40);
    expect(["nurture", "low"]).toContain(result.temperature);
  });

  it("curious buyer with no contact → low composite score", () => {
    const input: ScoringInput = {
      ...BASE,
      primaryIntent:  "buy",
      timelineMonths: 24,          // 2 years out
      // no contact info, no consent
    };
    const result = computeScore(input);
    expect(result.compositeScore).toBeLessThanOrEqual(40);
    expect(["nurture", "low", "warm"]).toContain(result.temperature);
  });

  it("high-engagement buyer with phone + email + consent → hot", () => {
    const input: ScoringInput = {
      ...BASE,
      primaryIntent:  "buy",
      timelineMonths: 3,
      ctaChipUsed:    "tour_home",
      hasPhone:       true,
      hasEmail:       true,
      hasName:        true,
      consentSms:     true,
      consentCall:    true,
    };
    const result = computeScore(input);
    // intent_buy=30 + timeline_3mo=15 + cta_tour_home=20 + phone=10 + email=5 + name=5 + consent_sms=5 + consent_call=10 = 100
    expect(result.compositeScore).toBeGreaterThanOrEqual(65);
    expect(["hot", "urgent"]).toContain(result.temperature);
  });

  it("factor log contains all applied factors", () => {
    const input: ScoringInput = {
      ...BASE,
      primaryIntent:  "sell",
      timelineMonths: 0,
      hasPhone:       true,
    };
    const result = computeScore(input);
    const keys = result.factorLog.map((f) => f.key);
    expect(keys).toContain("intent_sell");
    expect(keys).toContain("timeline_asap");
    expect(keys).toContain("has_phone");
  });

  it("scorer version is set", () => {
    const result = computeScore(BASE);
    expect(result.scorerVersion).toBeTruthy();
    expect(typeof result.scorerVersion).toBe("string");
  });
});
