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

const complianceFooter = normalize(
  readSource("src/components/amm/compliance-footer.tsx")
);

describe("ComplianceFooter shared copy", () => {
  it("contains the canonical disclosure", () => {
    expect(complianceFooter).toContain(
      "Ask Magic Mike by Our Town Properties, Inc."
    );
    expect(complianceFooter).toContain("local guidance");
    expect(complianceFooter).toContain("preliminary home value range");
    expect(complianceFooter).toContain("not an appraisal");
    expect(complianceFooter).toContain(
      "does not create an agency relationship"
    );
    expect(complianceFooter).toContain("written brokerage agreement");
  });

  it("does not introduce disallowed language", () => {
    const cleaned = stripAllowedAppraisalContext(complianceFooter);
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(cleaned).not.toMatch(phrase);
    }
  });
});

describe("/value page", () => {
  const valueHero = normalize(readSource("src/components/campaign/value-hero.tsx"));
  const valuePage = normalize(readSource("src/app/(campaign)/value/page.tsx"));

  it("uses the shared ComplianceFooter for disclosure", () => {
    expect(valueHero).toContain("ComplianceFooter");
    expect(valueHero).toMatch(/testId="value-disclosure"/);
  });

  it("ships the campaign primary CTA copy", () => {
    expect(valueHero).toContain("Start With Your Address");
    expect(valueHero).toContain("Rub the lamp");
    expect(valueHero).toContain("Wilson-area home");
  });

  it("keeps the Ask Magic Mike lockup", () => {
    expect(valueHero).toContain("AmmLockup");
  });

  it("renders the trust bullets", () => {
    expect(valueHero).toContain("Local guidance");
    expect(valueHero).toContain("Preliminary home value range");
    expect(valueHero).toContain("Mike follows up");
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

  it("uses the shared ComplianceFooter and success lead", () => {
    expect(confirmation).toContain("ComplianceFooter");
    expect(confirmation).toContain("Your request is in");
    expect(confirmation).toContain("Our Town Properties");
  });

  it("does not promise a guaranteed value or binding offer", () => {
    const cleaned = stripAllowedAppraisalContext(confirmation);
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(cleaned).not.toMatch(phrase);
    }
  });
});
