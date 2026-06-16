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
  /preliminary home value range/i,
  /home value range/i,
  /\bguaranteed value\b/i,
  /\bguaranteed offer\b/i,
  /\bbinding offer\b/i,
  /\bbinding cash offer\b/i,
  /\binstant cash offer\b/i,
  /rub the lamp/i,
  // Response-time SLA promises — there is no operational proof of any
  // response SLA, so public copy must use review/request framing instead.
  /typically responds/i,
  /within minutes/i,
  /within \d+ minutes/i,
  /< ?5 minutes/i,
  /notified immediately/i,
];

const ALLOWED_APPRAISAL_NEGATIONS: RegExp[] = [];

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
    expect(complianceFooter).toContain("AI-assisted intake");
    expect(complianceFooter).toContain("local broker follow-up");
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
    expect(valueHero).toContain("broker-reviewed");
    expect(valueHero).not.toContain("preliminary home value range");
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

  it("pulls headshot + logo from the brand-pack-v2 registry; compact avatar from the platform crop", () => {
    expect(mikeTrustCard).toContain("brandPackAssets.mike.headshot");
    expect(mikeTrustCard).toContain("mikePlatformAssets.circularAvatar");
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
    expect(valuePage).toContain("broker-reviewed local follow-up");
    expect(valuePage).not.toMatch(/guaranteed/i);
    expect(valuePage).not.toMatch(/instant cash offer/i);
  });

  it("page metadata points at the platform Open Graph card for OG image", () => {
    expect(valuePage).toContain("mikePlatformAssets.openGraphCard");
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
});

describe("Mike platform-ready crops manifest", () => {
  const manifest = normalize(readSource("src/lib/mikePlatformAssets.ts"));
  const heroSection = normalize(
    readSource("src/components/landing/hero-section.tsx")
  );

  it("exports all six platform crops under /images/mike/platform-crops", () => {
    expect(manifest).toContain("/images/mike/platform-crops");
    expect(manifest).toContain("websiteHeroPlate");
    expect(manifest).toContain("01_website_hero_plate_2400x1350.jpg");
    expect(manifest).toContain("openGraphCard");
    expect(manifest).toContain("/ask-magic-mike-og.png");
    expect(manifest).toContain("feedAd");
    expect(manifest).toContain("03_facebook_instagram_feed_ad_1080x1350.jpg");
    expect(manifest).toContain("storyAd");
    expect(manifest).toContain("04_instagram_story_ad_1080x1920.jpg");
    expect(manifest).toContain("mobileHero");
    expect(manifest).toContain("05_mobile_hero_crop_1080x1920.jpg");
    expect(manifest).toContain("circularAvatar");
    expect(manifest).toContain("06_circular_avatar_crop_1024x1024.jpg");
  });

  it("resolves every crop to a real file in public/", () => {
    for (const file of [
      "01_website_hero_plate_2400x1350.jpg",
      "02_open_graph_card_1200x630_safe_zone.jpg",
      "03_facebook_instagram_feed_ad_1080x1350.jpg",
      "04_instagram_story_ad_1080x1920.jpg",
      "05_mobile_hero_crop_1080x1920.jpg",
      "06_circular_avatar_crop_1024x1024.jpg",
    ]) {
      const full = join(repoRoot, "public/images/mike/platform-crops", file);
      expect(existsSync(full), `missing crop: ${full}`).toBe(true);
    }
  });

  it("documents feed/story as campaign exports (no in-app consumer required)", () => {
    expect(manifest).toMatch(/campaign export/i);
  });

  it("uses no MLS / flexmls source for any crop", () => {
    expect(manifest).not.toMatch(/flexmls|mls listing/i);
  });

  it("hero uses the P28.1 face-safe Mike portrait layout instead of a wallpaper image", () => {
    expect(heroSection).toContain("MikeHeroPortrait");
    expect(heroSection).toContain('data-hero-text="true"');
    expect(heroSection).toContain('data-primary-cta="true"');
    expect(heroSection).not.toContain("<picture");
    expect(heroSection).not.toContain("mikePlatformAssets.websiteHeroPlate.src");
    expect(heroSection).not.toContain("mikePlatformAssets.mobileHero.src");
    expect(heroSection).not.toContain("data-mobile-hero");
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

  it("uses the platform circular avatar inside the assignment card", () => {
    expect(confirmation).toContain("mikePlatformAssets.circularAvatar");
  });

  it("uses the shared ComplianceFooter", () => {
    expect(confirmation).toContain("ComplianceFooter");
    expect(confirmation).toMatch(/testId="confirmation-disclosure"/);
  });

  it("follow-up panel uses request framing, never booking confirmations", () => {
    expect(confirmation).toContain("Want Mike to follow up?");
    expect(confirmation).toContain("Request follow-up");
    expect(confirmation).toContain(
      "Request noted. Mike will review the details before contacting you."
    );
    expect(confirmation).not.toMatch(/appointment (is )?(booked|confirmed|scheduled)/i);
    expect(confirmation).not.toMatch(/\bbooked\b/i);
    expect(confirmation).not.toMatch(/booking confirm/i);
    expect(confirmation).not.toMatch(/your appointment is set/i);
  });
});

describe("intake contact + consent steps — minimal friction, compliant copy", () => {
  const stepContact = normalize(
    readSource("src/components/intake/step-contact.tsx")
  );
  const stepConsent = normalize(
    readSource("src/components/intake/step-consent.tsx")
  );
  const valueHeroRaw = readSource("src/components/campaign/value-hero.tsx");

  it("contact step asks exactly first name, email, phone — no last name field", () => {
    expect(stepContact).toContain("contact-first-name");
    expect(stepContact).toContain("contact-email");
    expect(stepContact).toContain("contact-phone");
    expect(stepContact).not.toContain("contact-last-name");
    expect(stepContact).not.toContain("lastName");
  });

  it("email consent copy never promises valuations or reports", () => {
    expect(stepConsent).toContain("Receive market updates and follow-ups");
    expect(stepConsent).not.toMatch(/\bvaluations?\b/i);
  });

  it("consent step keeps all three TCPA contact methods", () => {
    expect(stepConsent).toContain("consent-sms");
    expect(stepConsent).toContain("consent-call");
    expect(stepConsent).toContain("consent-email");
    expect(stepConsent).toContain("Telephone Consumer Protection Act");
  });

  it("/value renders the how-it-works explainer before the alternate-path cards", () => {
    const howItWorksAt = valueHeroRaw.indexOf("<HowItWorks");
    const pathCardsAt = valueHeroRaw.indexOf('data-testid="value-secondary-chips"');
    expect(howItWorksAt).toBeGreaterThan(-1);
    expect(pathCardsAt).toBeGreaterThan(-1);
    expect(howItWorksAt).toBeLessThan(pathCardsAt);
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

  it("avatar component uses the platform circular avatar crop", () => {
    expect(avatar).toContain("mikePlatformAssets.circularAvatar");
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

  it("widget shell uses the platform circular avatar in the header", () => {
    expect(shell).toContain("mikePlatformAssets.circularAvatar");
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
    expect(widgetPage).toContain("broker follow-up");
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

  it("does not use appraisal language in public source", () => {
    for (const file of publicSources) {
      const txt = readFileSync(file, "utf8");
      expect(txt, `appraisal wording in ${file}`).not.toMatch(
        /\bappraisal\b/i
      );
    }
  });
});
