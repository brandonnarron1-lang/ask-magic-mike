/**
 * LC-1 Visual Token Compliance Tests
 *
 * Guards against:
 * 1. Forbidden red-* Tailwind tokens in landing/funnel components
 * 2. Vercel preview URLs in public-facing copy
 * 3. Concept-only expression assets used in production surfaces
 * 4. Missing brand asset registry entries
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";

const repoRoot = join(__dirname, "..", "..");

function readSrc(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function collectTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectTsx(full, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Public-facing source files (landing + funnel). Admin files are excluded. */
const PUBLIC_SURFACES = [
  "src/app/page.tsx",
  "src/app/(campaign)/value/page.tsx",
  "src/components/landing",
  "src/components/campaign",
  "src/components/amm",
].flatMap((p) => {
  const abs = join(repoRoot, p);
  try {
    const st = statSync(abs);
    if (st.isDirectory()) return collectTsx(abs);
    return [abs];
  } catch {
    return [];
  }
});

// ---------------------------------------------------------------------------
// Forbidden red-* Tailwind tokens
// ---------------------------------------------------------------------------

const RED_TOKEN_PATTERN = /\b(text|bg|border|ring|from|to|via)-red-\d{2,3}\b/g;

describe("LC-1 visual tokens > no forbidden red-* tokens in public surfaces", () => {
  it("finds no red-NNN Tailwind classes in landing or funnel TSX", () => {
    const violations: string[] = [];
    for (const filePath of PUBLIC_SURFACES) {
      const src = readFileSync(filePath, "utf8");
      const matches = src.match(RED_TOKEN_PATTERN);
      if (matches) {
        const rel = filePath.replace(repoRoot + "/", "");
        violations.push(`${rel}: ${[...new Set(matches)].join(", ")}`);
      }
    }
    expect(violations, `Forbidden red-* tokens found:\n${violations.join("\n")}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// No Vercel preview URLs in public copy
// ---------------------------------------------------------------------------

const VERCEL_PREVIEW_PATTERN = /https?:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app/g;

describe("LC-1 visual tokens > no vercel.app preview URLs in public surfaces", () => {
  it("finds no raw vercel.app preview URLs in landing/funnel source", () => {
    const violations: string[] = [];
    for (const filePath of PUBLIC_SURFACES) {
      const src = readFileSync(filePath, "utf8");
      const matches = src.match(VERCEL_PREVIEW_PATTERN);
      if (matches) {
        const rel = filePath.replace(repoRoot + "/", "");
        violations.push(`${rel}: ${matches[0]}`);
      }
    }
    expect(violations, `Vercel preview URLs in public copy:\n${violations.join("\n")}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Concept-only expression assets not used in production surfaces
// ---------------------------------------------------------------------------

const CONCEPT_ASSET_PATHS = [
  brandPackAssets.expressions.thinkingHandsConcept,
  brandPackAssets.actions.answerAppearsConcept,
];

// The only surfaces permitted to render concept assets
const CONCEPT_ALLOWED_SURFACES = ["widget-preview", "brand-pack-assets.ts", "brand-kit-showcase"];

describe("LC-1 visual tokens > concept expression assets restricted to BrandKitShowcase", () => {
  it("concept assets are not referenced in production surfaces", () => {
    const violations: string[] = [];
    for (const filePath of PUBLIC_SURFACES) {
      // Skip allowed surfaces (the widget preview page and the registry itself)
      if (CONCEPT_ALLOWED_SURFACES.some((allowed) => filePath.includes(allowed))) continue;
      const src = readFileSync(filePath, "utf8");
      for (const assetPath of CONCEPT_ASSET_PATHS) {
        if (src.includes(assetPath)) {
          const rel = filePath.replace(repoRoot + "/", "");
          violations.push(`${rel} references concept-only asset: ${assetPath}`);
        }
      }
    }
    expect(violations, `Concept assets in production surfaces:\n${violations.join("\n")}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Brand asset registry completeness
// ---------------------------------------------------------------------------

describe("LC-1 visual tokens > brand asset registry entries exist on disk", () => {
  const CRITICAL_ASSETS = [
    brandPackAssets.mike.headshot,
    brandPackAssets.mike.heroCloseup,
    brandPackAssets.mike.avatar128,
    brandPackAssets.logo.primary,
    brandPackAssets.accents.sparkle,
    brandPackAssets.accents.smokeGlow,
    brandPackAssets.accents.goldArrow,
    brandPackAssets.expressions.thinkingChin,
    brandPackAssets.expressions.explaining,
    brandPackAssets.expressions.confident,
    brandPackAssets.actions.explaining,
  ];

  for (const assetPath of CRITICAL_ASSETS) {
    it(`asset exists on disk: ${assetPath.split("/").pop()}`, () => {
      const { existsSync } = require("node:fs");
      const abs = join(repoRoot, "public", assetPath.replace(/^\//, ""));
      expect(existsSync(abs), `Missing: ${assetPath}`).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// globals.css must define the delay-250 utility class (LC-1 addition)
// ---------------------------------------------------------------------------

describe("LC-1 visual tokens > globals.css contains LC-1 delay utility", () => {
  it("delay-250 animation-delay utility is defined", () => {
    const css = readSrc("src/app/globals.css");
    expect(css).toContain("delay-250");
  });
});
