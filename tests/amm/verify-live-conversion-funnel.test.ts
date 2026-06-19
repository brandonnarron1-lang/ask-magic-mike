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
  isAcceptableAdminStatus,
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
// isAcceptableAdminStatus
// ---------------------------------------------------------------------------

describe("isAcceptableAdminStatus", () => {
  it("accepts HTTP 401 (unauthenticated — expected)", () => {
    expect(isAcceptableAdminStatus(401)).toBe(true);
  });

  it("accepts HTTP 200 (authenticated session)", () => {
    expect(isAcceptableAdminStatus(200)).toBe(true);
  });

  it("rejects HTTP 302 redirect", () => {
    expect(isAcceptableAdminStatus(302)).toBe(false);
  });

  it("rejects HTTP 500", () => {
    expect(isAcceptableAdminStatus(500)).toBe(false);
  });

  it("rejects HTTP 403", () => {
    expect(isAcceptableAdminStatus(403)).toBe(false);
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
