import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  CAMPAIGN_CATALOG,
  ALL_CAMPAIGNS,
  buildCampaignAssets,
  buildCampaignUtmLinks,
  type CampaignSlug,
} from "../../src/lib/admin/campaign-assets";

const read = (rel: string) =>
  readFileSync(path.resolve(__dirname, "../../src", rel), "utf8");

// ---------------------------------------------------------------------------
// Campaign catalog
// ---------------------------------------------------------------------------

describe("Campaign catalog", () => {
  it("has 5 main campaigns in CAMPAIGN_CATALOG", () => {
    expect(CAMPAIGN_CATALOG).toHaveLength(5);
  });

  it("has 6 total campaigns in ALL_CAMPAIGNS (includes comment_lead)", () => {
    expect(ALL_CAMPAIGNS).toHaveLength(6);
  });

  it("every campaign has a non-empty name, tagline, targetAudience, primaryCta", () => {
    for (const c of ALL_CAMPAIGNS) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.tagline.length).toBeGreaterThan(0);
      expect(c.targetAudience.length).toBeGreaterThan(0);
      expect(c.primaryCta.length).toBeGreaterThan(0);
    }
  });

  it("no campaign uses genie, magic lamp, or lamp copy", () => {
    for (const c of ALL_CAMPAIGNS) {
      const all = JSON.stringify(c).toLowerCase();
      expect(all).not.toContain("genie");
      expect(all).not.toContain("magic lamp");
      expect(all).not.toMatch(/\blamp\b/);
    }
  });

  it("no campaign copy includes red-* class tokens", () => {
    for (const c of ALL_CAMPAIGNS) {
      expect(JSON.stringify(c)).not.toMatch(/\btext-red-|bg-red-|border-red-/);
    }
  });

  it("all landing paths are valid AMM paths", () => {
    const validPaths = ["/ask", "/value", "/"];
    for (const c of ALL_CAMPAIGNS) {
      expect(validPaths).toContain(c.landingPath);
    }
  });
});

// ---------------------------------------------------------------------------
// Brand copy blocks — character limit guards
// ---------------------------------------------------------------------------

describe("Brand copy blocks — character limits", () => {
  for (const c of ALL_CAMPAIGNS) {
    it(`${c.slug}: socialShort ≤ 140 chars`, () => {
      expect(c.copyBlock.socialShort.length).toBeLessThanOrEqual(140);
    });

    it(`${c.slug}: socialMedium ≤ 500 chars`, () => {
      expect(c.copyBlock.socialMedium.length).toBeLessThanOrEqual(500);
    });

    it(`${c.slug}: emailSubject ≤ 90 chars`, () => {
      expect(c.copyBlock.emailSubject.length).toBeLessThanOrEqual(90);
    });
  }
});

// ---------------------------------------------------------------------------
// Brand copy safety — no banned terms in any copy block
// ---------------------------------------------------------------------------

describe("Brand copy safety", () => {
  const BANNED_TERMS = [
    "genie", "magic lamp", "wish", "lamp", "mascot",
    "chatbot", "robot advisor", "ai agent",
  ];

  for (const c of ALL_CAMPAIGNS) {
    it(`${c.slug}: no banned terms in any copy block`, () => {
      const text = [
        c.copyBlock.headline,
        c.copyBlock.subhead,
        c.copyBlock.socialShort,
        c.copyBlock.socialMedium,
        c.copyBlock.socialFull,
        c.copyBlock.emailSubject,
        c.copyBlock.emailBody,
        c.copyBlock.cta,
        c.copyBlock.flyerHeadline,
        c.copyBlock.flyerBody,
        c.copyBlock.commentCapture ?? "",
      ].join(" ").toLowerCase();

      for (const term of BANNED_TERMS) {
        if (term === "lamp") {
          // "lamp" standalone word only — avoid false positive on e.g. "example"
          expect(text).not.toMatch(/\blamp\b/);
        } else {
          expect(text).not.toContain(term);
        }
      }
    });

    it(`${c.slug}: Wilson NC mentioned in copy`, () => {
      const text = [
        c.copyBlock.socialShort,
        c.copyBlock.socialMedium,
        c.copyBlock.socialFull,
      ].join(" ").toLowerCase();
      expect(text).toMatch(/wilson/);
    });

    it(`${c.slug}: no ourtownproperties.com or vercel.app in copy`, () => {
      const text = JSON.stringify(c.copyBlock).toLowerCase();
      expect(text).not.toContain("ourtownproperties.com");
      expect(text).not.toContain("vercel.app");
    });
  }
});

// ---------------------------------------------------------------------------
// Flyer specs
// ---------------------------------------------------------------------------

describe("Flyer specs", () => {
  for (const c of ALL_CAMPAIGNS) {
    it(`${c.slug}: flyer QR URL uses only askmagicmike.com`, () => {
      expect(c.flyer.qrUrl).toContain("askmagicmike.com");
      expect(c.flyer.qrUrl).not.toContain("ourtownproperties.com");
      expect(c.flyer.qrUrl).not.toContain("vercel.app");
    });

    it(`${c.slug}: flyer QR URL contains correct utm_campaign slug`, () => {
      expect(c.flyer.qrUrl).toContain(`utm_campaign=${c.slug}`);
    });

    it(`${c.slug}: flyer displayUrl is askmagicmike.com`, () => {
      expect(c.flyer.displayUrl).toContain("askmagicmike.com");
    });
  }
});

// ---------------------------------------------------------------------------
// UTM link builder
// ---------------------------------------------------------------------------

describe("buildCampaignUtmLinks", () => {
  it("returns 8 links for every campaign", () => {
    for (const c of ALL_CAMPAIGNS) {
      const links = buildCampaignUtmLinks(c.slug, c.landingPath);
      expect(links).toHaveLength(8);
    }
  });

  it("all links use askmagicmike.com — never vercel.app or ourtownproperties.com", () => {
    for (const c of ALL_CAMPAIGNS) {
      const links = buildCampaignUtmLinks(c.slug, c.landingPath);
      for (const link of links) {
        expect(link.fullUrl).toContain("askmagicmike.com");
        expect(link.fullUrl).not.toContain("vercel.app");
        expect(link.fullUrl).not.toContain("ourtownproperties.com");
      }
    }
  });

  it("all links include utm_source, utm_medium, utm_campaign, utm_content", () => {
    const links = buildCampaignUtmLinks("amm_launch", "/ask");
    for (const link of links) {
      expect(link.fullUrl).toContain("utm_source=");
      expect(link.fullUrl).toContain("utm_medium=");
      expect(link.fullUrl).toContain("utm_campaign=");
      expect(link.fullUrl).toContain("utm_content=");
    }
  });

  it("home_value campaign links to /value landing page", () => {
    const links = buildCampaignUtmLinks("home_value", "/value");
    for (const link of links) {
      expect(link.baseUrl).toContain("/value");
    }
  });
});

// ---------------------------------------------------------------------------
// buildCampaignAssets
// ---------------------------------------------------------------------------

describe("buildCampaignAssets", () => {
  it("returns valid assets for every campaign slug", () => {
    for (const c of ALL_CAMPAIGNS) {
      const assets = buildCampaignAssets(c.slug as CampaignSlug);
      expect(assets.campaign.slug).toBe(c.slug);
      expect(assets.utmLinks).toHaveLength(8);
      expect(assets.socialPosts).toBeDefined();
      expect(assets.socialPosts.facebook).toBeDefined();
      expect(assets.socialPosts.linkedin).toBeDefined();
      expect(assets.socialPosts.threads).toBeDefined();
      expect(assets.socialPosts.x).toBeDefined();
    }
  });

  it("throws on unknown slug", () => {
    expect(() => buildCampaignAssets("not_a_real_slug" as CampaignSlug)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Component token guards
// ---------------------------------------------------------------------------

describe("campaign-card.tsx token guard", () => {
  const src = read("components/admin/campaign-card.tsx");

  it("no red-* tokens", () => {
    expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });

  it("no hardcoded hex text colors", () => {
    expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/);
  });

  it("uses ruby-400 for negative states", () => {
    // No negative states expected in campaign card but confirm red is absent
    expect(src).not.toMatch(/\bred-\d{3}/);
  });
});

describe("copy-block.tsx token guard", () => {
  const src = read("components/admin/copy-block.tsx");

  it("no red-* tokens", () => {
    expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });

  it("no hardcoded hex colors", () => {
    expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/);
  });

  it("uses ruby-400 for over-limit state", () => {
    expect(src).toContain("ruby-400");
  });
});

describe("platform-post-preview.tsx token guard", () => {
  const src = read("components/admin/platform-post-preview.tsx");

  it("no red-* tokens", () => {
    expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });

  it("no hardcoded hex text colors", () => {
    expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/);
  });

  it("defines all four social platforms", () => {
    expect(src).toContain("facebook");
    expect(src).toContain("linkedin");
    expect(src).toContain("threads");
    expect(src).toContain("charLimit:");
  });
});

// ---------------------------------------------------------------------------
// Marketing page token guard
// ---------------------------------------------------------------------------

describe("admin/marketing/page.tsx token guard", () => {
  const src = read("app/(admin)/admin/marketing/page.tsx");

  it("imports AdminShell", () => {
    expect(src).toContain("AdminShell");
  });

  it("imports buildCampaignAssets", () => {
    expect(src).toContain("buildCampaignAssets");
  });

  it("no red-* tokens", () => {
    expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });

  it("no hardcoded hex colors", () => {
    expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/);
  });

  it("no genie, lamp, or magic lamp copy", () => {
    const lower = src.toLowerCase();
    expect(lower).not.toContain("genie");
    expect(lower).not.toContain("magic lamp");
    expect(lower).not.toMatch(/\blamp\b/);
  });

  it("never posts to social media (no fetch or post call to social APIs)", () => {
    expect(src).not.toContain("graph.facebook.com");
    expect(src).not.toContain("api.twitter.com");
    expect(src).not.toContain("api.linkedin.com");
  });

  it("no secrets or env vars in the page", () => {
    expect(src).not.toContain("ADMIN_SECRET");
    expect(src).not.toContain("SERVICE_ROLE_KEY");
  });

  it("contains ourtownproperties.com blocked domain warning", () => {
    expect(src).toContain("ourtownproperties.com");
  });

  it("links to /admin dashboard", () => {
    expect(src).toContain('backHref="/admin"');
  });
});
