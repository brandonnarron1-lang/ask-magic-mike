import { describe, it, expect } from "vitest";
import { SubmitIntakeSchema, E164PhoneRegex } from "@/schemas/lead.schema";
import { CreateSessionSchema } from "@/schemas/session.schema";
import { LeadScoreSchema } from "@/schemas/scoring.schema";

describe("E164PhoneRegex", () => {
  it("accepts valid E.164 numbers", () => {
    expect(E164PhoneRegex.test("+13525551234")).toBe(true);
    expect(E164PhoneRegex.test("+19045551234")).toBe(true);
    expect(E164PhoneRegex.test("+447911123456")).toBe(true);
  });

  it("rejects numbers without country code", () => {
    expect(E164PhoneRegex.test("3525551234")).toBe(false);
    expect(E164PhoneRegex.test("(352) 555-1234")).toBe(false);
  });

  it("rejects numbers starting with +0", () => {
    expect(E164PhoneRegex.test("+01234567890")).toBe(false);
  });
});

describe("SubmitIntakeSchema", () => {
  it("validates a minimal valid intake", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for sessionId", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid E.164 phone", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      phone: "3525551234",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid E.164 phone", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      phone: "+13525551234",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid timeline months", () => {
    for (const months of [0, 3, 6, 12, 24]) {
      const result = SubmitIntakeSchema.safeParse({
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        timelineMonths: months,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid timeline months", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      timelineMonths: 7,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid zip code", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      zip: "1234",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid 5-digit zip", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      zip: "32601",
    });
    expect(result.success).toBe(true);
  });
});

describe("CreateSessionSchema", () => {
  it("applies default values for missing fields", () => {
    const result = CreateSessionSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.referrerType).toBe("direct");
      expect(result.data.deviceType).toBe("desktop");
      expect(result.data.landingPage).toBe("/");
    }
  });

  it("rejects invalid referrer URL", () => {
    const result = CreateSessionSchema.safeParse({
      referrerUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("LeadScoreSchema", () => {
  it("validates a complete score object", () => {
    const result = LeadScoreSchema.safeParse({
      sellerCertaintyScore: 75,
      buyerCertaintyScore: 40,
      compositeScore: 75,
      temperature: "hot",
      factorLog: [
        { key: "intent_sell", category: "seller", points: 30, reason: "Explicit sell intent" },
      ],
      scorerVersion: "1.0.0",
    });
    expect(result.success).toBe(true);
  });

  it("rejects scores outside 0-100", () => {
    const result = LeadScoreSchema.safeParse({
      sellerCertaintyScore: 150,
      buyerCertaintyScore: 0,
      compositeScore: 0,
      temperature: "low",
      factorLog: [],
      scorerVersion: "1.0.0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid temperature", () => {
    const result = LeadScoreSchema.safeParse({
      sellerCertaintyScore: 0,
      buyerCertaintyScore: 0,
      compositeScore: 0,
      temperature: "blazing",
      factorLog: [],
      scorerVersion: "1.0.0",
    });
    expect(result.success).toBe(false);
  });
});
