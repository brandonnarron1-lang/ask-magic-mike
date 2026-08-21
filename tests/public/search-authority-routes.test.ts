import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Phase 9.5 search-authority route wiring", () => {
  it("removes the inherited homepage canonical and assigns every indexable conversion route explicitly", () => {
    expect(read("app/layout.tsx")).not.toContain('alternates: { canonical: "/" }');
    const routes: Array<[string, string]> = [
      ["app/page.tsx", 'path: "/"'],
      ["app/home-value/page.tsx", 'path: "/home-value"'],
      ["app/sell/page.tsx", 'path: "/sell"'],
      ["app/buy/page.tsx", 'path: "/buy"'],
      ["app/rent/page.tsx", 'path: "/rent"'],
      ["app/ask/page.tsx", 'path: "/ask"'],
      ["app/contact/page.tsx", 'path: "/contact"'],
      ["app/privacy/page.tsx", 'path: "/privacy"'],
      ["app/terms/page.tsx", 'path: "/terms"'],
      ["app/accessibility/page.tsx", 'path: "/accessibility"'],
    ];
    for (const [file, path] of routes) {
      expect(read(file), file).toContain("publicPageMetadata");
      expect(read(file), file).toContain(path);
    }
    expect(read("app/page.tsx")).toContain('title: "Ask Magic Mike | Wilson, NC Real Estate Guidance"');
  });

  it("canonicalizes compatibility aliases to the full canonical route", () => {
    expect(read("app/value/page.tsx")).toContain('canonicalPath: "/home-value"');
    expect(read("app/we-buy-houses/page.tsx")).toContain('canonicalPath: "/sell"');
  });

  it("allows Ask Mike crawling and lists the route in the canonical sitemap", () => {
    const robots = read("app/robots.ts");
    expect(robots).not.toContain('"/ask"');
    expect(robots).toContain('disallow: ["/admin", "/api/", "/go/"]');
    const sitemap = read("app/sitemap.ts");
    expect(sitemap).toContain('["/ask", 0.75]');
    expect(sitemap).not.toContain('["/value"');
    expect(sitemap).not.toContain('["/we-buy-houses"');
  });

  it("marks private, operational, embed, and post-conversion routes noindex", () => {
    for (const file of [
      "app/thank-you/page.tsx",
      "app/social-preview/page.tsx",
      "app/widget-preview/page.tsx",
      "app/widget/page.tsx",
      "app/widget/v1/page.tsx",
      "app/embed/ask/page.tsx",
      "app/integrations/ourtownproperties/page.tsx",
      "app/open-house/[propertyOrId]/page.tsx",
      "app/lead-center-login/page.tsx",
      "app/lead-center-password-help/page.tsx",
      "app/lead-center-set-password/page.tsx",
    ]) {
      expect(read(file), file).toContain("nonIndexablePageMetadata");
    }
  });

  it("publishes visible-aligned homepage organization and website JSON-LD without disputed contact facts", () => {
    const source = read("app/components/seo/HomepageStructuredData.tsx");
    expect(source).toContain('"@type": "Organization"');
    expect(source).toContain('"@type": "WebSite"');
    expect(source).toContain('"@type": "WebPage"');
    expect(source).toContain('type="application/ld+json"');
    expect(source).toContain('replace(/</g, "\\\\u003c")');
    expect(source).not.toContain("telephone:");
    expect(source).not.toContain("address:");
    expect(source).not.toContain("aggregateRating");
    expect(source).not.toContain("review:");
  });
});
