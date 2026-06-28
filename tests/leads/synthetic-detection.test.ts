import { describe, expect, it } from "vitest";
import { isSyntheticEmail, SYNTHETIC_EMAIL_MARKERS } from "@/lib/leads/synthetic-detection";

describe("SYNTHETIC_EMAIL_MARKERS", () => {
  it("exports a non-empty readonly array", () => {
    expect(SYNTHETIC_EMAIL_MARKERS.length).toBeGreaterThan(0);
  });
});

describe("isSyntheticEmail", () => {
  it("returns false for null/undefined", () => {
    expect(isSyntheticEmail(null)).toBe(false);
    expect(isSyntheticEmail(undefined)).toBe(false);
    expect(isSyntheticEmail("")).toBe(false);
  });

  it("returns false for a real email address", () => {
    expect(isSyntheticEmail("john.smith@gmail.com")).toBe(false);
    expect(isSyntheticEmail("mike@ourtownproperties.com")).toBe(false);
    expect(isSyntheticEmail("buyer99@yahoo.com")).toBe(false);
    expect(isSyntheticEmail("jane.smith@gmail.com")).toBe(false);
  });

  it("returns false for a real lead with 'test' in a domain segment that is not @test.com", () => {
    expect(isSyntheticEmail("buyer@realestate-tested.com")).toBe(false);
  });

  it("detects @example.com", () => {
    expect(isSyntheticEmail("anyone@example.com")).toBe(true);
  });

  it("detects @test.com", () => {
    expect(isSyntheticEmail("smoke@test.com")).toBe(true);
  });

  it("detects +qa suffix", () => {
    expect(isSyntheticEmail("brandon+qa@gmail.com")).toBe(true);
  });

  it("detects +test suffix", () => {
    expect(isSyntheticEmail("dev+test@gmail.com")).toBe(true);
  });

  it("detects +synthetic suffix", () => {
    expect(isSyntheticEmail("ops+synthetic@gmail.com")).toBe(true);
  });

  it("detects test@ prefix", () => {
    expect(isSyntheticEmail("test@ourtownproperties.com")).toBe(true);
  });

  it("detects synthetic@ prefix", () => {
    expect(isSyntheticEmail("synthetic@ourtownproperties.com")).toBe(true);
  });

  it("detects AMM-specific qa+amm- marker", () => {
    expect(isSyntheticEmail("qa+amm-wordpress@example.com")).toBe(true);
    expect(isSyntheticEmail("qa+amm-smoke@ourtownproperties.com")).toBe(true);
  });

  it("detects amm-wordpress-smoke marker", () => {
    expect(isSyntheticEmail("amm-wordpress-smoke@test.net")).toBe(true);
  });

  it("detects amm-wordpress-attribution-smoke marker", () => {
    expect(isSyntheticEmail("amm-wordpress-attribution-smoke@test.net")).toBe(true);
  });

  it("detects amm_wordpress marker (case-insensitive)", () => {
    expect(isSyntheticEmail("AMM_WORDPRESS@test.net")).toBe(true);
    expect(isSyntheticEmail("amm_wordpress@test.net")).toBe(true);
  });

  it("detects do_not_contact marker (case-insensitive)", () => {
    expect(isSyntheticEmail("DO_NOT_CONTACT@test.net")).toBe(true);
    expect(isSyntheticEmail("do_not_contact@test.net")).toBe(true);
  });

  it("is case-insensitive across all markers", () => {
    expect(isSyntheticEmail("TEST@gmail.com")).toBe(true);
    expect(isSyntheticEmail("SYNTHETIC@gmail.com")).toBe(true);
    expect(isSyntheticEmail("brandon+QA@gmail.com")).toBe(true);
  });

  it("all SYNTHETIC_EMAIL_MARKERS are detectable", () => {
    for (const marker of SYNTHETIC_EMAIL_MARKERS) {
      expect(isSyntheticEmail(`user${marker}suffix`)).toBe(true);
    }
  });
});
