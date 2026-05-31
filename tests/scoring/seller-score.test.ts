import { describe, it, expect } from "vitest";
import { computeSellerScore } from "@/lib/scoring/seller-score";
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

describe("computeSellerScore", () => {
  it("returns 0 for empty input", () => {
    const result = computeSellerScore(BASE_INPUT);
    expect(result.score).toBe(0);
    expect(result.factors).toHaveLength(0);
  });

  it("adds 30pts for explicit sell intent", () => {
    const result = computeSellerScore({ ...BASE_INPUT, primaryIntent: "sell" });
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.factors.some((f) => f.key === "intent_sell")).toBe(true);
  });

  it("adds 15pts for both intent (seller component)", () => {
    const result = computeSellerScore({ ...BASE_INPUT, primaryIntent: "both" });
    expect(result.score).toBeGreaterThanOrEqual(15);
    expect(result.factors.some((f) => f.key === "intent_both_seller")).toBe(true);
  });

  it("adds 20pts for home_worth chip", () => {
    const result = computeSellerScore({ ...BASE_INPUT, ctaChipUsed: "home_worth" });
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.factors.some((f) => f.key === "cta_home_worth")).toBe(true);
  });

  it("adds 25pts for should_sell_now chip", () => {
    const result = computeSellerScore({ ...BASE_INPUT, ctaChipUsed: "should_sell_now" });
    expect(result.score).toBeGreaterThanOrEqual(25);
  });

  it("adds 20pts for ASAP timeline", () => {
    const result = computeSellerScore({ ...BASE_INPUT, timelineMonths: 0 });
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.factors.some((f) => f.key === "timeline_asap")).toBe(true);
  });

  it("adds 15pts for 3-month timeline", () => {
    const result = computeSellerScore({ ...BASE_INPUT, timelineMonths: 3 });
    expect(result.factors.some((f) => f.key === "timeline_3mo")).toBe(true);
  });

  it("adds shared factors (phone, email, name)", () => {
    const result = computeSellerScore({
      ...BASE_INPUT,
      hasPhone: true,
      hasEmail: true,
      hasName: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(20); // 10+5+5
    expect(result.factors.some((f) => f.key === "has_phone")).toBe(true);
    expect(result.factors.some((f) => f.key === "has_email")).toBe(true);
    expect(result.factors.some((f) => f.key === "has_name")).toBe(true);
  });

  it("caps score at 100", () => {
    const maxInput: ScoringInput = {
      primaryIntent: "sell",
      timelineMonths: 0,
      questionRaw: "sell now",
      hasEmail: true,
      hasPhone: true,
      hasAddress: true,
      hasName: true,
      consentSms: true,
      consentCall: true,
      consentEmail: true,
      ctaChipUsed: "should_sell_now",
      utmSource: "google",
      utmMedium: "cpc",
    };
    const result = computeSellerScore(maxInput);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("awards paid traffic bonus for cpc medium", () => {
    const result = computeSellerScore({
      ...BASE_INPUT,
      utmMedium: "cpc",
    });
    expect(result.factors.some((f) => f.key === "paid_traffic")).toBe(true);
  });

  it("does not award paid traffic for organic medium", () => {
    const result = computeSellerScore({
      ...BASE_INPUT,
      utmMedium: "organic",
    });
    expect(result.factors.some((f) => f.key === "paid_traffic")).toBe(false);
  });
});
