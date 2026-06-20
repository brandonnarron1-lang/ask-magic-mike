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
  /not\s+an\s+appraisal/i,
  /is\s+not\s+an\s+appraisal/i,
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
    // NEXT_PUBLIC_SITE_URL may live in layout.tsx directly or in the central
    // site-config.ts (single source of truth). Check both locations.
    const siteConfigSrc = normalize(readSource("src/lib/site-config.ts"));
    expect(
      layout.includes("NEXT_PUBLIC_SITE_URL") ||
        (layout.includes("siteConfig") && siteConfigSrc.includes("NEXT_PUBLIC_SITE_URL"))
    ).toBe(true);
  });

  it("titles and descriptions name Mike + Our Town and stay compliance-safe", () => {
    expect(layout).toContain("Ask Magic Mike by Our Town Properties");
    expect(layout).toContain("Mike Eatmon");
    expect(layout).toContain("broker-reviewed guidance");
    expect(layout).not.toMatch(/guaranteed/i);
    expect(layout).not.toMatch(/instant cash offer/i);
  });

  it("OG image points at the platform Open Graph card, no MLS source", () => {
    expect(layout).toContain("mikePlatformAssets.openGraphCard");
    expect(layout).not.toMatch(/flexmls|mls listing/i);
  });

  it("og:url is explicitly set in the openGraph config", () => {
    // Next.js App Router does NOT auto-inject og:url from metadataBase.
    // The url field must appear inside the openGraph block.
    // We verify both that openGraph is defined and that url: appears after it.
    expect(layout).toContain("openGraph:");
    // After normalize(), check that url: SITE_URL appears as a sibling key
    // inside the openGraph block — not inside images[] or the twitter block.
    expect(layout).toMatch(/openGraph:[\s\S]{0,600}url: SITE_URL/);
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
  const shell = normalize(
    readSource("src/components/amm/magic-mike-widget-shell.tsx")
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

  it("widget shell mirrors the kit's MessageList / PromptChips / LeadCapture structure", () => {
    expect(shell).toContain("amm-widget-messages");
    expect(shell).toContain("amm-widget-chips");
    expect(shell).toContain("amm-widget-lead");
    expect(shell).toContain("amm-widget-status");
  });

  it("widget shell ships compliance-safe prompt chips (no 'cash offer')", () => {
    expect(shell).not.toMatch(/cash offer/i);
    expect(shell).toContain("Request a direct-purchase review");
  });

  it("widget shell uses the brand-pack avatar in the header", () => {
    expect(shell).toContain("brandPackAssets.mike.avatar128");
  });
});

describe("brand kit evidence report", () => {
  const evidence = readSource(
    "docs/ask-magic-mike-brand-kit-v2-evidence-report.md"
  );

  it("records the ZIP path and SHA-256 checksum", () => {
    expect(evidence).toContain("ask_magic_mike_full_branding_pack_v2.zip");
    expect(evidence).toMatch(
      /7a4690e64ce665457c526df7d218f50218682756c86dce1925ae5fa591613758/
    );
  });

  it("has imported / rejected / reference-only sections", () => {
    expect(evidence).toMatch(/Assets imported into the repo/i);
    expect(evidence).toMatch(/Assets rejected/i);
    expect(evidence).toMatch(/Concept references/i);
  });

  it("documents the production go/no-go gate", () => {
    expect(evidence).toMatch(/production status:\s*hold/i);
  });
});

describe("widget preview route", () => {
  const widgetPage = normalize(
    readSource("src/app/widget-preview/page.tsx")
  );

  it("is noindex / nofollow", () => {
    expect(widgetPage).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });

  it("renders the widget shell at four states", () => {
    expect(widgetPage).toContain('variant="idle"');
    expect(widgetPage).toContain('variant="thinking"');
    expect(widgetPage).toContain('variant="answer"');
    expect(widgetPage).toContain('variant="lead"');
  });

  it("includes the brand kit showcase + compliance footer", () => {
    expect(widgetPage).toContain("BrandKitShowcase");
    expect(widgetPage).toContain("ComplianceFooter");
  });

  it("mentions Mike Eatmon and Our Town Properties + AI-assisted", () => {
    expect(widgetPage).toContain("Mike Eatmon");
    expect(widgetPage).toContain("Our Town Properties");
    expect(widgetPage).toMatch(/AI-assisted/);
    expect(widgetPage).toContain("not an appraisal");
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

  it("never says 'cash offer' on the public funnel surfaces", () => {
    // Whitelist: `widget-preview` and the brand-kit showcase reference the
    // kit's `cash-offer-feed.jpg` filename and explicitly call out that the
    // baked copy must be rewritten before paid use. The actual funnel
    // surfaces (/value, /ask, /embed/ask, intake step components, amm
    // primitives) must never carry the phrase.
    const stripComments = (src: string) =>
      src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const whitelistedSubstrings = [
      "/widget-preview/",
      "/brand-kit-showcase",
      "/brand-pack-assets",
    ];
    for (const file of publicSources) {
      if (whitelistedSubstrings.some((s) => file.includes(s))) continue;
      const txt = stripComments(readFileSync(file, "utf8"));
      expect(txt, `'cash offer' in ${file}`).not.toMatch(/cash offer/i);
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

// ─── Brand/domain integration additions (PR: brand/ourtown-domain-integration) ─

describe("site-config — single source of truth for brand/domain", () => {
  const siteConfigSrc = normalize(readSource("src/lib/site-config.ts"));

  it("exports the canonical domain driven by NEXT_PUBLIC_SITE_URL", () => {
    expect(siteConfigSrc).toContain("NEXT_PUBLIC_SITE_URL");
    expect(siteConfigSrc).toContain("www.askmagicmike.com");
  });

  it("names Mike Eatmon, Our Town Properties, and Wilson NC", () => {
    expect(siteConfigSrc).toContain("Mike Eatmon");
    expect(siteConfigSrc).toContain("Our Town Properties, Inc.");
    expect(siteConfigSrc).toContain("Wilson, NC");
  });

  it("wires the agent phone through siteConfig", () => {
    expect(siteConfigSrc).toContain("agentPhone");
    expect(siteConfigSrc).toContain("NEXT_PUBLIC_AGENT_PHONE");
    expect(siteConfigSrc).toContain("252-245-4337");
  });
});

describe("sitemap and robots — canonical domain wiring", () => {
  const sitemap = normalize(readSource("src/app/sitemap.ts"));
  const robots = normalize(readSource("src/app/robots.ts"));

  it("sitemap uses siteConfig canonical URL", () => {
    expect(sitemap).toContain("siteConfig");
    expect(sitemap).toContain("canonicalSiteUrl");
  });

  it("robots.txt uses siteConfig canonical URL", () => {
    expect(robots).toContain("siteConfig");
    expect(robots).toContain("canonicalSiteUrl");
  });

  it("robots disallows admin, api, and intake-only routes", () => {
    expect(robots).toContain("/admin");
    expect(robots).toContain("/api/");
    expect(robots).toContain("/ask");
  });
});

describe("hero section — Our Town Properties brand integration", () => {
  const heroSection = normalize(
    readSource("src/components/landing/hero-section.tsx")
  );

  it("shows the Our Town Properties logo from brand-pack-assets", () => {
    expect(heroSection).toContain("brandPackAssets.logo.primary");
    expect(heroSection).toContain("Our Town Properties, Inc.");
  });

  it("shows the Our Town Properties brand eyebrow above the headline", () => {
    expect(heroSection).toContain("An Our Town Properties guidance tool");
  });

  it("routes phone through siteConfig rather than hardcoded literals", () => {
    expect(heroSection).toContain("siteConfig.agentPhone");
    expect(heroSection).toContain("siteConfig.agentPhoneDisplay");
  });

  it("uses MikeHeroPortrait abstraction, not a raw wallpaper image", () => {
    expect(heroSection).toContain("MikeHeroPortrait");
    expect(heroSection).toContain('data-hero-text="true"');
    expect(heroSection).toContain('data-primary-cta="true"');
    expect(heroSection).not.toContain("<picture");
    expect(heroSection).not.toContain("mikePlatformAssets.websiteHeroPlate.src");
    expect(heroSection).not.toContain("mikePlatformAssets.mobileHero.src");
    expect(heroSection).not.toContain("data-mobile-hero");
  });

  it("removes floating spark decorations (casino-poster aesthetic)", () => {
    expect(heroSection).not.toContain("SPARKS");
  });
});

describe("landing page copy — conversion trust guards", () => {
  const landingHowItWorks = normalize(
    readSource("src/components/landing/how-it-works.tsx")
  );
  const faqStrip = normalize(
    readSource("src/components/landing/faq-strip.tsx")
  );
  const questionInput = normalize(
    readSource("src/components/landing/question-input.tsx")
  );

  it("landing how-it-works does not use the forbidden word 'Instant'", () => {
    expect(landingHowItWorks).not.toMatch(/\bInstant\b/i);
  });

  it("landing how-it-works does not over-promise a personal Mike phone call", () => {
    expect(landingHowItWorks).not.toContain("Mike Calls You");
  });

  it("landing how-it-works does not imply a same-day SLA", () => {
    expect(landingHowItWorks).not.toMatch(/same business day/i);
  });

  it("faq-strip includes an 'is not an appraisal' trust clarification", () => {
    expect(faqStrip).toMatch(/is not an appraisal/i);
    expect(faqStrip).toContain("Is this a formal home valuation");
  });

  it("faq-strip includes a 'What happens after I submit' FAQ", () => {
    expect(faqStrip).toContain("What happens after I submit");
  });

  it("faq-strip does not promise a 'within minutes' response time", () => {
    expect(faqStrip).not.toMatch(/within minutes/i);
  });

  it("submit button says 'Request Guidance', not 'Get My Answer'", () => {
    expect(questionInput).toContain("Request Guidance");
    expect(questionInput).not.toContain("Get My Answer");
  });
});

describe("mikePlatformAssets — platform-ready crops registry", () => {
  const manifest = normalize(readSource("src/lib/mikePlatformAssets.ts"));

  it("exports all six platform crops", () => {
    expect(manifest).toContain("websiteHeroPlate");
    expect(manifest).toContain("openGraphCard");
    expect(manifest).toContain("feedAd");
    expect(manifest).toContain("storyAd");
    expect(manifest).toContain("mobileHero");
    expect(manifest).toContain("circularAvatar");
  });

  it("documents feed/story as campaign exports (no in-app consumer required)", () => {
    expect(manifest).toMatch(/campaign export/i);
  });

  it("uses no MLS / flexmls source for any crop", () => {
    expect(manifest).not.toMatch(/flexmls|mls listing/i);
  });

  it("drives absolute URL resolution from siteConfig canonical URL", () => {
    expect(manifest).toContain("siteConfig");
    expect(manifest).toContain("canonicalSiteUrl");
  });
});

// ---------------------------------------------------------------------------
// Lead Capture Conversion Polish v1 — public funnel copy and trust signals
// ---------------------------------------------------------------------------

describe("question-input — broker trust microcopy", () => {
  const questionInput = normalize(
    readSource("src/components/landing/question-input.tsx")
  );

  it("contains 'Not an appraisal' microcopy", () => {
    expect(questionInput).toContain("Not an appraisal");
  });

  it("contains 'Broker-reviewed guidance from Our Town Properties'", () => {
    expect(questionInput).toContain(
      "Broker-reviewed guidance from Our Town Properties"
    );
  });

  it("does NOT claim instant valuation", () => {
    expect(questionInput).not.toMatch(/instant valuation/i);
    expect(questionInput).not.toMatch(/instant home value/i);
  });

  it("does NOT claim guaranteed offer or guaranteed value", () => {
    expect(questionInput).not.toMatch(/guaranteed offer/i);
    expect(questionInput).not.toMatch(/guaranteed value/i);
  });

  it("contains the 'What happens next?' trust panel", () => {
    expect(questionInput).toContain("What happens next");
  });

  it("three-step What happens next panel contains correct steps", () => {
    expect(questionInput).toContain("Ask your question");
    expect(questionInput).toContain("Mike reviews the request");
    expect(questionInput).toContain("A local expert follows up if needed");
  });

  it("does NOT claim appraisal as a standalone positive (only as negation)", () => {
    const cleaned = stripAllowedAppraisalContext(questionInput);
    expect(cleaned).not.toMatch(/\bappraisal\b/i);
  });
});

describe("step-question intake — helper prompt examples", () => {
  const stepQuestion = normalize(
    readSource("src/components/intake/step-question.tsx")
  );

  it("contains helper prompt examples section", () => {
    expect(stepQuestion).toContain("helper-prompt-examples");
  });

  it("contains 'What is my Wilson home worth?' example", () => {
    expect(stepQuestion).toContain("What is my Wilson home worth");
  });

  it("contains 'Is now a good time to sell?' example", () => {
    expect(stepQuestion).toContain("Is now a good time to sell");
  });

  it("contains 'What should I know before buying in Wilson?' example", () => {
    expect(stepQuestion).toContain("What should I know before buying in Wilson");
  });

  it("does NOT promise an instant valuation", () => {
    expect(stepQuestion).not.toMatch(/instant valuation/i);
    expect(stepQuestion).not.toMatch(/instant (home )?value/i);
  });

  it("does NOT promise an appraisal as a standalone service", () => {
    const cleaned = stripAllowedAppraisalContext(stepQuestion);
    expect(cleaned).not.toMatch(/\bappraisal\b/i);
  });
});
