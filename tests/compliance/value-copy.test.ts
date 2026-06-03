import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";

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

// Top-level forbidden phrases applied via raw substring scans.
// `genie` / `lamp` are not in this list because the dedicated sweep below
// (which strips comments) checks for them inside JSX text rather than source
// comments.
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
  const valuePage = normalize(
    readSource("src/app/(campaign)/value/page.tsx")
  );
  const mikeTrustCard = normalize(
    readSource("src/components/amm/mike-trust-card.tsx")
  );
  const brandHeader = normalize(
    readSource("src/components/amm/brand-header.tsx")
  );
  const conversionPanel = normalize(
    readSource("src/components/amm/conversion-panel.tsx")
  );
  const optionCard = normalize(
    readSource("src/components/amm/option-card.tsx")
  );
  const howItWorks = normalize(
    readSource("src/components/amm/how-it-works.tsx")
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
    // CTA copy lives inside the reusable ConversionPanel default.
    expect(conversionPanel).toContain("Start With Your Address");
  });

  it("renders the three secondary path options as OptionCards", () => {
    expect(valueHero).toContain("Compare selling options");
    expect(valueHero).toContain("Request direct-purchase review");
    expect(valueHero).toContain("Ask Mike a question");
    expect(valueHero).toContain("OptionCard");
  });

  it("uses the AI-assist micro-positioning", () => {
    // The line now lives in ConversionPanel (default microLine) and the
    // AiAssistBadge inline variant.
    expect(conversionPanel).toContain(
      "AI-assisted intake. Local human follow-up."
    );
  });

  it("composes BrandShell + BrandHeader + MikeTrustCard + ConversionPanel + OptionCard + HowItWorks", () => {
    expect(valueHero).toContain("BrandShell");
    expect(valueHero).toContain("BrandHeader");
    expect(valueHero).toContain("MikeTrustCard");
    expect(valueHero).toContain("ConversionPanel");
    expect(valueHero).toContain("HowItWorks");
    expect(valueHero).toContain("ProofStrip");
  });

  it("renders Mike + Our Town credentials inside the trust card", () => {
    expect(mikeTrustCard).toContain("Mike Eatmon");
    expect(mikeTrustCard).toContain("Our Town Properties, Inc.");
    expect(mikeTrustCard).toContain("Licensed in North Carolina");
    expect(mikeTrustCard).toContain("Wilson, NC");
    expect(mikeTrustCard).toContain("Selling real estate since 1993");
  });

  it("pulls headshot + logo from the brand-pack-v2 registry", () => {
    expect(mikeTrustCard).toContain("brandPackAssets.mike.headshot");
    expect(mikeTrustCard).toContain("brandPackAssets.mike.avatar128");
    expect(brandHeader).toContain("brandPackAssets.logo.primary");
  });

  it("renders the 'What happens next' three-step explainer", () => {
    expect(howItWorks).toContain("Start with your address");
    expect(howItWorks).toContain("Answer a few quick questions");
    expect(howItWorks).toContain("Mike's team follows up with local guidance");
  });

  it("uses the shared ComplianceFooter for the disclosure", () => {
    expect(valueHero).toContain("ComplianceFooter");
    expect(valueHero).toMatch(/testId="value-disclosure"/);
  });

  it("OptionCard preserves UTM attribution when navigating to /ask", () => {
    expect(optionCard).toContain("readAttribution");
    expect(optionCard).toContain("appendUtmsToParams");
  });

  it("page metadata leads with trust-first copy", () => {
    expect(valuePage).toContain("Start with your address");
    expect(valuePage).toContain("preliminary home value range");
    expect(valuePage).not.toMatch(/guaranteed/i);
    expect(valuePage).not.toMatch(/instant cash offer/i);
  });

  it("page metadata points at the brand-pack Mike headshot for OG image", () => {
    expect(valuePage).toContain(
      "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp"
    );
    expect(valuePage).not.toMatch(/MLS|flexmls/i);
  });
});

describe("root layout metadata", () => {
  const layout = normalize(readSource("src/app/layout.tsx"));

  it("sets metadataBase so OG paths resolve absolutely", () => {
    expect(layout).toContain("metadataBase");
    expect(layout).toContain("NEXT_PUBLIC_SITE_URL");
  });

  it("titles and descriptions name Mike + Our Town and stay compliance-safe", () => {
    expect(layout).toContain("Ask Magic Mike by Our Town Properties");
    expect(layout).toContain("Mike Eatmon");
    expect(layout).toContain("preliminary home value range");
    expect(layout).not.toMatch(/guaranteed/i);
    expect(layout).not.toMatch(/instant cash offer/i);
  });

  it("OG image points at the brand-pack Mike headshot, no MLS source", () => {
    expect(layout).toContain(
      "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp"
    );
    expect(layout).not.toMatch(/flexmls|mls listing/i);
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

  it("uses the 'Your local contact' label and Call Mike CTA", () => {
    expect(confirmation).toContain("Your local contact");
    expect(confirmation).toContain("Call Mike");
    expect(confirmation).toContain("Visit Our Town Properties");
  });

  it("uses the brand-pack avatar inside the assignment card", () => {
    expect(confirmation).toContain("brandPackAssets.mike.avatar256");
  });

  it("uses the shared ComplianceFooter", () => {
    expect(confirmation).toContain("ComplianceFooter");
    expect(confirmation).toMatch(/testId="confirmation-disclosure"/);
  });
});

describe("intake shell and embed shell — cohesive branding", () => {
  const intakeShell = normalize(
    readSource("src/components/intake/intake-shell.tsx")
  );
  const embedShell = normalize(
    readSource("src/components/embed/embed-shell.tsx")
  );

  it("intake shell uses BrandShell + BrandHeader + MikeTrustCard + AiAssistBadge", () => {
    expect(intakeShell).toContain("BrandShell");
    expect(intakeShell).toContain("BrandHeader");
    expect(intakeShell).toContain("MikeTrustCard");
    expect(intakeShell).toContain("AiAssistBadge");
  });

  it("embed shell uses BrandHeader + MikeTrustCard compact variant", () => {
    expect(embedShell).toContain("BrandHeader");
    expect(embedShell).toContain("MikeTrustCard");
    expect(embedShell).toContain('variant="compact"');
  });
});

describe("brand pack v2 registry", () => {
  it("every registry path resolves to a file in public/", () => {
    const visit = (node: unknown) => {
      if (typeof node === "string" && node.startsWith("/images/")) {
        const full = join(repoRoot, "public", node);
        expect(existsSync(full), `missing file: ${full}`).toBe(true);
      } else if (node && typeof node === "object") {
        for (const value of Object.values(node)) visit(value);
      }
    };
    visit(brandPackAssets);
  });

  it("never references MLS / flexmls source paths", () => {
    const json = JSON.stringify(brandPackAssets).toLowerCase();
    expect(json).not.toMatch(/flexmls/);
    expect(json).not.toMatch(/mls/);
  });
});

describe("Magic Mike widget / avatar foundation", () => {
  const avatar = normalize(
    readSource("src/components/amm/magic-mike-avatar.tsx")
  );
  const launcher = normalize(
    readSource("src/components/amm/magic-mike-widget-launcher.tsx")
  );
  const reveal = normalize(
    readSource("src/components/amm/magic-mike-answer-reveal.tsx")
  );

  it("avatar component uses the brand-pack circle avatars", () => {
    expect(avatar).toContain("brandPackAssets.mike.avatar128");
    expect(avatar).toContain("brandPackAssets.mike.avatar256");
  });

  it("widget launcher has an accessible Ask Magic Mike label", () => {
    expect(launcher).toContain("Ask Magic Mike");
    expect(launcher).toContain("aria-label");
  });

  it("answer reveal is CSS-only (no smoke image embedded)", () => {
    expect(reveal).not.toMatch(/answer-smoke-sequence\.webp/);
    expect(reveal).toContain("radial-gradient");
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

  it("never frames Mike as a genie or uses 'lamp' identity in public source", () => {
    // We strip line + block comments first so that internal notes which
    // describe the rejected direction (e.g. "No lamp or genie identity.")
    // don't trip the sweep. JSX text and string literals are still checked.
    const stripComments = (src: string) =>
      src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const file of publicSources) {
      const txt = stripComments(readFileSync(file, "utf8"));
      expect(txt, `'genie' in ${file}`).not.toMatch(/\bgenie\b/i);
      expect(txt, `'lamp' in ${file}`).not.toMatch(/\blamp\b/i);
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
