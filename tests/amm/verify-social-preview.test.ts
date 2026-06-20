/**
 * Tests for pure helper functions exported by
 * scripts/amm/verify-social-preview.mjs
 *
 * No network calls. No secrets. No production data touched.
 * The CLI entry point (runChecks) is not exercised here.
 */
import { describe, expect, it } from "vitest";
import {
  isCrawlerBlocked,
  isAcceptableAdminStatus,
  extractOgTitle,
  extractOgImage,
  extractOgDescription,
  missingOgTags,
  hasStaleVercelUrl,
  hasCanonicalAskMikeLink,
  hasConfidentialMlsLeak,
  CRAWLER_BLOCK_STATUSES,
  CRAWLER_AGENTS,
} from "../../scripts/amm/verify-social-preview.mjs";

// ---------------------------------------------------------------------------
// isCrawlerBlocked
// ---------------------------------------------------------------------------

describe("isCrawlerBlocked", () => {
  it("returns true for HTTP 403", () => {
    expect(isCrawlerBlocked(403)).toBe(true);
  });

  it("returns true for HTTP 406", () => {
    expect(isCrawlerBlocked(406)).toBe(true);
  });

  it("returns true for HTTP 429 (rate limited)", () => {
    expect(isCrawlerBlocked(429)).toBe(true);
  });

  it("returns true for HTTP 503 (service unavailable / bot block)", () => {
    expect(isCrawlerBlocked(503)).toBe(true);
  });

  it("returns false for HTTP 200", () => {
    expect(isCrawlerBlocked(200)).toBe(false);
  });

  it("returns false for HTTP 301 redirect", () => {
    expect(isCrawlerBlocked(301)).toBe(false);
  });

  it("returns false for HTTP 401 (unauthenticated, not blocked)", () => {
    expect(isCrawlerBlocked(401)).toBe(false);
  });

  it("CRAWLER_BLOCK_STATUSES set contains exactly 403, 406, 429, 503", () => {
    expect(CRAWLER_BLOCK_STATUSES.has(403)).toBe(true);
    expect(CRAWLER_BLOCK_STATUSES.has(406)).toBe(true);
    expect(CRAWLER_BLOCK_STATUSES.has(429)).toBe(true);
    expect(CRAWLER_BLOCK_STATUSES.has(503)).toBe(true);
    expect(CRAWLER_BLOCK_STATUSES.has(200)).toBe(false);
    expect(CRAWLER_BLOCK_STATUSES.has(401)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAcceptableAdminStatus
// ---------------------------------------------------------------------------

describe("isAcceptableAdminStatus", () => {
  it("accepts 401 for unauthenticated admin access (expected behavior)", () => {
    expect(isAcceptableAdminStatus(401)).toBe(true);
  });

  it("accepts 200 for authenticated admin access", () => {
    expect(isAcceptableAdminStatus(200)).toBe(true);
  });

  it("rejects 302 redirect (should not redirect admin to login page)", () => {
    expect(isAcceptableAdminStatus(302)).toBe(false);
  });

  it("rejects 403 (wrong — admin should 401 not 403)", () => {
    expect(isAcceptableAdminStatus(403)).toBe(false);
  });

  it("rejects 500 server error", () => {
    expect(isAcceptableAdminStatus(500)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractOgTitle
// ---------------------------------------------------------------------------

describe("extractOgTitle", () => {
  it("extracts og:title when property comes before content", () => {
    const html = `<meta property="og:title" content="Ask Magic Mike | Wilson NC"/>`;
    expect(extractOgTitle(html)).toBe("Ask Magic Mike | Wilson NC");
  });

  it("extracts og:title when content comes before property", () => {
    const html = `<meta content="Ask Mike About Your Home" property="og:title"/>`;
    expect(extractOgTitle(html)).toBe("Ask Mike About Your Home");
  });

  it("returns null when og:title is absent", () => {
    expect(extractOgTitle("<html><head></head></html>")).toBeNull();
  });

  it("does not confuse og:description with og:title", () => {
    const html = `<meta property="og:description" content="A description"/><meta property="og:title" content="The Title"/>`;
    expect(extractOgTitle(html)).toBe("The Title");
  });

  it("handles single quotes in attribute values", () => {
    const html = `<meta property='og:title' content='Mike Eatmon · Our Town Properties'/>`;
    expect(extractOgTitle(html)).toBe("Mike Eatmon · Our Town Properties");
  });
});

// ---------------------------------------------------------------------------
// extractOgImage
// ---------------------------------------------------------------------------

describe("extractOgImage", () => {
  it("extracts og:image when property comes before content", () => {
    const html = `<meta property="og:image" content="https://www.askmagicmike.com/images/og-card.webp"/>`;
    expect(extractOgImage(html)).toBe("https://www.askmagicmike.com/images/og-card.webp");
  });

  it("extracts og:image when content comes before property", () => {
    const html = `<meta content="/images/mike-headshot.webp" property="og:image"/>`;
    expect(extractOgImage(html)).toBe("/images/mike-headshot.webp");
  });

  it("returns null when og:image is absent", () => {
    expect(extractOgImage("<html><head></head></html>")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractOgDescription
// ---------------------------------------------------------------------------

describe("extractOgDescription", () => {
  it("extracts og:description", () => {
    const html = `<meta property="og:description" content="Broker-reviewed guidance from Our Town Properties."/>`;
    expect(extractOgDescription(html)).toBe("Broker-reviewed guidance from Our Town Properties.");
  });

  it("returns null when og:description is absent", () => {
    expect(extractOgDescription("<html></html>")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// missingOgTags
// ---------------------------------------------------------------------------

describe("missingOgTags", () => {
  const fullOg = `
    <meta property="og:title" content="Ask Mike"/>
    <meta property="og:image" content="https://www.askmagicmike.com/og.png"/>
    <meta property="og:description" content="Real local guidance."/>
  `;

  it("returns empty array when all three OG tags are present", () => {
    expect(missingOgTags(fullOg)).toHaveLength(0);
  });

  it("flags og:title as missing", () => {
    const html = `
      <meta property="og:image" content="https://example.com/img.png"/>
      <meta property="og:description" content="Desc"/>
    `;
    expect(missingOgTags(html)).toContain("og:title");
  });

  it("flags og:image as missing", () => {
    const html = `
      <meta property="og:title" content="Title"/>
      <meta property="og:description" content="Desc"/>
    `;
    expect(missingOgTags(html)).toContain("og:image");
  });

  it("flags og:description as missing", () => {
    const html = `
      <meta property="og:title" content="Title"/>
      <meta property="og:image" content="https://example.com/img.png"/>
    `;
    expect(missingOgTags(html)).toContain("og:description");
  });

  it("flags all three when HTML is empty", () => {
    expect(missingOgTags("<html></html>")).toEqual(
      expect.arrayContaining(["og:title", "og:image", "og:description"])
    );
  });
});

// ---------------------------------------------------------------------------
// hasStaleVercelUrl
// ---------------------------------------------------------------------------

describe("hasStaleVercelUrl", () => {
  it("detects ask-magic-mike.vercel.app stale URL", () => {
    expect(hasStaleVercelUrl('<a href="https://ask-magic-mike.vercel.app/value">Value</a>')).toBe(true);
  });

  it("returns false for the canonical askmagicmike.com domain", () => {
    expect(hasStaleVercelUrl('<a href="https://www.askmagicmike.com/value">Value</a>')).toBe(false);
  });

  it("returns false for other vercel.app subdomains", () => {
    expect(hasStaleVercelUrl('<a href="https://some-other-project.vercel.app">Other</a>')).toBe(false);
  });

  it("returns false for clean HTML", () => {
    expect(hasStaleVercelUrl("<html><body>Ask Mike about your home.</body></html>")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasCanonicalAskMikeLink
// ---------------------------------------------------------------------------

describe("hasCanonicalAskMikeLink", () => {
  it("returns true for full canonical URL", () => {
    expect(hasCanonicalAskMikeLink(
      '<a href="https://www.ourtownproperties.com/ask-mike/">Ask Mike</a>'
    )).toBe(true);
  });

  it("returns true for URL without protocol", () => {
    expect(hasCanonicalAskMikeLink(
      'href="ourtownproperties.com/ask-mike"'
    )).toBe(true);
  });

  it("returns false when canonical link is absent", () => {
    expect(hasCanonicalAskMikeLink(
      '<a href="https://ask-magic-mike.vercel.app/value">Old link</a>'
    )).toBe(false);
  });

  it("returns false for clean HTML with no OTP link", () => {
    expect(hasCanonicalAskMikeLink(
      "<html><body>Ask Mike about Wilson, NC.</body></html>"
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasConfidentialMlsLeak — must NOT flag public FlexMLS portal text
// ---------------------------------------------------------------------------

describe("hasConfidentialMlsLeak", () => {
  it("detects 'Confidential - May Only Be Distributed'", () => {
    expect(hasConfidentialMlsLeak(
      "Confidential - May Only Be Distributed to RRAR Members"
    )).toBe(true);
  });

  it("detects 'MLS #' followed by a digit", () => {
    expect(hasConfidentialMlsLeak("MLS #12345")).toBe(true);
  });

  it("detects 'Lockbox:' marker", () => {
    expect(hasConfidentialMlsLeak("Lockbox: Supra eKey")).toBe(true);
  });

  it("detects 'Showing Instructions'", () => {
    expect(hasConfidentialMlsLeak("Showing Instructions: Call agent first")).toBe(true);
  });

  it("detects 'BrokerBay'", () => {
    expect(hasConfidentialMlsLeak("Schedule showing via BrokerBay")).toBe(true);
  });

  it("detects 'Agent Remarks'", () => {
    expect(hasConfidentialMlsLeak("Agent Remarks: Home back on market")).toBe(true);
  });

  it("does NOT flag 'Our Town FlexMLS Portal' public navigation link", () => {
    expect(hasConfidentialMlsLeak(
      '<a href="https://portal.flexmls.com/login">Our Town FlexMLS Portal</a>'
    )).toBe(false);
  });

  it("does NOT flag 'portal.flexmls.com' URL alone", () => {
    expect(hasConfidentialMlsLeak(
      "Visit portal.flexmls.com to search Wilson area listings."
    )).toBe(false);
  });

  it("does NOT flag 'FlexMLS' without a confidential context marker", () => {
    expect(hasConfidentialMlsLeak(
      "Search the FlexMLS database for Wilson NC homes."
    )).toBe(false);
  });

  it("returns false for clean public copy", () => {
    expect(hasConfidentialMlsLeak(
      "Ask Mike for guidance on buying or selling in Wilson, NC."
    )).toBe(false);
  });

  it("returns false for standard AMM copy", () => {
    expect(hasConfidentialMlsLeak(
      "Broker-reviewed guidance from Our Town Properties. Not an appraisal."
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CRAWLER_AGENTS — sanity checks
// ---------------------------------------------------------------------------

describe("CRAWLER_AGENTS", () => {
  it("contains all six expected agents", () => {
    expect(Object.keys(CRAWLER_AGENTS)).toEqual(
      expect.arrayContaining(["browser", "facebook", "twitter", "linkedin", "slack", "discord"])
    );
  });

  it("facebook agent contains 'facebookexternalhit'", () => {
    expect(CRAWLER_AGENTS.facebook).toContain("facebookexternalhit");
  });

  it("twitter agent contains 'Twitterbot'", () => {
    expect(CRAWLER_AGENTS.twitter).toContain("Twitterbot");
  });

  it("linkedin agent contains 'LinkedInBot'", () => {
    expect(CRAWLER_AGENTS.linkedin).toContain("LinkedInBot");
  });

  it("slack agent contains 'Slackbot'", () => {
    expect(CRAWLER_AGENTS.slack).toContain("Slackbot");
  });

  it("discord agent contains 'Discordbot'", () => {
    expect(CRAWLER_AGENTS.discord).toContain("Discordbot");
  });
});
