import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  normalizePhone,
  normalizeAddress,
  normalizeLeadIdentity,
} from "@/lib/leads/normalize";

describe("normalizeEmail", () => {
  it("lowercases and trims valid email", () => {
    expect(normalizeEmail("  Jane@Example.COM  ").normalized).toBe(
      "jane@example.com"
    );
  });

  it("flags disposable domains", () => {
    const r = normalizeEmail("burner@mailinator.com");
    expect(r.disposable).toBe(true);
    expect(r.normalized).toBe("burner@mailinator.com");
  });

  it("returns null normalized for invalid email", () => {
    expect(normalizeEmail("not-an-email").normalized).toBeNull();
    expect(normalizeEmail("not-an-email").valid).toBe(false);
  });

  it("handles empty / null / undefined", () => {
    expect(normalizeEmail(null).valid).toBe(false);
    expect(normalizeEmail("").valid).toBe(false);
    expect(normalizeEmail(undefined).valid).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("produces E.164 for a 10-digit US number", () => {
    const r = normalizePhone("(252) 555-1234");
    expect(r.e164).toBe("+12525551234");
    expect(r.valid).toBe(true);
  });

  it("accepts numbers already in E.164", () => {
    expect(normalizePhone("+12525551234").e164).toBe("+12525551234");
  });

  it("returns null for invalid input", () => {
    expect(normalizePhone("abc").e164).toBeNull();
    expect(normalizePhone("12345").e164).toBeNull();
  });
});

describe("normalizeAddress", () => {
  it("produces a fingerprint that drops unit + expands abbreviations", () => {
    const r = normalizeAddress("123 Nash St NW, Apt 4, Wilson, NC 27896");
    expect(r.fingerprint).toContain("123");
    expect(r.fingerprint).toContain("nash");
    expect(r.fingerprint).toContain("street");
    expect(r.fingerprint).toContain("northwest");
    expect(r.fingerprint).not.toContain("apt");
  });

  it("treats Nash St and Nash Street as the same fingerprint", () => {
    const a = normalizeAddress("123 Nash St, Wilson, NC").fingerprint;
    const b = normalizeAddress("123 Nash Street, Wilson, NC").fingerprint;
    expect(a).toBe(b);
  });

  it("returns null for empty input", () => {
    expect(normalizeAddress(null).fingerprint).toBeNull();
    expect(normalizeAddress("").fingerprint).toBeNull();
  });
});

describe("normalizeLeadIdentity", () => {
  it("composes all three normalizers", () => {
    const r = normalizeLeadIdentity({
      email: "Jane@Example.COM",
      phone: "2525551234",
      address: "123 Nash St NW, Wilson, NC",
    });
    expect(r.email.normalized).toBe("jane@example.com");
    expect(r.phone.e164).toBe("+12525551234");
    expect(r.address.fingerprint).toContain("nash street northwest");
  });
});
