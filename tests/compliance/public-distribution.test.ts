import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..");

function readSource(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

// ─── Route existence ──────────────────────────────────────────────────────────

describe("Public distribution — route files exist", () => {
  it("distribution page exists at src/app/(campaign)/distribution/page.tsx", () => {
    expect(existsSync(join(repoRoot, "src/app/(campaign)/distribution/page.tsx"))).toBe(true);
  });

  it("campaigns page exists at src/app/(campaign)/campaigns/page.tsx", () => {
    expect(existsSync(join(repoRoot, "src/app/(campaign)/campaigns/page.tsx"))).toBe(true);
  });

  it("CopySnippet component exists at src/components/ui/copy-snippet.tsx", () => {
    expect(existsSync(join(repoRoot, "src/components/ui/copy-snippet.tsx"))).toBe(true);
  });

  it("campaign presets data exists at src/lib/content/campaign-presets.ts", () => {
    expect(existsSync(join(repoRoot, "src/lib/content/campaign-presets.ts"))).toBe(true);
  });
});

// ─── Distribution page — canonical URL guard ──────────────────────────────────

describe("Distribution page — canonical URL guard", () => {
  const page = readSource("src/app/(campaign)/distribution/page.tsx");

  it("uses askmagicmike.com as canonical host", () => {
    expect(page).toContain("askmagicmike.com");
  });

  it("does not contain raw Vercel preview URL", () => {
    expect(page).not.toMatch(/ask-magic-mike-[a-z0-9]+\.vercel\.app/);
    // Flag linked Vercel preview URLs only (not warning copy that mentions the pattern)
    expect(page).not.toMatch(/https?:\/\/[a-z0-9-]+\.vercel\.app/);
  });

  it("embed snippets point to askmagicmike.com/embed", () => {
    expect(page).toContain("askmagicmike.com/embed/amm-loader.js");
  });
});

// ─── Distribution page — structure ───────────────────────────────────────────

describe("Distribution page — structure", () => {
  const page = readSource("src/app/(campaign)/distribution/page.tsx");

  it("uses BrandShell", () => {
    expect(page).toContain("BrandShell");
  });

  it("renders Embed Widget Snippets section", () => {
    expect(page).toContain("Embed Widget Snippets");
  });

  it("renders Channel Direct Links section", () => {
    expect(page).toContain("Channel Direct Links");
  });

  it("renders How It Works section", () => {
    expect(page).toContain("How It Works");
  });

  it("renders UTM attribution section", () => {
    expect(page).toContain("utm_source");
    expect(page).toContain("utm_medium");
    expect(page).toContain("utm_campaign");
  });

  it("includes WordPress sidebar embed snippet", () => {
    expect(page).toContain("wordpress-sidebar");
    expect(page).toContain("data-amm-widget");
  });

  it("includes all major channel UTMs", () => {
    expect(page).toContain("utm_source=facebook");
    expect(page).toContain("utm_source=instagram");
    expect(page).toContain("utm_source=email");
    expect(page).toContain("utm_source=qr");
    expect(page).toContain("utm_source=sms");
  });

  it("links to /ask CTA", () => {
    expect(page).toContain('href="/ask"');
  });

  it("links to /value CTA", () => {
    expect(page).toContain('href="/value"');
  });

  it("links to /campaigns", () => {
    expect(page).toContain('href="/campaigns"');
  });

  it("links to admin widgets center", () => {
    expect(page).toContain("/admin/widgets");
  });

  it("links to admin distribution analytics", () => {
    expect(page).toContain("/admin/distribution");
  });

  it("uses CopyBlock for embed snippets", () => {
    expect(page).toContain("CopyBlock");
  });

  it("uses CopySnippet for channel URLs", () => {
    expect(page).toContain("CopySnippet");
  });
});

// ─── Distribution page — compliance ──────────────────────────────────────────

describe("Distribution page — compliance", () => {
  const page = readSource("src/app/(campaign)/distribution/page.tsx");

  it("discloses this is not an appraisal", () => {
    expect(page).toMatch(/not an appraisal/i);
  });

  it("includes Equal Housing Opportunity", () => {
    expect(page).toMatch(/equal housing opportunity/i);
  });

  it("clarifies Mike follows up personally — does not imply instant automated responses", () => {
    expect(page).toMatch(/follows up personally|reviews.*personally/i);
  });

  it("warns against using Vercel preview URLs in production embeds", () => {
    expect(page).toMatch(/never.*vercel preview|preview.*vercel.*production|never use a Vercel preview URL/i);
  });

  it("clarifies Mike never posts on user's behalf (no auto-posting)", () => {
    expect(page).toMatch(/never posts on your behalf/i);
  });

  it("does not claim guaranteed sale prices", () => {
    expect(page).not.toMatch(/guaranteed (sale )?price/i);
  });

  it("does not claim instant automated responses", () => {
    expect(page).not.toMatch(/instant (automated )?response/i);
  });
});

// ─── Campaigns page — structure ───────────────────────────────────────────────

describe("Campaigns page — structure", () => {
  const page = readSource("src/app/(campaign)/campaigns/page.tsx");

  it("is a client component", () => {
    expect(page).toContain('"use client"');
  });

  it("uses BrandShell", () => {
    expect(page).toContain("BrandShell");
  });

  it("uses useState for active preset selection", () => {
    expect(page).toContain("useState");
  });

  it("imports CAMPAIGN_PRESETS from campaign-presets", () => {
    expect(page).toContain("CAMPAIGN_PRESETS");
    expect(page).toContain("campaign-presets");
  });

  it("uses CopyBlock for copyable fields", () => {
    expect(page).toContain("CopyBlock");
  });

  it("links to /distribution", () => {
    expect(page).toContain('href="/distribution"');
  });

  it("links to /ask", () => {
    expect(page).toContain('href="/ask"');
  });

  it("shows compliance footer", () => {
    expect(page).toMatch(/equal housing opportunity/i);
  });

  it("shows CTA URL block with UTM label", () => {
    expect(page).toMatch(/cta link|utm/i);
  });

  it("shows compliance note per preset", () => {
    expect(page).toContain("complianceNote");
  });

  it("shows suggested placement per preset", () => {
    expect(page).toContain("placement");
  });
});

// ─── Campaign presets data — completeness ─────────────────────────────────────

describe("Campaign presets data — all 11 presets present", () => {
  const file = readSource("src/lib/content/campaign-presets.ts");

  const REQUIRED_IDS = [
    "home_value",
    "ask_mike",
    "we_buy_houses",
    "agent_profile",
    "listing_promotion",
    "open_house",
    "qr_flyer",
    "email_blast",
    "facebook_post",
    "instagram_caption",
    "video_script",
  ];

  for (const id of REQUIRED_IDS) {
    it(`preset '${id}' is defined`, () => {
      expect(file).toContain(`id: "${id}"`);
    });
  }

  it("exports CAMPAIGN_PRESETS array", () => {
    expect(file).toContain("export const CAMPAIGN_PRESETS");
  });

  it("exports getPresetById function", () => {
    expect(file).toContain("export function getPresetById");
  });
});

// ─── Campaign presets data — compliance ──────────────────────────────────────

describe("Campaign presets data — compliance rules", () => {
  const file = readSource("src/lib/content/campaign-presets.ts");

  it("every preset has a complianceNote field", () => {
    const presetsSection = file.split("export function")[0];
    const ids = ["home_value", "ask_mike", "we_buy_houses", "agent_profile",
      "listing_promotion", "open_house", "qr_flyer", "email_blast",
      "facebook_post", "instagram_caption", "video_script"];
    // complianceNote count should match preset count
    const noteCount = (presetsSection.match(/complianceNote:/g) ?? []).length;
    expect(noteCount).toBeGreaterThanOrEqual(ids.length);
  });

  it("does not guarantee a specific sale price", () => {
    expect(file).not.toMatch(/guaranteed (sale )?price(?! outcomes)/i);
  });

  it("does not claim instant automated results", () => {
    expect(file).not.toMatch(/instant (automated )?result|auto(matically)? sends/i);
  });

  it("does not make unauthorized MLS data claims", () => {
    expect(file).not.toMatch(/live mls data|access the mls|mls search/i);
  });

  it("We Buy Houses preset does not imply a firm cash purchase commitment", () => {
    const wbh = file.match(/id: "we_buy_houses"[\s\S]*?(?=id: "|export function)/)?.[0] ?? "";
    // compliance note should warn against implying a binding purchase — verify it contains a caution
    expect(wbh).toContain("complianceNote");
    // must not call it a "no-obligation offer" as if purchase is guaranteed
    expect(wbh).not.toMatch(/no.obligation (cash|purchase) offer/i);
  });

  it("all CTA URLs use askmagicmike.com domain", () => {
    // Exclude TypeScript interface/type declarations (lines with "string;" or "string |")
    const ctaLines = file.split("\n").filter((l) => l.includes("ctaUrl:") && l.includes("http"));
    expect(ctaLines.length).toBeGreaterThan(0);
    for (const line of ctaLines) {
      expect(line).toContain("askmagicmike.com");
    }
  });

  it("all CTA URLs include utm_source param", () => {
    const ctaLines = file.split("\n").filter((l) => l.includes("ctaUrl:") && l.includes("http"));
    expect(ctaLines.length).toBeGreaterThan(0);
    for (const line of ctaLines) {
      expect(line).toContain("utm_source");
    }
  });

  it("no Vercel preview URLs in presets", () => {
    expect(file).not.toMatch(/\.vercel\.app/);
  });
});

// ─── Footer wires /distribution and /campaigns ───────────────────────────────

describe("Footer — links to public distribution surfaces", () => {
  const footer = readSource("src/components/landing/footer.tsx");

  it("footer links to /distribution", () => {
    expect(footer).toContain('href="/distribution"');
  });

  it("footer links to /campaigns", () => {
    expect(footer).toContain('href="/campaigns"');
  });
});

// ─── CopySnippet — client component structure ─────────────────────────────────

describe("CopySnippet component — structure", () => {
  const comp = readSource("src/components/ui/copy-snippet.tsx");

  it("is a client component", () => {
    expect(comp).toContain('"use client"');
  });

  it("uses clipboard API", () => {
    expect(comp).toContain("navigator.clipboard");
  });

  it("has copy button with aria-label", () => {
    expect(comp).toContain("aria-label");
  });

  it("shows copied confirmation state", () => {
    expect(comp).toContain("Copied");
  });
});

// ─── Admin widgets still protected (no public access to /admin) ──────────────

describe("Admin widgets still protected", () => {
  const middleware = readSource("src/middleware.ts");

  it("middleware still protects /admin route", () => {
    expect(middleware).toMatch(/\/admin/);
  });

  it("distribution page does not import admin middleware or session tools", () => {
    const page = readSource("src/app/(campaign)/distribution/page.tsx");
    expect(page).not.toContain("getSession");
    expect(page).not.toContain("auth(");
    expect(page).not.toContain("requireAdmin");
  });

  it("campaigns page does not import admin middleware or session tools", () => {
    const page = readSource("src/app/(campaign)/campaigns/page.tsx");
    expect(page).not.toContain("getSession");
    expect(page).not.toContain("auth(");
    expect(page).not.toContain("requireAdmin");
  });
});

// ─── No public secrets ───────────────────────────────────────────────────────

describe("Public surfaces — no secrets exposed", () => {
  const distPage = readSource("src/app/(campaign)/distribution/page.tsx");
  const campPage = readSource("src/app/(campaign)/campaigns/page.tsx");

  const secretPatterns = [
    /SUPABASE_SERVICE_ROLE/,
    /ADMIN_REPORT_SECRET/,
    /VERCEL_AUTOMATION_BYPASS_SECRET/,
    /process\.env\.[A-Z_]*SECRET/,
    /process\.env\.[A-Z_]*KEY(?!_LINK|BOARD)/,
  ];

  for (const pattern of secretPatterns) {
    it(`distribution page does not expose secret pattern ${pattern}`, () => {
      expect(distPage).not.toMatch(pattern);
    });

    it(`campaigns page does not expose secret pattern ${pattern}`, () => {
      expect(campPage).not.toMatch(pattern);
    });
  }
});
