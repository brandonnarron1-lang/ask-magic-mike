import { describe, expect, it } from "vitest";
import {
  classifyDuplicate,
  detectDuplicate,
  DUPLICATE_HARD_THRESHOLD,
  DUPLICATE_LIKELY_THRESHOLD,
} from "@/lib/leads/duplicate-detection";
import { normalizeLeadIdentity } from "@/lib/leads/normalize";

const candidate = normalizeLeadIdentity({
  email: "jane@example.com",
  phone: "+12525551234",
  address: "123 Nash St NW, Wilson NC 27896",
});

describe("detectDuplicate", () => {
  it("returns null when there are no known leads", () => {
    expect(detectDuplicate(candidate, [])).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(
      detectDuplicate(candidate, [
        {
          leadId: "L1",
          normalizedEmail: "someone@else.com",
          normalizedPhone: "+19195550000",
          normalizedAddressFingerprint: "456 oak road wilson nc",
        },
      ])
    ).toBeNull();
  });

  it("flags email + phone exact match as hard duplicate", () => {
    const result = classifyDuplicate(candidate, [
      {
        leadId: "L1",
        normalizedEmail: "jane@example.com",
        normalizedPhone: "+12525551234",
        normalizedAddressFingerprint: null,
      },
    ]);
    expect(result.isHard).toBe(true);
    expect(result.match?.leadId).toBe("L1");
    expect(result.match?.confidence).toBeGreaterThanOrEqual(
      DUPLICATE_HARD_THRESHOLD
    );
    expect(result.match?.reasons).toContain("email_match");
    expect(result.match?.reasons).toContain("phone_match");
  });

  it("treats Nash St vs Nash Street as a fuzzy address dup", () => {
    const result = detectDuplicate(candidate, [
      {
        leadId: "L2",
        normalizedEmail: null,
        normalizedPhone: null,
        normalizedAddressFingerprint: "123 nash drive wilson nc",
      },
    ]);
    expect(result?.reasons).toContain("address_fuzzy_match");
  });

  it("only-fuzzy-address is a likely (not hard) dup", () => {
    const result = classifyDuplicate(candidate, [
      {
        leadId: "L3",
        normalizedEmail: null,
        normalizedPhone: null,
        normalizedAddressFingerprint: "123 nash street wilson nc",
      },
    ]);
    expect(result.isHard).toBe(false);
    expect(result.match?.confidence).toBeGreaterThanOrEqual(
      DUPLICATE_LIKELY_THRESHOLD - 30
    );
  });

  it("does not false-positive across different street numbers", () => {
    const result = detectDuplicate(candidate, [
      {
        leadId: "L4",
        normalizedEmail: null,
        normalizedPhone: null,
        normalizedAddressFingerprint: "456 nash street wilson nc",
      },
    ]);
    expect(result).toBeNull();
  });
});
