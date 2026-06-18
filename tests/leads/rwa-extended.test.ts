/**
 * Extended RWA edge-case coverage.
 *
 * Companions tests/lib/ready-willing-able.test.ts which covers the hot/cold
 * canonical paths. These tests cover edge cases with no prior coverage:
 *   - "both" intent treated as seller path
 *   - compliance flags penalizing willing and able
 *   - high spam score reducing able
 *   - temperature proxy when timeline is null (HOT/WARM/NURTURE/unknown)
 *   - "unknown" intent treated as buyer path
 */
import { describe, it, expect } from "vitest";
import { computeReadyWillingAble, type RwaLead } from "@/lib/leads/ready-willing-able";

function baseLead(overrides: Partial<RwaLead> = {}): RwaLead {
  return {
    leadType: "seller",
    primaryIntent: "sell",
    timeline: "asap",
    hasEmail: true,
    hasPhone: true,
    hasAddress: true,
    intentText: "Ready to sell, need quick turnaround",
    sellerMotivation: null,
    appointmentRequested: false,
    consentSms: false,
    consentEmail: false,
    spamScore: 0,
    complianceFlags: [],
    ...overrides,
  };
}

describe("computeReadyWillingAble — extended edge cases", () => {
  it('"both" intent is treated as seller path (isSeller check)', () => {
    const lead = baseLead({ primaryIntent: "both", leadType: undefined });
    const result = computeReadyWillingAble(lead);
    // Seller path: address provides willing points, motivation from intentText
    expect(result.brokerReviewRequired).toBe(true);
    expect(["warm", "hot", "urgent"]).toContain(result.tier);
    // Seller willing checks address; buyer willing checks search criteria
    // With address present, seller path scores it in willing
    expect(result.willing).toBeGreaterThanOrEqual(30);
  });

  it('"unknown" intent with no leadType is treated as buyer path', () => {
    const lead: RwaLead = {
      leadType: undefined,
      primaryIntent: "unknown",
      timeline: "asap",
      hasEmail: true,
      hasPhone: true,
      hasAddress: false,
      intentText: "pre-approved for $250k, looking for 3 beds in Wilson",
      appointmentRequested: false,
      consentSms: false,
      consentEmail: false,
      spamScore: 0,
      complianceFlags: [],
    };
    const result = computeReadyWillingAble(lead);
    expect(result.brokerReviewRequired).toBe(true);
    // Buyer path: pre-approval in text gives willing credit, ASAP timeline gives ready credit
    expect(result.evidence.some((e) => e.includes("pre-approval"))).toBe(true);
    expect(result.ready).toBeGreaterThanOrEqual(35);
  });

  it("compliance flags reduce willing score by 30 and populate missing[]", () => {
    const clean = computeReadyWillingAble(baseLead());
    const flagged = computeReadyWillingAble(
      baseLead({ complianceFlags: ["do_not_contact"] })
    );
    expect(flagged.willing).toBeLessThan(clean.willing);
    expect(flagged.missing.some((m) => m.includes("Compliance review"))).toBe(true);
  });

  it("compliance flags also reduce able score by 20", () => {
    const clean = computeReadyWillingAble(baseLead());
    const flagged = computeReadyWillingAble(
      baseLead({ complianceFlags: ["do_not_contact"] })
    );
    expect(flagged.able).toBeLessThan(clean.able);
  });

  it("spam score >= 50 reduces able by 50 and populates missing[]", () => {
    const clean = computeReadyWillingAble(baseLead());
    const spammy = computeReadyWillingAble(baseLead({ spamScore: 75 }));
    // able starts high (phone+email+address = 40+25+25=90), minus 50 → 40
    expect(spammy.able).toBeLessThanOrEqual(clean.able - 50);
    expect(spammy.missing.some((m) => m.includes("spam score"))).toBe(true);
  });

  it("temperature HOT proxies a moderate ready score when timeline is absent", () => {
    const lead = baseLead({ timeline: null, temperature: "HOT", leadType: "seller" });
    const result = computeReadyWillingAble(lead);
    // HOT proxy → ready score 45, no timeline evidence but no missing[] for timeline
    expect(result.ready).toBeGreaterThanOrEqual(45);
  });

  it("temperature NURTURE proxies a low ready score when timeline is absent", () => {
    const lead = baseLead({ timeline: null, temperature: "NURTURE", leadType: "seller" });
    const result = computeReadyWillingAble(lead);
    // NURTURE proxy → score 10; temperature proxy gives a score but no evidence string
    expect(result.ready).toBeLessThanOrEqual(30);
    expect(result.ready).toBeGreaterThan(0);
  });

  it("no timeline and no temperature proxy defaults to ready=0 and populates missing[]", () => {
    const lead = baseLead({
      timeline: null,
      temperature: null,
      leadType: "seller",
    });
    const result = computeReadyWillingAble(lead);
    expect(result.ready).toBe(0);
    expect(result.missing.some((m) => m.includes("timeline"))).toBe(true);
  });
});
