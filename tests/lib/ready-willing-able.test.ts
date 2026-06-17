import { describe, it, expect } from "vitest";
import { computeReadyWillingAble, type RwaLead } from "@/lib/leads/ready-willing-able";

describe("computeReadyWillingAble", () => {
  it("scores a hot seller as urgent or hot", () => {
    const lead: RwaLead = {
      leadType: "seller",
      timeline: "asap",
      hasEmail: true,
      hasPhone: true,
      hasAddress: true,
      intentText: "I inherited this property and need to sell quickly, willing to meet",
      sellerMotivation: "inherited estate",
      appointmentRequested: true,
      consentSms: true,
      consentEmail: true,
      spamScore: 0,
      complianceFlags: [],
    };

    const result = computeReadyWillingAble(lead);

    expect(result.brokerReviewRequired).toBe(true);
    expect(["hot", "urgent"]).toContain(result.tier);
    expect(result.ready).toBeGreaterThanOrEqual(60);
    expect(result.willing).toBeGreaterThanOrEqual(50);
    expect(result.able).toBeGreaterThanOrEqual(60);
    expect(result.evidence.some((e) => e.includes("Timeline: ASAP"))).toBe(true);
    expect(result.evidence.some((e) => e.includes("inherited"))).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("scores an incomplete seller lead as cold with populated missing[]", () => {
    const lead: RwaLead = {
      leadType: "seller",
      timeline: null,
      hasEmail: false,
      hasPhone: false,
      hasAddress: false,
      intentText: null,
      sellerMotivation: null,
      appointmentRequested: false,
      consentSms: false,
      consentEmail: false,
      spamScore: 0,
      complianceFlags: [],
    };

    const result = computeReadyWillingAble(lead);

    expect(result.brokerReviewRequired).toBe(true);
    expect(result.tier).toBe("cold");
    expect(result.ready).toBeLessThan(40);
    expect(result.able).toBeLessThan(30);
    expect(result.missing.some((m) => m.includes("timeline"))).toBe(true);
    expect(result.missing.some((m) => m.includes("phone"))).toBe(true);
    expect(result.missing.some((m) => m.includes("address"))).toBe(true);
  });

  it("scores a hot buyer as hot or urgent", () => {
    const lead: RwaLead = {
      leadType: "buyer",
      timeline: "0_30_days",
      hasEmail: true,
      hasPhone: true,
      hasAddress: true,
      intentText: "pre-approved for $300k, looking for 3 beds 2 baths in Wilson NC",
      appointmentRequested: true,
      consentSms: true,
      consentEmail: true,
      spamScore: 0,
      complianceFlags: [],
    };

    const result = computeReadyWillingAble(lead);

    expect(result.brokerReviewRequired).toBe(true);
    expect(["hot", "urgent"]).toContain(result.tier);
    expect(result.ready).toBeGreaterThanOrEqual(45);
    expect(result.willing).toBeGreaterThanOrEqual(50);
    expect(result.able).toBeGreaterThanOrEqual(60);
    expect(result.evidence.some((e) => e.includes("pre-approval"))).toBe(true);
    expect(result.evidence.some((e) => e.includes("criteria"))).toBe(true);
  });

  it("scores an incomplete buyer lead as cold with populated missing[]", () => {
    const lead: RwaLead = {
      leadType: "buyer",
      timeline: null,
      hasEmail: false,
      hasPhone: false,
      hasAddress: false,
      intentText: null,
      appointmentRequested: false,
      consentSms: false,
      consentEmail: false,
      spamScore: 0,
      complianceFlags: [],
    };

    const result = computeReadyWillingAble(lead);

    expect(result.brokerReviewRequired).toBe(true);
    expect(result.tier).toBe("cold");
    expect(result.ready).toBeLessThan(20);
    expect(result.able).toBeLessThan(30);
    expect(result.missing.some((m) => m.includes("timeline"))).toBe(true);
    expect(result.missing.some((m) => m.includes("phone"))).toBe(true);
    expect(result.missing.some((m) => m.includes("criteria"))).toBe(true);
  });
});
