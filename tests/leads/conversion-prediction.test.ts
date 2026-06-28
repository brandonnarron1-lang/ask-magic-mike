import { describe, expect, it } from "vitest";
import { buildConversionPrediction, type ConversionPredictionInput } from "@/lib/leads/conversion-prediction";

function base(overrides: Partial<ConversionPredictionInput> = {}): ConversionPredictionInput {
  return {
    grade:       "B",
    score:       60,
    temperature: "warm",
    leadType:    "seller",
    hasEmail:    true,
    hasPhone:    true,
    hasAddress:  true,
    consentSms:  true,
    consentEmail: true,
    assignedAgentId: "agent-1",
    referrerType: "organic",
    questionRaw: "What is my home worth in Wilson NC?",
    status:      "new",
    ...overrides,
  };
}

describe("buildConversionPrediction", () => {
  it("returns all required fields", () => {
    const r = buildConversionPrediction(base());
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(["green","yellow","amber","red"]).toContain(r.colorTier);
    expect(r.label).toBeTruthy();
    expect(r.primaryReason).toBeTruthy();
    expect(Array.isArray(r.positiveSignals)).toBe(true);
    expect(Array.isArray(r.negativeSignals)).toBe(true);
  });

  it("A+ urgent leads score higher than D low leads", () => {
    const high = buildConversionPrediction(base({ grade: "A+", temperature: "urgent", score: 95 }));
    const low  = buildConversionPrediction(base({ grade: "D",  temperature: "low",    score: 10 }));
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("green tier for A+ urgent with all positive signals", () => {
    const r = buildConversionPrediction(base({
      grade: "A+", temperature: "urgent", score: 95,
      leadType: "seller_cash_offer", assignedAgentId: "a1",
    }));
    expect(r.colorTier).toBe("green");
  });

  it("red tier when no contact info", () => {
    const r = buildConversionPrediction(base({
      grade: "D", temperature: "low", score: 5,
      hasEmail: false, hasPhone: false,
      consentEmail: false, consentSms: false,
      assignedAgentId: undefined,
    }));
    expect(r.colorTier).toBe("red");
  });

  it("positive signals include cash offer for seller_cash_offer type", () => {
    const r = buildConversionPrediction(base({ leadType: "seller_cash_offer" }));
    expect(r.positiveSignals.some(s => s.toLowerCase().includes("cash offer"))).toBe(true);
  });

  it("negative signals include unassigned when no agent", () => {
    const r = buildConversionPrediction(base({ assignedAgentId: undefined }));
    expect(r.negativeSignals.some(s => s.toLowerCase().includes("unassigned"))).toBe(true);
  });

  it("detects new lead signal when recently created", () => {
    // Minimal input so the new-lead signal competes among fewer positives
    const recent = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
    const r = buildConversionPrediction({
      grade: "C",
      score: 40,
      leadType: "general_question",
      hasEmail: true,
      hasPhone: false,
      hasAddress: false,
      consentEmail: true,
      createdAt: recent,
    });
    // New lead (8 pts) should rank in top 5 with this sparse input
    expect(r.positiveSignals.some(s => s.toLowerCase().includes("new lead"))).toBe(true);
  });

  it("negative signals mention stale lead after 72 hours", () => {
    const old = new Date(Date.now() - 100 * 3600 * 1000).toISOString(); // ~4 days ago
    const r = buildConversionPrediction(base({ createdAt: old }));
    expect(r.negativeSignals.some(s => s.toLowerCase().includes("stale"))).toBe(true);
  });

  it("spam score triggers negative signal", () => {
    const r = buildConversionPrediction(base({ spamScore: 75 }));
    expect(r.negativeSignals.some(s => s.toLowerCase().includes("spam"))).toBe(true);
  });

  it("max 5 positive and 5 negative signals", () => {
    const r = buildConversionPrediction(base());
    expect(r.positiveSignals.length).toBeLessThanOrEqual(5);
    expect(r.negativeSignals.length).toBeLessThanOrEqual(5);
  });

  it("colorClass is a non-empty string", () => {
    const r = buildConversionPrediction(base());
    expect(r.colorClass.length).toBeGreaterThan(0);
  });

  it("closed_won status scores 100", () => {
    const r = buildConversionPrediction(base({ status: "closed_won" }));
    expect(r.score).toBe(100);
  });
});
