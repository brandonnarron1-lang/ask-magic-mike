/**
 * Tests for src/lib/admin/utm-link-builder.ts
 */
import { describe, expect, it } from "vitest";
import {
  buildUtmUrl,
  buildUtmCopyBank,
  isApprovedBaseUrl,
  isRejectedUrl,
  sanitizeUtmValue,
} from "@/lib/admin/utm-link-builder";
import type { UtmParams } from "@/lib/admin/utm-link-builder";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_PARAMS: UtmParams = {
  utm_source:   "facebook",
  utm_medium:   "social_organic",
  utm_campaign: "amm_launch",
  utm_content:  "facebook_post",
};

// ---------------------------------------------------------------------------
// isApprovedBaseUrl
// ---------------------------------------------------------------------------

describe("isApprovedBaseUrl", () => {
  it("approves https://www.askmagicmike.com/", () => {
    expect(isApprovedBaseUrl("https://www.askmagicmike.com/")).toBe(true);
  });

  it("approves https://www.askmagicmike.com/ask", () => {
    expect(isApprovedBaseUrl("https://www.askmagicmike.com/ask")).toBe(true);
  });

  it("approves https://www.askmagicmike.com/value", () => {
    expect(isApprovedBaseUrl("https://www.askmagicmike.com/value")).toBe(true);
  });

  it("rejects ourtownproperties.com", () => {
    expect(isApprovedBaseUrl("https://www.ourtownproperties.com/ask-mike/")).toBe(false);
  });

  it("rejects vercel.app URLs", () => {
    expect(isApprovedBaseUrl("https://ask-magic-mike.vercel.app/ask")).toBe(false);
  });

  it("rejects arbitrary URLs", () => {
    expect(isApprovedBaseUrl("https://example.com/")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRejectedUrl
// ---------------------------------------------------------------------------

describe("isRejectedUrl", () => {
  it("rejects vercel.app", () => {
    expect(isRejectedUrl("https://ask-magic-mike.vercel.app/ask")).toBe(true);
  });

  it("rejects ourtownproperties.com", () => {
    expect(isRejectedUrl("https://www.ourtownproperties.com/ask-mike/")).toBe(true);
  });

  it("does not reject askmagicmike.com", () => {
    expect(isRejectedUrl("https://www.askmagicmike.com/ask")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizeUtmValue
// ---------------------------------------------------------------------------

describe("sanitizeUtmValue", () => {
  it("lowercases values", () => {
    expect(sanitizeUtmValue("FACEBOOK")).toBe("facebook");
  });

  it("replaces spaces with underscores", () => {
    expect(sanitizeUtmValue("facebook post")).toBe("facebook_post");
  });

  it("strips special characters and collapses underscores", () => {
    // " & " and "!" become "_", consecutive underscores collapse to single
    expect(sanitizeUtmValue("hello & world!")).toBe("hello_world_");
  });

  it("collapses multiple underscores from repeated spaces/specials", () => {
    // Multiple spaces → multiple underscores → collapsed
    expect(sanitizeUtmValue("a  b")).toBe("a_b");
    expect(sanitizeUtmValue("a   b")).toBe("a_b");
  });

  it("preserves hyphens", () => {
    expect(sanitizeUtmValue("amm-launch")).toBe("amm-launch");
  });

  it("trims whitespace", () => {
    expect(sanitizeUtmValue("  facebook  ")).toBe("facebook");
  });
});

// ---------------------------------------------------------------------------
// buildUtmUrl
// ---------------------------------------------------------------------------

describe("buildUtmUrl", () => {
  it("builds a valid UTM URL for an approved base", () => {
    const url = buildUtmUrl("https://www.askmagicmike.com/ask", BASE_PARAMS);
    expect(url).toContain("https://www.askmagicmike.com/ask");
    expect(url).toContain("utm_source=facebook");
    expect(url).toContain("utm_medium=social_organic");
    expect(url).toContain("utm_campaign=amm_launch");
    expect(url).toContain("utm_content=facebook_post");
  });

  it("uses ? separator for URLs with no existing query string", () => {
    const url = buildUtmUrl("https://www.askmagicmike.com/ask", BASE_PARAMS);
    expect(url).toContain("?utm_source=");
  });

  it("rejects vercel.app base URL", () => {
    expect(() =>
      buildUtmUrl("https://ask-magic-mike.vercel.app/ask", BASE_PARAMS)
    ).toThrow(/rejected/i);
  });

  it("rejects ourtownproperties.com base URL", () => {
    expect(() =>
      buildUtmUrl("https://www.ourtownproperties.com/ask-mike/", BASE_PARAMS)
    ).toThrow(/rejected/i);
  });

  it("rejects unapproved but non-rejected URL (e.g. example.com)", () => {
    expect(() =>
      buildUtmUrl("https://example.com/ask", BASE_PARAMS)
    ).toThrow(/unapproved/i);
  });

  it("rejects empty utm_source", () => {
    expect(() =>
      buildUtmUrl("https://www.askmagicmike.com/ask", {
        ...BASE_PARAMS,
        utm_source: "",
      })
    ).toThrow();
  });

  it("sanitizes utm_source value in output", () => {
    const url = buildUtmUrl("https://www.askmagicmike.com/ask", {
      ...BASE_PARAMS,
      utm_source: "FACEBOOK ORGANIC",
    });
    expect(url).toContain("utm_source=facebook_organic");
  });

  it("does not contain ourtownproperties.com in output", () => {
    const url = buildUtmUrl("https://www.askmagicmike.com/ask", BASE_PARAMS);
    expect(url).not.toContain("ourtownproperties.com");
  });

  it("does not contain vercel.app in output", () => {
    const url = buildUtmUrl("https://www.askmagicmike.com/ask", BASE_PARAMS);
    expect(url).not.toContain("vercel.app");
  });
});

// ---------------------------------------------------------------------------
// buildUtmCopyBank
// ---------------------------------------------------------------------------

describe("buildUtmCopyBank", () => {
  it("returns links for all 8 posting platforms", () => {
    const bank = buildUtmCopyBank();
    const platforms = bank.links.map((l) => l.platform);
    expect(platforms).toContain("facebook");
    expect(platforms).toContain("instagram_bio");
    expect(platforms).toContain("instagram_story");
    expect(platforms).toContain("linkedin");
    expect(platforms).toContain("x");
    expect(platforms).toContain("threads");
    expect(platforms).toContain("email_signature");
    expect(platforms).toContain("qr_flyer");
    expect(bank.links).toHaveLength(8);
  });

  it("all output URLs use askmagicmike.com base", () => {
    const bank = buildUtmCopyBank();
    for (const link of bank.links) {
      expect(link.fullUrl).toContain("askmagicmike.com");
      expect(link.fullUrl).not.toContain("ourtownproperties.com");
      expect(link.fullUrl).not.toContain("vercel.app");
    }
  });

  it("all URLs include utm_campaign=amm_launch", () => {
    const bank = buildUtmCopyBank();
    for (const link of bank.links) {
      expect(link.fullUrl).toContain("utm_campaign=amm_launch");
    }
  });

  it("facebook link is marked safeToPostOnFacebook=true", () => {
    const bank = buildUtmCopyBank();
    const fbLink = bank.links.find((l) => l.platform === "facebook");
    expect(fbLink?.safeToPostOnFacebook).toBe(true);
  });

  it("non-Facebook platforms are not marked safeToPostOnFacebook (they are for other platforms)", () => {
    const bank = buildUtmCopyBank();
    const instagramLink = bank.links.find((l) => l.platform === "instagram_bio");
    // instagram_bio is safe to use on Instagram, but safeToPostOnFacebook=false
    expect(instagramLink?.safeToPostOnFacebook).toBe(false);
  });

  it("disclaimer warns against ourtownproperties.com on Facebook", () => {
    const bank = buildUtmCopyBank();
    expect(bank.disclaimer.toLowerCase()).toContain("ourtownproperties.com");
    expect(bank.disclaimer.toLowerCase()).toContain("facebook");
  });

  it("disclaimer states this page never posts for you", () => {
    const bank = buildUtmCopyBank();
    expect(bank.disclaimer.toLowerCase()).toContain("never posts for you");
  });

  it("each link has a placement note", () => {
    const bank = buildUtmCopyBank();
    for (const link of bank.links) {
      expect(link.placementNote).toBeTruthy();
    }
  });

  it("email_signature uses owned_media medium", () => {
    const bank = buildUtmCopyBank();
    const emailLink = bank.links.find((l) => l.platform === "email_signature");
    expect(emailLink?.utmParams.utm_medium).toBe("owned_media");
  });

  it("qr_flyer uses owned_media medium", () => {
    const bank = buildUtmCopyBank();
    const qrLink = bank.links.find((l) => l.platform === "qr_flyer");
    expect(qrLink?.utmParams.utm_medium).toBe("owned_media");
  });

  it("social platforms use social_organic medium", () => {
    const bank = buildUtmCopyBank();
    const social = ["facebook", "instagram_bio", "instagram_story", "linkedin", "x", "threads"];
    for (const platform of social) {
      const link = bank.links.find((l) => l.platform === platform);
      expect(link?.utmParams.utm_medium).toBe("social_organic");
    }
  });

  it("safePostingDomain is askmagicmike.com", () => {
    const bank = buildUtmCopyBank();
    expect(bank.safePostingDomain).toBe("askmagicmike.com");
  });

  it("blockedDomain is ourtownproperties.com", () => {
    const bank = buildUtmCopyBank();
    expect(bank.blockedDomain).toBe("ourtownproperties.com");
  });

  it("has no outbound posting behavior — returns plain data only", () => {
    const bank = buildUtmCopyBank();
    const asMap = bank as unknown as Record<string, unknown>;
    const fnKeys = Object.keys(bank).filter((k) => typeof asMap[k] === "function");
    expect(fnKeys).toHaveLength(0);
  });
});
