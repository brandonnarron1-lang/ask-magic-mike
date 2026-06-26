import { describe, expect, it } from "vitest";
import {
  parseSessionResponse,
  hasOgUrl,
  hasCanonical,
  robotsBlocksAdmin,
  sitemapHasOrigin,
  hasOgImage,
  hasTwitterImage,
  hasNoFunnelReference,
  findStaleNoveltyCopy,
  hasNoMlsMarkers,
  extractSecurityHeaders,
  SMOKE_UTM_CAMPAIGN,
} from "../../scripts/prod-smoke.mjs";

describe("SMOKE_UTM_CAMPAIGN", () => {
  it("is the do-not-contact sentinel", () => {
    expect(SMOKE_UTM_CAMPAIGN).toBe("AMM_SMOKE_DO_NOT_CONTACT");
  });
});

describe("parseSessionResponse", () => {
  it("returns ok=true when sessionId is a string", () => {
    const res = parseSessionResponse({ sessionId: "abc-123", expiresAt: "2026-07-01T00:00:00Z" });
    expect(res.ok).toBe(true);
    expect(res.sessionId).toBe("abc-123");
    expect(res.hasExpiry).toBe(true);
  });

  it("returns ok=false when sessionId is missing", () => {
    const res = parseSessionResponse({ expiresAt: "2026-07-01T00:00:00Z" });
    expect(res.ok).toBe(false);
    expect(res.sessionId).toBeNull();
  });

  it("returns hasExpiry=false when expiresAt is missing", () => {
    const res = parseSessionResponse({ sessionId: "abc-123" });
    expect(res.ok).toBe(true);
    expect(res.hasExpiry).toBe(false);
  });

  it("returns ok=false for null", () => {
    expect(parseSessionResponse(null).ok).toBe(false);
  });

  it("returns ok=false for a non-object", () => {
    expect(parseSessionResponse("string").ok).toBe(false);
    expect(parseSessionResponse(42).ok).toBe(false);
  });

  it("returns ok=false when sessionId is not a string", () => {
    expect(parseSessionResponse({ sessionId: 123 }).ok).toBe(false);
    expect(parseSessionResponse({ sessionId: null }).ok).toBe(false);
    expect(parseSessionResponse({ sessionId: true }).ok).toBe(false);
  });
});

describe("hasOgUrl", () => {
  const origin = "https://www.askmagicmike.com";

  it("returns true for property-first og:url tag", () => {
    const html = `<head><meta property="og:url" content="https://www.askmagicmike.com/" /></head>`;
    expect(hasOgUrl(html, origin)).toBe(true);
  });

  it("returns true for content-first og:url tag", () => {
    const html = `<meta content="https://www.askmagicmike.com/" property="og:url">`;
    expect(hasOgUrl(html, origin)).toBe(true);
  });

  it("returns true for og:url with single quotes", () => {
    const html = `<meta property='og:url' content='https://www.askmagicmike.com/value'>`;
    expect(hasOgUrl(html, origin)).toBe(true);
  });

  it("is case-insensitive", () => {
    const html = `<META PROPERTY="OG:URL" CONTENT="https://www.askmagicmike.com/">`;
    expect(hasOgUrl(html, origin)).toBe(true);
  });

  it("returns false when og:url points to a different domain", () => {
    const html = `<meta property="og:url" content="https://ask-magic-mike.vercel.app/">`;
    expect(hasOgUrl(html, origin)).toBe(false);
  });

  it("returns false when og:url tag is absent", () => {
    const html = `<meta property="og:title" content="Ask Magic Mike">`;
    expect(hasOgUrl(html, origin)).toBe(false);
  });

  it("tolerates a trailing slash in expectedOrigin", () => {
    const html = `<meta property="og:url" content="https://www.askmagicmike.com/">`;
    expect(hasOgUrl(html, "https://www.askmagicmike.com/")).toBe(true);
  });
});

describe("hasCanonical", () => {
  const origin = "https://www.askmagicmike.com";

  it("returns true when canonical link with expected origin is present", () => {
    const html = `<link rel="canonical" href="https://www.askmagicmike.com/" />`;
    expect(hasCanonical(html, origin)).toBe(true);
  });

  it("returns false when canonical href points elsewhere", () => {
    const html = `<link rel="canonical" href="https://ask-magic-mike.vercel.app/" />`;
    expect(hasCanonical(html, origin)).toBe(false);
  });

  it("returns false when no canonical tag is present", () => {
    const html = `<meta property="og:title" content="Ask Magic Mike">`;
    expect(hasCanonical(html, origin)).toBe(false);
  });
});

describe("robotsBlocksAdmin", () => {
  it("returns true when /admin is disallowed", () => {
    const txt = `User-agent: *\nDisallow: /admin\nDisallow: /api/\n`;
    expect(robotsBlocksAdmin(txt)).toBe(true);
  });

  it("returns true with extra whitespace around the colon", () => {
    const txt = `Disallow:  /admin`;
    expect(robotsBlocksAdmin(txt)).toBe(true);
  });

  it("returns false when /admin is not disallowed", () => {
    const txt = `User-agent: *\nDisallow: /api/\n`;
    expect(robotsBlocksAdmin(txt)).toBe(false);
  });

  it("returns false for empty robots.txt", () => {
    expect(robotsBlocksAdmin("")).toBe(false);
  });
});

describe("sitemapHasOrigin", () => {
  const origin = "https://www.askmagicmike.com";

  it("returns true when origin appears in sitemap XML", () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://www.askmagicmike.com/</loc></url></urlset>`;
    expect(sitemapHasOrigin(xml, origin)).toBe(true);
  });

  it("returns false when origin is absent", () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://other.com/</loc></url></urlset>`;
    expect(sitemapHasOrigin(xml, origin)).toBe(false);
  });

  it("tolerates trailing slash in expectedOrigin", () => {
    const xml = `<loc>https://www.askmagicmike.com/value</loc>`;
    expect(sitemapHasOrigin(xml, "https://www.askmagicmike.com/")).toBe(true);
  });
});

describe("hasOgImage", () => {
  it("returns true for a property-first og:image tag", () => {
    const html = `<meta property="og:image" content="https://www.askmagicmike.com/img/card.webp">`;
    expect(hasOgImage(html)).toBe(true);
  });

  it("returns true for a content-first og:image tag", () => {
    const html = `<meta content="https://x/card.webp" property="og:image">`;
    expect(hasOgImage(html)).toBe(true);
  });

  it("returns false when og:image is absent", () => {
    expect(hasOgImage(`<meta property="og:title" content="Ask Magic Mike">`)).toBe(false);
  });
});

describe("hasTwitterImage", () => {
  it("returns true when both twitter:card and twitter:image are present", () => {
    const html = `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://x/card.webp">`;
    expect(hasTwitterImage(html)).toBe(true);
  });

  it("returns false when twitter:image is missing", () => {
    expect(hasTwitterImage(`<meta name="twitter:card" content="summary_large_image">`)).toBe(false);
  });
});

describe("hasNoFunnelReference", () => {
  it("returns true when there is no /funnel reference", () => {
    expect(hasNoFunnelReference(`<a href="/value">Get started</a>`)).toBe(true);
  });

  it("returns false when /funnel appears", () => {
    expect(hasNoFunnelReference(`<meta http-equiv="refresh" content="0;url=/funnel">`)).toBe(false);
  });
});

describe("findStaleNoveltyCopy", () => {
  it("returns empty for clean Ask Magic Mike copy (does not flag the word 'magic')", () => {
    const html = `<h1>Ask Magic Mike</h1><p>Wilson, NC real estate by Our Town Properties.</p>`;
    expect(findStaleNoveltyCopy(html)).toEqual([]);
  });

  it("flags stale novelty / wrong-market markers", () => {
    expect(findStaleNoveltyCopy(`Serving Gainesville, Florida`).length).toBeGreaterThan(0);
    expect(findStaleNoveltyCopy(`rub the lamp and the genie appears`).length).toBeGreaterThan(0);
  });
});

describe("hasNoMlsMarkers", () => {
  it("returns true for clean public HTML", () => {
    const html = `<h1>Ask Magic Mike</h1><p>Get a home value estimate. Not an appraisal.</p>`;
    expect(hasNoMlsMarkers(html)).toBe(true);
  });

  it("returns false when FlexMLS appears", () => {
    expect(hasNoMlsMarkers(`<p>Powered by FlexMLS data</p>`)).toBe(false);
  });

  it("returns false when MLS confidential data tag appears", () => {
    expect(hasNoMlsMarkers(`{"status":"active","mlsNumber":"W123"}`)).toBe(false);
  });

  it("returns false when listing_private_fields appears", () => {
    expect(hasNoMlsMarkers(`<div data-table="listing_private_fields"></div>`)).toBe(false);
  });

  it("returns false when idx feed reference appears", () => {
    expect(hasNoMlsMarkers(`<!-- idx feed import -->`)).toBe(false);
  });
});

describe("extractSecurityHeaders", () => {
  it("returns all true when all security headers are present", () => {
    const headers = {
      "strict-transport-security": "max-age=63072000; includeSubDomains",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
    };
    const result = extractSecurityHeaders(headers);
    expect(result.hsts).toBe(true);
    expect(result.noSniff).toBe(true);
    expect(result.referrerPolicy).toBe(true);
    expect(result.permissionsPolicy).toBe(true);
  });

  it("returns all false when headers are absent", () => {
    const result = extractSecurityHeaders({});
    expect(result.hsts).toBe(false);
    expect(result.noSniff).toBe(false);
    expect(result.referrerPolicy).toBe(false);
    expect(result.permissionsPolicy).toBe(false);
  });

  it("treats x-content-type-options case-insensitively", () => {
    const headers = { "x-content-type-options": "NOSNIFF" };
    expect(extractSecurityHeaders(headers).noSniff).toBe(true);
  });

  it("resolves headers by key lookup when both named keys and lowercase keys are present", () => {
    const headers: Record<string, string> = {
      "strict-transport-security": "max-age=63072000",
      "x-content-type-options": "nosniff",
    };
    const result = extractSecurityHeaders(headers);
    expect(result.hsts).toBe(true);
    expect(result.noSniff).toBe(true);
    expect(result.referrerPolicy).toBe(false);
  });
});
