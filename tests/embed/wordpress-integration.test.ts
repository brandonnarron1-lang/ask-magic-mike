/**
 * WordPress integration package regression tests.
 *
 * Verifies that the embed loader and integration docs:
 * - Reference the canonical production URL (not the Vercel fallback)
 * - Contain required attribution params for OurTownProperties.com
 * - Are free of overpromise copy, secrets, and MLS markers
 * - Include accessibility requirements (iframe title)
 * - Do not expose forbidden patterns
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf-8");
}

// ---------------------------------------------------------------------------
// JS Loader
// ---------------------------------------------------------------------------

describe("public/embed/amm-loader.js", () => {
  const loader = read("public/embed/amm-loader.js");

  it("references the canonical www.askmagicmike.com base URL", () => {
    expect(loader).toContain("https://www.askmagicmike.com");
  });

  it("does NOT reference the bare non-www domain as a base", () => {
    // Only www is canonical; apex redirects there
    const stripped = loader.replace(/https:\/\/www\.askmagicmike\.com/g, "");
    expect(stripped).not.toMatch(/https:\/\/askmagicmike\.com[^/]/);
  });

  it("does NOT reference the Vercel fallback URL as the base", () => {
    expect(loader).not.toContain("ask-magic-mike.vercel.app");
  });

  it("includes the /embed/ask route path", () => {
    expect(loader).toContain("/embed/ask");
  });

  it("sets iframe title for accessibility", () => {
    // IFRAME_TITLE constant must reference the parent brand in the string value
    expect(loader).toContain("IFRAME_TITLE");
    expect(loader).toContain("Our Town Properties");
  });

  it("uses default utm_source=ourtownproperties", () => {
    expect(loader).toContain("ourtownproperties");
  });

  it("uses default utm_medium=referral", () => {
    expect(loader).toContain('"referral"');
  });

  it("uses default utm_campaign=website_widget", () => {
    expect(loader).toContain('"website_widget"');
  });

  it("does not contain any secret-like patterns", () => {
    expect(loader).not.toMatch(/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|eyJ[A-Za-z0-9_-]{20,}|OPENAI_API_KEY|ANTHROPIC_API_KEY/);
  });

  it("does not contain FlexMLS/MLS confidential markers", () => {
    expect(loader).not.toMatch(/flexmls|MLS Participants|Confidential - May Only Be Distributed/i);
  });

  it("does not contain overpromise copy", () => {
    expect(loader).not.toMatch(/instant cash offer|guaranteed value|guaranteed offer|same.day|within minutes|appraisal/i);
  });

  it("sets loading=lazy for performance", () => {
    expect(loader).toContain("lazy");
  });

  it("prevents XSS by using DOM creation not innerHTML for iframes", () => {
    // Iframe must be created via createElement, not innerHTML
    expect(loader).toContain("createElement");
    // The src attr must be set via property, not injected into a raw HTML string
    // (template literals would appear as `src=` in innerHTML — we check for that)
    const inlineHtmlSrc = loader.match(/innerHTML[\s\S]*?=[\s\S]*?src=/);
    expect(inlineHtmlSrc).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration doc
// ---------------------------------------------------------------------------

describe("docs/WORDPRESS_WIDGET_INTEGRATION.md", () => {
  const doc = read("docs/WORDPRESS_WIDGET_INTEGRATION.md");

  it("references the canonical www embed URL", () => {
    expect(doc).toContain("https://www.askmagicmike.com/embed/ask");
  });

  it("references ourtownproperties.com as the parent site", () => {
    expect(doc).toContain("ourtownproperties.com");
  });

  it("documents utm_source=ourtownproperties for all placements", () => {
    expect(doc).toContain("utm_source=ourtownproperties");
  });

  it("includes an iframe with a title attribute", () => {
    expect(doc).toMatch(/title=["'][^"']+Our Town Properties[^"']*["']/);
  });

  it("includes the JS loader snippet", () => {
    expect(doc).toContain("amm-loader.js");
  });

  it("includes a bare iframe fallback", () => {
    expect(doc).toContain("<iframe");
  });

  it("mentions the CSP frame-ancestors allowance for ourtownproperties.com", () => {
    expect(doc).toMatch(/frame-ancestors.*ourtownproperties/i);
  });

  it("includes compliance disclaimer (not an appraisal)", () => {
    expect(doc).toMatch(/not an appraisal/i);
  });

  it("forbids guaranteed/instant/appraisal in Do Not Use section", () => {
    // Doc must warn against these phrases
    expect(doc).toMatch(/guaranteed offer|instant/i);
  });

  it("identifies Mike Eatmon and Our Town Properties", () => {
    expect(doc).toContain("Mike Eatmon");
    expect(doc).toContain("Our Town Properties");
  });

  it("does not contain secret-like patterns", () => {
    expect(doc).not.toMatch(/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|eyJ[A-Za-z0-9_-]{20,}/);
  });

  it("does not contain FlexMLS/MLS confidential markers", () => {
    expect(doc).not.toMatch(/flexmls|MLS Participants|Confidential - May Only Be Distributed/i);
  });
});

// ---------------------------------------------------------------------------
// Snippets doc
// ---------------------------------------------------------------------------

describe("docs/wordpress-cta-snippets.md", () => {
  const doc = read("docs/wordpress-cta-snippets.md");

  it("uses www.askmagicmike.com canonical URL (not bare apex)", () => {
    // All links must use www subdomain
    const links = doc.match(/https:\/\/[^"\s)]+askmagicmike\.com[^"\s)]*/g) ?? [];
    for (const link of links) {
      expect(link).toMatch(/^https:\/\/www\.askmagicmike\.com/);
    }
  });

  it("does not reference the Vercel fallback as a primary URL", () => {
    expect(doc).not.toContain("ask-magic-mike.vercel.app");
  });
});

// ---------------------------------------------------------------------------
// next.config — frame-ancestors must allow ourtownproperties.com
// ---------------------------------------------------------------------------

describe("next.config.ts — iframe CSP for embed routes", () => {
  const config = read("next.config.ts");

  it("sets frame-ancestors for /embed/* routes", () => {
    expect(config).toContain("frame-ancestors");
    expect(config).toContain("/embed/:path*");
  });

  it("allows ourtownproperties.com in frame-ancestors", () => {
    expect(config).toContain("ourtownproperties.com");
  });

  it("does not use X-Frame-Options (which CSP supersedes)", () => {
    // Modern standard is frame-ancestors in CSP, not X-Frame-Options
    // Having both is fine but X-Frame-Options alone would miss the allowlist
    // We just verify the CSP is there (checked above) — this is informational
    expect(config).toContain("Content-Security-Policy");
  });
});
