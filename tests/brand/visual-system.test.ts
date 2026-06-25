import { describe, expect, it } from "vitest";
import {
  colors,
  shadows,
  borders,
  type as type_,
  surface,
  btn,
  badge,
  gradients,
  animDelay,
  isSocialSafeUrl,
  isCanonicalAmmUrl,
  getRejectedSocialDomains,
  sectionHeaderClasses,
  motionSafe,
  VISUAL_SYSTEM_VERSION,
} from "@/lib/brand/visual-system";

// ---------------------------------------------------------------------------
// Token exports — smoke tests to confirm the module is importable and shaped correctly
// ---------------------------------------------------------------------------

describe("visual-system > colors", () => {
  it("exports a colors object", () => {
    expect(typeof colors).toBe("object");
  });

  it("gold is the primary brand accent (#D4A017)", () => {
    expect(colors.gold).toBe("#D4A017");
  });

  it("ruby is the urgency accent (#C1272D)", () => {
    expect(colors.ruby).toBe("#C1272D");
  });

  it("pageBg is the base page color (#080806)", () => {
    expect(colors.pageBg).toBe("#080806");
  });

  it("cream is the warm heading text color (#F5F0E8)", () => {
    expect(colors.cream).toBe("#F5F0E8");
  });
});

describe("visual-system > shadows", () => {
  it("exports shadow tokens", () => {
    expect(typeof shadows.cardDeep).toBe("string");
    expect(typeof shadows.goldGlow).toBe("string");
    expect(typeof shadows.rubyGlow).toBe("string");
  });

  it("goldGlow references gold rgba", () => {
    expect(shadows.goldGlow).toContain("212,160,23");
  });
});

describe("visual-system > borders", () => {
  it("exports border tokens", () => {
    expect(typeof borders.subtleDark).toBe("string");
    expect(typeof borders.goldActive).toBe("string");
  });
});

describe("visual-system > type", () => {
  it("displayXl uses font-display (Playfair Display)", () => {
    expect(type_.displayXl).toContain("font-display");
  });

  it("metricXl uses font-bebas (Bebas Neue)", () => {
    expect(type_.metricXl).toContain("font-bebas");
  });

  it("kicker is uppercase gold tracking class", () => {
    expect(type_.kicker).toContain("text-gold-400");
    expect(type_.kicker).toContain("uppercase");
  });
});

describe("visual-system > surface", () => {
  it("card and cardLg are exported", () => {
    expect(typeof surface.card).toBe("string");
    expect(typeof surface.cardLg).toBe("string");
  });

  it("commandCard token is available for admin surfaces", () => {
    expect(typeof surface.commandCard).toBe("string");
  });
});

describe("visual-system > btn", () => {
  it("gold button uses bg-gold-400", () => {
    expect(btn.gold).toContain("bg-gold-400");
  });

  it("ruby button uses bg-ruby-400", () => {
    expect(btn.ruby).toContain("bg-ruby-400");
  });
});

describe("visual-system > badge", () => {
  it("gold badge uses text-gold-300", () => {
    expect(badge.gold).toContain("text-gold-300");
  });

  it("cyan badge is reserved for AI status (token exists)", () => {
    expect(typeof badge.cyan).toBe("string");
  });
});

describe("visual-system > gradients", () => {
  it("heroMesh gradient is a non-empty string", () => {
    expect(typeof gradients.heroMesh).toBe("string");
    expect(gradients.heroMesh.trim().length).toBeGreaterThan(10);
  });

  it("goldShimmer gradient references gold hex values", () => {
    expect(gradients.goldShimmer).toContain("D4A017");
  });
});

describe("visual-system > animDelay", () => {
  it("none is 0ms", () => {
    expect(animDelay.none).toBe("0ms");
  });

  it("all delay values are ms strings", () => {
    for (const val of Object.values(animDelay)) {
      expect(val).toMatch(/^\d+ms$/);
    }
  });
});

// ---------------------------------------------------------------------------
// isSocialSafeUrl
// ---------------------------------------------------------------------------

describe("visual-system > isSocialSafeUrl", () => {
  it("returns true for askmagicmike.com", () => {
    expect(isSocialSafeUrl("https://askmagicmike.com/ask")).toBe(true);
  });

  it("returns false for ourtownproperties.com (WAF blocks facebookexternalhit)", () => {
    expect(isSocialSafeUrl("https://www.ourtownproperties.com")).toBe(false);
  });

  it("returns false for vercel.app preview URLs", () => {
    expect(isSocialSafeUrl("https://ask-magic-mike.vercel.app")).toBe(false);
  });

  it("returns false for a malformed URL string", () => {
    expect(isSocialSafeUrl("not-a-url")).toBe(false);
  });

  it("returns true for an unrelated safe domain", () => {
    expect(isSocialSafeUrl("https://example.com")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isCanonicalAmmUrl
// ---------------------------------------------------------------------------

describe("visual-system > isCanonicalAmmUrl", () => {
  it("returns true for the canonical AMM domain", () => {
    expect(isCanonicalAmmUrl("https://askmagicmike.com")).toBe(true);
    expect(isCanonicalAmmUrl("https://askmagicmike.com/ask")).toBe(true);
  });

  it("returns false for vercel preview URLs", () => {
    expect(isCanonicalAmmUrl("https://ask-magic-mike.vercel.app")).toBe(false);
  });

  it("returns false for OTP domain", () => {
    expect(isCanonicalAmmUrl("https://www.ourtownproperties.com")).toBe(false);
  });

  it("returns false for malformed URL", () => {
    expect(isCanonicalAmmUrl("no-protocol")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRejectedSocialDomains
// ---------------------------------------------------------------------------

describe("visual-system > getRejectedSocialDomains", () => {
  it("returns a non-empty readonly array", () => {
    const domains = getRejectedSocialDomains();
    expect(Array.isArray(domains)).toBe(true);
    expect(domains.length).toBeGreaterThan(0);
  });

  it("includes ourtownproperties.com", () => {
    expect(getRejectedSocialDomains()).toContain("ourtownproperties.com");
  });

  it("includes vercel.app", () => {
    expect(getRejectedSocialDomains()).toContain("vercel.app");
  });
});

// ---------------------------------------------------------------------------
// sectionHeaderClasses
// ---------------------------------------------------------------------------

describe("visual-system > sectionHeaderClasses", () => {
  it("returns a string for default size (md)", () => {
    expect(typeof sectionHeaderClasses()).toBe("string");
    expect(sectionHeaderClasses()).toContain("uppercase");
  });

  it("returns different classes for sm vs lg", () => {
    expect(sectionHeaderClasses("sm")).not.toBe(sectionHeaderClasses("lg"));
  });

  it("always includes text-slate-500", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      expect(sectionHeaderClasses(size)).toContain("text-slate-500");
    }
  });
});

// ---------------------------------------------------------------------------
// motionSafe
// ---------------------------------------------------------------------------

describe("visual-system > motionSafe", () => {
  it("is a string containing motion-reduce", () => {
    expect(typeof motionSafe).toBe("string");
    expect(motionSafe).toContain("motion-reduce");
  });
});

// ---------------------------------------------------------------------------
// VISUAL_SYSTEM_VERSION
// ---------------------------------------------------------------------------

describe("visual-system > VISUAL_SYSTEM_VERSION", () => {
  it("is a semver string", () => {
    expect(VISUAL_SYSTEM_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
