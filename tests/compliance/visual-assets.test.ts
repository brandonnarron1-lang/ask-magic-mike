import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..");

function readSource(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

// ─── Asset files exist ────────────────────────────────────────────────────────

describe("Black Diamond visual assets — files present", () => {
  const REQUIRED_ASSETS = [
    "public/assets/black-diamond/hero-cinematic.svg",
    "public/assets/black-diamond/ask-interface.svg",
    "public/assets/black-diamond/value-funnel.svg",
    "public/assets/black-diamond/distribution-network.svg",
    "public/assets/black-diamond/campaign-generator.svg",
    "public/assets/black-diamond/admin-command.svg",
  ];

  for (const asset of REQUIRED_ASSETS) {
    it(`asset exists: ${asset}`, () => {
      expect(existsSync(join(repoRoot, asset))).toBe(true);
    });
  }
});

// ─── SVG assets are valid ─────────────────────────────────────────────────────

describe("Black Diamond visual assets — SVG integrity", () => {
  const SVG_FILES = [
    "public/assets/black-diamond/hero-cinematic.svg",
    "public/assets/black-diamond/ask-interface.svg",
    "public/assets/black-diamond/value-funnel.svg",
    "public/assets/black-diamond/distribution-network.svg",
    "public/assets/black-diamond/campaign-generator.svg",
    "public/assets/black-diamond/admin-command.svg",
  ];

  for (const file of SVG_FILES) {
    it(`${file} — is valid SVG with viewBox`, () => {
      const content = readSource(file);
      expect(content).toContain("<svg");
      expect(content).toContain("viewBox");
      expect(content).toContain("</svg>");
    });

    it(`${file} — uses black base (#080806)`, () => {
      const content = readSource(file);
      expect(content).toContain("#080806");
    });

    it(`${file} — contains gold color (#D4A017)`, () => {
      const content = readSource(file);
      expect(content).toContain("#D4A017");
    });

    it(`${file} — has preserveAspectRatio for CSS background-size`, () => {
      const content = readSource(file);
      expect(content).toContain("preserveAspectRatio");
    });

    it(`${file} — does not contain baked-in text`, () => {
      const content = readSource(file);
      // No <text> elements — text must be in HTML overlay
      expect(content).not.toMatch(/<text[^>]*>[^<]+<\/text>/);
    });
  }
});

// ─── CinematicBg component structure ─────────────────────────────────────────

describe("CinematicBg component — structure", () => {
  const comp = readSource("src/components/amm/cinematic-bg.tsx");

  it("exports CinematicBg", () => {
    expect(comp).toContain("export function CinematicBg");
  });

  it("accepts src prop", () => {
    expect(comp).toContain("src:");
  });

  it("accepts overlayOpacity prop", () => {
    expect(comp).toContain("overlayOpacity");
  });

  it("is aria-hidden (decorative)", () => {
    expect(comp).toContain('aria-hidden="true"');
  });

  it("uses CSS background-image (not Next/Image) — avoids SVG dangerously flag", () => {
    expect(comp).toContain("backgroundImage");
    expect(comp).not.toContain("dangerouslyAllowSVG");
  });

  it("has readability overlay for text legibility", () => {
    expect(comp).toContain("overlayOpacity");
    expect(comp).toContain("rgba(8,8,6,");
  });

  it("does not contain pointer-events (non-interactive)", () => {
    expect(comp).toContain("pointer-events-none");
  });
});

// ─── BrandShell accepts cinematicSrc ─────────────────────────────────────────

describe("BrandShell — cinematicSrc prop integration", () => {
  const shell = readSource("src/components/amm/brand-shell.tsx");

  it("imports CinematicBg", () => {
    expect(shell).toContain("CinematicBg");
    expect(shell).toContain("cinematic-bg");
  });

  it("exposes cinematicSrc prop", () => {
    expect(shell).toContain("cinematicSrc");
  });

  it("exposes cinematicOverlay prop", () => {
    expect(shell).toContain("cinematicOverlay");
  });

  it("renders CinematicBg when cinematicSrc provided", () => {
    expect(shell).toContain("cinematicSrc && (");
  });
});

// ─── Pages wire correct assets ────────────────────────────────────────────────

describe("Public pages — cinematic background wiring", () => {
  it("homepage (HeroSection) uses hero-cinematic asset", () => {
    const hero = readSource("src/components/landing/hero-section.tsx");
    expect(hero).toContain("hero-cinematic");
    expect(hero).toContain("CinematicBg");
  });

  it("value page (ValueHero) uses value-funnel asset", () => {
    const value = readSource("src/components/campaign/value-hero.tsx");
    expect(value).toContain("value-funnel");
    expect(value).toContain("cinematicSrc");
  });

  it("distribution page uses distribution-network asset", () => {
    const dist = readSource("src/app/(campaign)/distribution/page.tsx");
    expect(dist).toContain("distribution-network");
    expect(dist).toContain("cinematicSrc");
  });

  it("campaigns page uses campaign-generator asset", () => {
    const camp = readSource("src/app/(campaign)/campaigns/page.tsx");
    expect(camp).toContain("campaign-generator");
    expect(camp).toContain("cinematicSrc");
  });
});

// ─── Asset paths use /assets/black-diamond prefix (no stale Vercel URLs) ─────

describe("Visual asset paths — no stale or unsafe URLs", () => {
  const WIRED_FILES = [
    "src/components/landing/hero-section.tsx",
    "src/components/campaign/value-hero.tsx",
    "src/app/(campaign)/distribution/page.tsx",
    "src/app/(campaign)/campaigns/page.tsx",
    "src/components/amm/cinematic-bg.tsx",
  ];

  for (const file of WIRED_FILES) {
    it(`${file} — no stale Vercel preview URL`, () => {
      const content = readSource(file);
      expect(content).not.toMatch(/https?:\/\/[a-z0-9-]+\.vercel\.app/);
    });
  }

  it("CinematicBg does not hard-code any specific asset path (stays generic)", () => {
    const comp = readSource("src/components/amm/cinematic-bg.tsx");
    expect(comp).not.toContain("/assets/black-diamond/");
  });
});

// ─── Compliance — no fake AI or appraisal claims in new components ────────────

describe("Visual assets compliance — no prohibited claims", () => {
  const NEW_FILES = [
    "src/components/amm/cinematic-bg.tsx",
    "src/components/amm/brand-shell.tsx",
    "public/assets/black-diamond/hero-cinematic.svg",
    "public/assets/black-diamond/value-funnel.svg",
    "public/assets/black-diamond/distribution-network.svg",
    "public/assets/black-diamond/campaign-generator.svg",
  ];

  for (const file of NEW_FILES) {
    it(`${file} — no fake appraisal claims`, () => {
      const content = readSource(file);
      expect(content).not.toMatch(/certified appraisal|instant appraisal/i);
    });

    it(`${file} — no guaranteed price claims`, () => {
      const content = readSource(file);
      expect(content).not.toMatch(/guaranteed (sale )?price/i);
    });

    it(`${file} — no public secret markers`, () => {
      const content = readSource(file);
      expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE|ADMIN_REPORT_SECRET/);
    });
  }
});

// ─── Asset map doc exists ────────────────────────────────────────────────────

describe("Asset map documentation", () => {
  it("docs/BLACK_DIAMOND_ASSET_MAP.md exists", () => {
    expect(existsSync(join(repoRoot, "docs/BLACK_DIAMOND_ASSET_MAP.md"))).toBe(true);
  });

  it("asset map covers all 6 core assets", () => {
    const doc = readSource("docs/BLACK_DIAMOND_ASSET_MAP.md");
    expect(doc).toContain("hero-cinematic");
    expect(doc).toContain("ask-interface");
    expect(doc).toContain("value-funnel");
    expect(doc).toContain("distribution-network");
    expect(doc).toContain("campaign-generator");
    expect(doc).toContain("admin-command");
  });

  it("asset map documents generation prompts", () => {
    const doc = readSource("docs/BLACK_DIAMOND_ASSET_MAP.md");
    expect(doc).toMatch(/generation prompt/i);
  });

  it("asset map documents fallback behavior", () => {
    const doc = readSource("docs/BLACK_DIAMOND_ASSET_MAP.md");
    expect(doc).toMatch(/fallback/i);
  });
});
