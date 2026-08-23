/**
 * Tests for the pure helper functions exported by
 * scripts/amm/verify-live-conversion-funnel.mjs
 *
 * No network calls. No secrets. No production data touched.
 * The CLI entry point (runChecks) is not exercised here.
 */
import { describe, expect, it } from "vitest";
import {
  hasStaleVercelUrl,
  hasCanonicalAskMikeLink,
  classifyAdminProtectionResponse,
  hasConfidentialMlsLeak,
  hasSecretLeak,
} from "../../scripts/amm/verify-live-conversion-funnel.mjs";

// ---------------------------------------------------------------------------
// hasStaleVercelUrl
// ---------------------------------------------------------------------------

describe("hasStaleVercelUrl", () => {
  it("returns true when html contains the stale Vercel preview alias", () => {
    expect(hasStaleVercelUrl(
      '<a href="https://ask-magic-mike.vercel.app/value">Get Value</a>'
    )).toBe(true);
  });

  it("returns false when html contains no stale Vercel URL", () => {
    expect(hasStaleVercelUrl(
      '<a href="https://www.ourtownproperties.com/ask-mike/">Ask Mike</a>'
    )).toBe(false);
  });

  it("returns false for unrelated vercel.app domains", () => {
    expect(hasStaleVercelUrl(
      '<a href="https://some-other-project.vercel.app">Other</a>'
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasCanonicalAskMikeLink
// ---------------------------------------------------------------------------

describe("hasCanonicalAskMikeLink", () => {
  it("returns true when html contains the canonical /ask-mike/ path", () => {
    expect(hasCanonicalAskMikeLink(
      '<a href="https://www.ourtownproperties.com/ask-mike/">Ask Mike</a>'
    )).toBe(true);
  });

  it("returns true for the bare domain+path form without protocol", () => {
    expect(hasCanonicalAskMikeLink(
      'href="ourtownproperties.com/ask-mike"'
    )).toBe(true);
  });

  it("returns false when no canonical link is present", () => {
    expect(hasCanonicalAskMikeLink(
      '<a href="https://ask-magic-mike.vercel.app/value">Old link</a>'
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// classifyAdminProtectionResponse
// ---------------------------------------------------------------------------

describe("classifyAdminProtectionResponse", () => {
  const requestUrl = "https://www.askmagicmike.com/admin/revenue";

  it("accepts HTTP 401 as an explicit unauthenticated denial", () => {
    expect(classifyAdminProtectionResponse({ status: 401, requestUrl }).ok).toBe(true);
  });

  it("accepts HTTP 403 as an explicit unauthenticated denial", () => {
    expect(classifyAdminProtectionResponse({ status: 403, requestUrl }).ok).toBe(true);
  });

  it("accepts the production same-origin 307 login handoff", () => {
    const result = classifyAdminProtectionResponse({
      status: 307,
      location: "/lead-center-login?returnTo=%2Fadmin%2Frevenue",
      requestUrl,
    });

    expect(result.ok).toBe(true);
  });

  it("accepts an absolute same-origin login handoff", () => {
    const result = classifyAdminProtectionResponse({
      status: 302,
      location: "https://www.askmagicmike.com/lead-center-login?returnTo=%2Fadmin%2Frevenue",
      requestUrl,
    });

    expect(result.ok).toBe(true);
  });

  it.each([301, 308])("rejects permanent HTTP %s authentication redirects", (status) => {
    const result = classifyAdminProtectionResponse({
      status,
      location: "/lead-center-login?returnTo=%2Fadmin%2Frevenue",
      requestUrl,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("temporary login redirect");
  });

  it("rejects HTTP 200 because this verifier sends no authenticated session", () => {
    const result = classifyAdminProtectionResponse({ status: 200, requestUrl });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("route may be public");
  });

  it("rejects a redirect with no Location header", () => {
    expect(classifyAdminProtectionResponse({ status: 307, requestUrl }).ok).toBe(false);
  });

  it("rejects an external login redirect", () => {
    const result = classifyAdminProtectionResponse({
      status: 307,
      location: "https://example.com/lead-center-login?returnTo=%2Fadmin%2Frevenue",
      requestUrl,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("leaves the canonical origin");
  });

  it("rejects a redirect to a public page", () => {
    const result = classifyAdminProtectionResponse({
      status: 307,
      location: "/?returnTo=%2Fadmin%2Frevenue",
      requestUrl,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("not /lead-center-login");
  });

  it("rejects a login redirect that loses the requested admin path", () => {
    const result = classifyAdminProtectionResponse({
      status: 307,
      location: "/lead-center-login?returnTo=%2Fadmin",
      requestUrl,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("does not preserve returnTo");
  });

  it("rejects ambiguous duplicate returnTo parameters", () => {
    const result = classifyAdminProtectionResponse({
      status: 307,
      location:
        "/lead-center-login?returnTo=%2Fadmin%2Frevenue&returnTo=%2Fadmin%2Fleads",
      requestUrl,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("returnTo exactly once");
  });

  it("preserves the query string when the protected request has one", () => {
    const result = classifyAdminProtectionResponse({
      status: 307,
      location:
        "/lead-center-login?returnTo=%2Fadmin%2Frevenue%3Ffilter%3Dactive",
      requestUrl: `${requestUrl}?filter=active`,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a malformed absolute Location header", () => {
    const result = classifyAdminProtectionResponse({
      status: 307,
      location: "http://[",
      requestUrl,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("not a valid URL");
  });

  it("rejects HTTP 500", () => {
    expect(classifyAdminProtectionResponse({ status: 500, requestUrl }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasConfidentialMlsLeak
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
    expect(hasConfidentialMlsLeak("Lockbox: Supra")).toBe(true);
  });

  it("detects 'Showing Instructions'", () => {
    expect(hasConfidentialMlsLeak("Showing Instructions: Call agent")).toBe(true);
  });

  it("detects 'BrokerBay'", () => {
    expect(hasConfidentialMlsLeak("Schedule via BrokerBay")).toBe(true);
  });

  it("detects 'Agent Remarks'", () => {
    expect(hasConfidentialMlsLeak("Agent Remarks: Back on market")).toBe(true);
  });

  it("does NOT fail for 'Our Town FlexMLS Portal' in navigation", () => {
    expect(hasConfidentialMlsLeak(
      '<a href="https://portal.flexmls.com/login">Our Town FlexMLS Portal</a>'
    )).toBe(false);
  });

  it("does NOT fail for 'portal.flexmls.com' URL alone", () => {
    expect(hasConfidentialMlsLeak(
      "Visit portal.flexmls.com to search listings."
    )).toBe(false);
  });

  it("does NOT fail for 'FlexMLS' without confidential context", () => {
    expect(hasConfidentialMlsLeak(
      "Search the FlexMLS database for Wilson NC homes."
    )).toBe(false);
  });

  it("returns false for clean public copy", () => {
    expect(hasConfidentialMlsLeak(
      "Ask Mike for guidance on buying or selling in Wilson, NC."
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasSecretLeak
// ---------------------------------------------------------------------------

describe("hasSecretLeak", () => {
  it("detects SUPABASE_SERVICE_ROLE_KEY", () => {
    expect(hasSecretLeak("SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...")).toBe(true);
  });

  it("detects sb_secret prefix", () => {
    expect(hasSecretLeak("token: sb_secret_xxxxxxxxxx")).toBe(true);
  });

  it("detects sk_live_ prefix", () => {
    expect(hasSecretLeak("stripe_key: sk_live_abc123")).toBe(true);
  });

  it("detects OPENAI_API_KEY", () => {
    expect(hasSecretLeak("OPENAI_API_KEY=sk-proj-xxx")).toBe(true);
  });

  it("detects RESEND_API_KEY", () => {
    expect(hasSecretLeak("RESEND_API_KEY=re_abc")).toBe(true);
  });

  it("detects ADMIN_SECRET", () => {
    expect(hasSecretLeak("ADMIN_SECRET=somesecret")).toBe(true);
  });

  it("detects CRON_SECRET", () => {
    expect(hasSecretLeak("CRON_SECRET=aabbcc")).toBe(true);
  });

  it("returns false for clean public HTML", () => {
    expect(hasSecretLeak(
      "<html><body><h1>Ask Magic Mike</h1></body></html>"
    )).toBe(false);
  });

  it("returns false for text that merely mentions 'secret' without marker prefix", () => {
    expect(hasSecretLeak(
      "This is not a secret page. We value your privacy."
    )).toBe(false);
  });
});
