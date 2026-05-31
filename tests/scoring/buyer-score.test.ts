import { describe, it, expect } from "vitest";
import { computeBuyerScore } from "@/lib/scoring/buyer-score";
import type { ScoringInput } from "@/types/domain.types";

const BASE_INPUT: ScoringInput = {
  primaryIntent: "unknown",
  timelineMonths: null,
  questionRaw: null,
  hasEmail: false,
  hasPhone: false,
  hasAddress: false,
  hasName: false,
  consentSms: false,
  consentCall: false,
  consentEmail: false,
  ctaChipUsed: null,
  utmSource: null,
  utmMedium: null,
};

describe("computeBuyerScore", () => {
  it("returns 0 for empty input", () => {
    const result = computeBuyerScore(BASE_INPUT);
    expect(result.score).toBe(0);
  });

  it("adds 30pts for buy intent", () => {
    const result = computeBuyerScore({ ...BASE_INPUT, primaryIntent: "buy" });
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.factors.some((f) => f.key === "intent_buy")).toBe(true);
  });

  it("adds 15pts for both intent (buyer component)", () => {
    const result = computeBuyerScore({ ...BASE_INPUT, primaryIntent: "both" });
    expect(result.factors.some((f) => f.key === "intent_both_buyer")).toBe(true);
  });

  it("adds 20pts for tour_home chip", () => {
    const result = computeBuyerScore({ ...BASE_INPUT, ctaChipUsed: "tour_home" });
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.factors.some((f) => f.key === "cta_tour_home")).toBe(true);
  });

  it("adds 20pts for what_can_afford chip", () => {
    const result = computeBuyerScore({ ...BASE_INPUT, ctaChipUsed: "what_can_afford" });
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.factors.some((f) => f.key === "cta_afford")).toBe(true);
  });

  it("adds 20pts for ASAP timeline", () => {
    const result = computeBuyerScore({ ...BASE_INPUT, timelineMonths: 0 });
    expect(result.factors.some((f) => f.key === "buyer_timeline_asap")).toBe(true);
  });

  it("caps score at 100", () => {
    const maxInput: ScoringInput = {
      primaryIntent: "buy",
      timelineMonths: 0,
      questionRaw: "buy now",
      hasEmail: true,
      hasPhone: true,
      hasAddress: true,
      hasName: true,
      consentSms: true,
      consentCall: true,
      consentEmail: true,
      ctaChipUsed: "tour_home",
      utmSource: "facebook",
      utmMedium: "paid",
    };
    const result = computeBuyerScore(maxInput);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("does not fire seller factors for buyer intent", () => {
    const result = computeBuyerScore({ ...BASE_INPUT, primaryIntent: "buy" });
    expect(result.factors.some((f) => f.key === "intent_sell")).toBe(false);
    expect(result.factors.some((f) => f.key === "cta_home_worth")).toBe(false);
  });
});
