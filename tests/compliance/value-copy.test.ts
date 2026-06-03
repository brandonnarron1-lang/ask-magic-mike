import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
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
  /rub the lamp/i,
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

/** Recursively collect all .ts/.tsx files under a directory. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
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

describe("/value page — professional trust-first copy", () => {
  const valueHero = normalize(
    readSource("src/components/campaign/value-hero.tsx")
  );
  const mikeTrustCard = normalize(
    readSource("src/components/amm/mike-trust-card.tsx")
  );
  const brandHeader = normalize(
    readSource("src/components/amm/brand-header.tsx")
  );

  it("ships the new trust-first headline and subheadline", () => {
    expect(valueHero).toContain("Start with your address.");
    expect(valueHero).toContain("Get a local read on your home.");
    expect(valueHero).toContain(
      "Ask Magic Mike helps Wilson-area homeowners"
    );
    expect(valueHero).toContain("preliminary home value range");
  });

  it("uses the eyebrow and CTA copy", () => {
    expect(valueHero).toContain("Ask Magic Mike by Our Town Properties");
    expect(valueHero).toContain("Start With Your Address");
  });

  it("renders the three secondary options", () => {
    expect(valueHero).toContain("Compare selling options");
    expect(valueHero).toContain("Request direct-purchase review");
    expect(valueHero).toContain("Ask Mike a question");
  });

  it("uses the AI-assist micro-positioning", () => {
    expect(valueHero).toContain("AI-assisted intake. Local human follow-up.");
  });

  it("composes the MikeTrustCard and BrandHeader", () => {
    expect(valueHero).toContain("MikeTrustCard");
    expect(valueHero).toContain("BrandHeader");
  });

  it("renders Mike + Our Town credentials inside the trust card", () => {
    expect(mikeTrustCard).toContain("Mike Eatmon");
    expect(mikeTrustCard).toContain("Our Town Properties, Inc.");
    expect(mikeTrustCard).toContain("Licensed in North Carolina");
    expect(mikeTrustCard).toContain("Wilson, NC");
    expect(mikeTrustCard).toContain("Selling real estate since 1993");
  });

  it("uses the real headshot and the official Our Town logo", () => {
    expect(mikeTrustCard).toContain(
      "/images/ask-magic-mike/mike-eatmon-headshot.png"
    );
    expect(brandHeader).toContain(
      "/images/ask-magic-mike/our-town-properties-logo.png"
    );
  });

  it("uses the shared ComplianceFooter for the disclosure", () => {
    expect(valueHero).toContain("ComplianceFooter");
    expect(valueHero).toMatch(/testId="value-disclosure"/);
  });
});

describe("intake confirmation — trust-first success state", () => {
  const confirmation = normalize(
    readSource("src/components/intake/step-confirmation.tsx")
  );

  it("leads with 'Your request is in' and credits Mike + Our Town", () => {
    expect(confirmation).toContain("Your request is in");
    expect(confirmation).toContain("Mike Eatmon");
    expect(confirmation).toContain("Our Town Properties");
  });

  it("shows a Call Mike CTA and a link to Our Town Properties", () => {
    expect(confirmation).toContain("Call Mike");
    expect(confirmation).toContain("Visit Our Town Properties");
  });

  it("uses the real headshot inside the assignment card", () => {
    expect(confirmation).toContain(
      "/images/ask-magic-mike/mike-eatmon-headshot.png"
    );
  });

  it("uses the shared ComplianceFooter", () => {
    expect(confirmation).toContain("ComplianceFooter");
    expect(confirmation).toMatch(/testId="confirmation-disclosure"/);
  });
});

describe("public UI source bans gimmicky / non-compliant copy", () => {
  const publicDirs = [
    join(repoRoot, "src/app"),
    join(repoRoot, "src/components"),
  ];

  const publicSources = publicDirs.flatMap((d) =>
    collectSourceFiles(d).filter(
      // Exclude admin surfaces — admin is not paid traffic / not public.
      (p) => !p.includes("/admin/")
    )
  );

  it("never says 'Rub the lamp' in any public source file", () => {
    for (const file of publicSources) {
      const txt = readFileSync(file, "utf8");
      expect(txt, `forbidden 'Rub the lamp' in ${file}`).not.toMatch(
        /rub the lamp/i
      );
    }
  });

  it("never uses banned valuation / offer phrases in public source", () => {
    const bans = FORBIDDEN_PHRASES.filter(
      (rx) => rx.source !== "\\bappraisal\\b"
    );
    for (const file of publicSources) {
      const txt = readFileSync(file, "utf8");
      for (const phrase of bans) {
        expect(txt, `forbidden ${phrase} in ${file}`).not.toMatch(phrase);
      }
    }
  });

  it("the word 'appraisal' only appears inside 'not an appraisal'", () => {
    for (const file of publicSources) {
      const txt = readFileSync(file, "utf8");
      const cleaned = stripAllowedAppraisalContext(txt);
      expect(cleaned, `bare 'appraisal' outside negation in ${file}`).not.toMatch(
        /\bappraisal\b/i
      );
    }
  });
});
