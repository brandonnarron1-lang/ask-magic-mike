import { describe, expect, it } from "vitest";
import { isSyntheticEmail, SYNTHETIC_EMAIL_MARKERS } from "@/lib/leads/synthetic-detection";

describe("SYNTHETIC_EMAIL_MARKERS", () => {
  it("exports a non-empty readonly array", () => {
    expect(SYNTHETIC_EMAIL_MARKERS.length).toBeGreaterThan(0);
  });
});

describe("isSyntheticEmail", () => {
  it("returns false for null", () => {
    expect(isSyntheticEmail(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSyntheticEmail(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSyntheticEmail("")).toBe(false);
  });

  it("flags @example.com", () => {
    expect(isSyntheticEmail("smoke@example.com")).toBe(true);
  });

  it("flags @test.com", () => {
    expect(isSyntheticEmail("user@test.com")).toBe(true);
  });

  it("flags +qa variant", () => {
    expect(isSyntheticEmail("brandon+qa@gmail.com")).toBe(true);
  });

  it("flags qa+amm- prefix", () => {
    expect(isSyntheticEmail("qa+amm-smoke-123@gmail.com")).toBe(true);
  });

  it("flags amm-wordpress-smoke", () => {
    expect(isSyntheticEmail("amm-wordpress-smoke+abc@gmail.com")).toBe(true);
  });

  it("flags amm-wordpress-attribution-smoke", () => {
    expect(isSyntheticEmail("amm-wordpress-attribution-smoke@otp.test")).toBe(true);
  });

  it("flags do_not_contact case-insensitively", () => {
    expect(isSyntheticEmail("DO_NOT_CONTACT@anything.com")).toBe(true);
  });

  it("flags amm_wordpress case-insensitively", () => {
    expect(isSyntheticEmail("AMM_WORDPRESS_LEAD@domain.com")).toBe(true);
  });

  it("returns false for a real-looking Wilson NC lead", () => {
    expect(isSyntheticEmail("jane.smith@gmail.com")).toBe(false);
  });

  it("returns false for a real lead with 'test' in a domain segment that is not @test.com", () => {
    expect(isSyntheticEmail("buyer@realestate-tested.com")).toBe(false);
  });

  it("flags +test variant in email", () => {
    expect(isSyntheticEmail("user+test@gmail.com")).toBe(true);
  });

  it("is case-insensitive for all markers", () => {
    expect(isSyntheticEmail("SMOKE@EXAMPLE.COM")).toBe(true);
    expect(isSyntheticEmail("User+QA@Gmail.COM")).toBe(true);
  });
});
