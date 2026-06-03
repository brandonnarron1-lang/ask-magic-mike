import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..");

function readSource(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/**
 * JSX wraps long string literals across lines and inserts whitespace. Collapse
 * all whitespace so phrase matches don't depend on formatting.
 */
function normalize(source: string): string {
  return source.replace(/\s+/g, " ");
}

const FORBIDDEN_PHRASES = [
  /\bappraisal\b/i,
  /\bguaranteed value\b/i,
  /\bguaranteed offer\b/i,
  /\bbinding offer\b/i,
  /\bbinding cash offer\b/i,
  /\binstant cash offer\b/i,
];

const ALLOWED_APPRAISAL_NEGATIONS = [
  /not an appraisal/i,
  /is not an appraisal/i,
];

function stripAllowedAppraisalContext(source: string): string {
  let cleaned = source;
  for (const allow of ALLOWED_APPRAISAL_NEGATIONS) {
    cleaned = cleaned.replace(new RegExp(allow, "gi"), "");
  }
  return cleaned;
}

describe("/value compliance copy", () => {
  const valueHero = normalize(readSource("src/components/campaign/value-hero.tsx"));
  const valuePage = normalize(readSource("src/app/(campaign)/value/page.tsx"));

  it("includes the Our Town disclosure text", () => {
    expect(valueHero).toContain("Ask Magic Mike by Our Town Properties");
    expect(valueHero).toContain("not an appraisal");
    expect(valueHero).toContain("does not create an agency relationship");
    expect(valueHero).toContain("written brokerage agreement");
  });

  it("references local guidance language, not guarantees", () => {
    expect(valueHero).toContain("local guidance");
    expect(valueHero).toContain("preliminary home value range");
  });

  it("does not use disallowed valuation/offer language", () => {
    const cleanedHero = stripAllowedAppraisalContext(valueHero);
    const cleanedPage = stripAllowedAppraisalContext(valuePage);
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(cleanedHero).not.toMatch(phrase);
      expect(cleanedPage).not.toMatch(phrase);
    }
  });

  it("metadata description avoids claiming a guaranteed valuation", () => {
    expect(valuePage).not.toMatch(/guaranteed/i);
    expect(valuePage).not.toMatch(/instant cash offer/i);
  });
});

describe("intake confirmation compliance copy", () => {
  const confirmation = normalize(
    readSource("src/components/intake/step-confirmation.tsx")
  );

  it("includes the Our Town follow-up disclosure", () => {
    expect(confirmation).toContain("Our Town Properties");
    expect(confirmation).toContain("preliminary");
    expect(confirmation).toContain("not an appraisal");
    expect(confirmation).toContain("agency relationship");
  });

  it("does not promise a guaranteed value or binding offer", () => {
    const cleaned = stripAllowedAppraisalContext(confirmation);
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(cleaned).not.toMatch(phrase);
    }
  });
});
