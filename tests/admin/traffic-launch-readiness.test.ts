/**
 * Tests for src/lib/admin/traffic-launch-readiness.ts
 */
import { describe, expect, it } from "vitest";
import { buildLaunchReadiness } from "@/lib/admin/traffic-launch-readiness";

describe("buildLaunchReadiness", () => {
  it("marks AMM links as safe", () => {
    const r = buildLaunchReadiness();
    expect(r.ammLinksSafe).toBe(true);
  });

  it("marks OTP Facebook links as NOT safe (WAF block pending)", () => {
    const r = buildLaunchReadiness();
    expect(r.otpFacebookLinksSafe).toBe(false);
  });

  it("recommends askmagicmike.com as primary posting domain", () => {
    const r = buildLaunchReadiness();
    expect(r.recommendedPrimaryPostingDomain).toBe("askmagicmike.com");
  });

  it("identifies ourtownproperties.com as the blocked domain", () => {
    const r = buildLaunchReadiness();
    expect(r.blockedDomain).toBe("ourtownproperties.com");
  });

  it("blocker reason references WAF / facebookexternalhit", () => {
    const r = buildLaunchReadiness();
    expect(r.blockerReason.toLowerCase()).toContain("facebookexternalhit");
    expect(r.blockerReason.toLowerCase()).toContain("403");
  });

  it("doNotPostList contains ourtownproperties.com Facebook entries", () => {
    const r = buildLaunchReadiness();
    const otpFbEntries = r.doNotPostList.filter(
      (item) =>
        item.url.includes("ourtownproperties.com") &&
        item.platform.toLowerCase() === "facebook"
    );
    expect(otpFbEntries.length).toBeGreaterThanOrEqual(2);
  });

  it("doNotPostList entries have url, platform, and reason", () => {
    const r = buildLaunchReadiness();
    for (const item of r.doNotPostList) {
      expect(item.url).toBeTruthy();
      expect(item.platform).toBeTruthy();
      expect(item.reason).toBeTruthy();
    }
  });

  it("doNotPostList does NOT include askmagicmike.com URLs", () => {
    const r = buildLaunchReadiness();
    const ammEntries = r.doNotPostList.filter((item) =>
      item.url.includes("askmagicmike.com")
    );
    expect(ammEntries).toHaveLength(0);
  });

  it("launchChecklist has at least 4 steps", () => {
    const r = buildLaunchReadiness();
    expect(r.launchChecklist.length).toBeGreaterThanOrEqual(4);
  });

  it("launchChecklist includes a step about the host WAF fix", () => {
    const r = buildLaunchReadiness();
    const wafStep = r.launchChecklist.find(
      (step) =>
        step.action.toLowerCase().includes("regency") ||
        step.action.toLowerCase().includes("waf")
    );
    expect(wafStep).toBeDefined();
    expect(wafStep?.status).toBe("blocked");
  });

  it("launchChecklist has steps numbered sequentially from 1", () => {
    const r = buildLaunchReadiness();
    r.launchChecklist.forEach((step, idx) => {
      expect(step.step).toBe(idx + 1);
    });
  });

  it("nextBestAction mentions posting AMM links", () => {
    const r = buildLaunchReadiness();
    expect(r.nextBestAction.toLowerCase()).toContain("askmagicmike.com");
  });

  it("nextBestAction mentions the UTM Copy Bank", () => {
    const r = buildLaunchReadiness();
    expect(r.nextBestAction.toLowerCase()).toContain("utm");
  });

  it("nextBestAction warns against posting OTP links on Facebook", () => {
    const r = buildLaunchReadiness();
    expect(r.nextBestAction.toLowerCase()).toContain("ourtownproperties.com");
  });

  it("socialPreviewScore reflects 40/42 baseline", () => {
    const r = buildLaunchReadiness();
    expect(r.socialPreviewScore).toContain("40/42");
  });

  it("has no mutation behavior — result is pure data", () => {
    // Calling twice returns identical shapes (no side effects)
    const r1 = buildLaunchReadiness();
    const r2 = buildLaunchReadiness();
    expect(r1.ammLinksSafe).toBe(r2.ammLinksSafe);
    expect(r1.otpFacebookLinksSafe).toBe(r2.otpFacebookLinksSafe);
    expect(r1.doNotPostList.length).toBe(r2.doNotPostList.length);
  });

  it("contains no social posting function", () => {
    const r = buildLaunchReadiness();
    // No function values on the returned object
    const asMap = r as unknown as Record<string, unknown>;
    const fnKeys = Object.keys(r).filter((k) => typeof asMap[k] === "function");
    expect(fnKeys).toHaveLength(0);
  });
});
