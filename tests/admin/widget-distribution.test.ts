import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..");

function readSource(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

// ─── Widget Distribution Page ─────────────────────────────────────────────────

describe("Admin · Widget Distribution page", () => {
  const page = readSource("src/app/(admin)/admin/widgets/page.tsx");

  it("page file exists", () => {
    expect(existsSync(join(repoRoot, "src/app/(admin)/admin/widgets/page.tsx"))).toBe(true);
  });

  it("uses AdminShell", () => {
    expect(page).toContain("AdminShell");
  });

  it("renders embed snippet section", () => {
    expect(page).toContain("Embed Widget Snippets");
  });

  it("renders channel direct links section", () => {
    expect(page).toContain("Channel Direct Links");
  });

  it("renders intent quick links section", () => {
    expect(page).toContain("Intent Quick Links");
  });

  it("includes WordPress sidebar snippet", () => {
    expect(page).toContain("wordpress-sidebar");
    expect(page).toContain("data-amm-widget");
  });

  it("includes all major channels", () => {
    expect(page).toContain("facebook");
    expect(page).toContain("instagram");
    expect(page).toContain("email");
    expect(page).toContain("qr");
  });

  it("uses canonical askmagicmike.com host in all snippets — never raw vercel preview URL", () => {
    expect(page).toContain("askmagicmike.com/embed/amm-loader.js");
    expect(page).not.toMatch(/ask-magic-mike-[a-z0-9]+\.vercel\.app/);
  });

  it("includes all five chip intents", () => {
    expect(page).toContain("home_worth");
    expect(page).toContain("should_sell_now");
    expect(page).toContain("tour_home");
    expect(page).toContain("what_can_afford");
    expect(page).toContain("talk_to_mike");
  });

  it("warns about never using preview Vercel URLs", () => {
    const hasWarning =
      page.includes("Never hardcode a Vercel preview URL") ||
      page.includes("Never use a Vercel preview") ||
      page.includes("verify-production-alias");
    expect(hasWarning).toBe(true);
  });

  it("links back to distribution analytics", () => {
    expect(page).toContain("/admin/distribution");
  });

  it("links to marketing campaign assets", () => {
    expect(page).toContain("/admin/marketing");
  });

  it("uses CopyBlock for snippets", () => {
    expect(page).toContain("CopyBlock");
  });

  it("includes mobile/embed notes section", () => {
    expect(page).toContain("Mobile");
  });

  it("all UTM-tagged links include utm_source", () => {
    const lines = page.split("\n");
    const urlLines = lines.filter((l) => l.includes("askmagicmike.com") && l.includes("utm_"));
    // Every URL line that has UTM params must include utm_source
    for (const line of urlLines) {
      expect(line).toContain("utm_source");
    }
  });
});

// ─── Admin command center wires Widgets ──────────────────────────────────────

describe("Admin · Command center includes Widgets tile", () => {
  const adminPage = readSource("src/app/(admin)/admin/page.tsx");

  it("command center links to /admin/widgets", () => {
    expect(adminPage).toContain("/admin/widgets");
  });

  it("Widgets tile has label", () => {
    expect(adminPage).toContain("Widgets");
  });

  it("imports Code2 icon for Widgets tile", () => {
    expect(adminPage).toContain("Code2");
  });
});

// ─── Distribution page links to Widgets ──────────────────────────────────────

describe("Admin · Distribution page cross-links to Widgets", () => {
  const distPage = readSource("src/app/(admin)/admin/distribution/page.tsx");

  it("distribution page links to /admin/widgets", () => {
    expect(distPage).toContain("/admin/widgets");
  });

  it("distribution page has 'Widget Distribution' callout", () => {
    expect(distPage).toContain("Widget Distribution");
  });
});

// ─── No fake claims in any widget copy ───────────────────────────────────────

describe("Widget distribution — compliance", () => {
  const widgetsPage = readSource("src/app/(admin)/admin/widgets/page.tsx");

  it("does not claim it will automatically post on the user's behalf", () => {
    expect(widgetsPage).not.toMatch(/will (automatically )?post on your behalf/i);
    expect(widgetsPage).not.toMatch(/automatically posts? to/i);
  });

  it("includes disclaimer that system does not post on your behalf", () => {
    expect(widgetsPage).toContain("never posts on your behalf");
  });

  it("does not reference ourtownproperties.com as a link target", () => {
    // Warning copy is OK; actual href to it is not
    expect(widgetsPage).not.toMatch(/href=["']https?:\/\/ourtownproperties/);
  });
});
