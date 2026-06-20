/**
 * verify-social-preview.mjs
 *
 * Read-only crawl-simulation check for Ask Magic Mike social preview health.
 * Tests each public URL with browser + six social crawler user agents.
 * No secrets required. No production data touched.
 *
 * Run: node scripts/amm/verify-social-preview.mjs
 *       pnpm run amm:verify:social-preview
 *
 * Pure helper functions are exported for unit testing.
 * Network calls only execute when this file is run directly (not imported).
 */

import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

export const CRAWLER_AGENTS = {
  browser:          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  facebook:         "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  twitter:          "Twitterbot/1.0",
  linkedin:         "LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com)",
  slack:            "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  discord:          "Mozilla/5.0 (compatible; Discordbot/1.0; +https://discordapp.com)",
};

/** Status codes that indicate a crawler block (not a graceful 4xx). */
export const CRAWLER_BLOCK_STATUSES = new Set([403, 406, 429, 503]);

/**
 * Patterns that indicate CONFIDENTIAL MLS listing data leaked into public HTML.
 * Does NOT match ordinary public portal navigation ("Our Town FlexMLS Portal",
 * portal.flexmls.com links) — those are expected on public OTP pages.
 */
export const MLS_CONFIDENTIAL_PATTERNS = [
  /Confidential - May Only Be Distributed/i,
  /MLS #\d/i,
  /Lockbox:/i,
  /Showing Instructions/i,
  /BrokerBay/i,
  /Agent Remarks/i,
];

// ---------------------------------------------------------------------------
// Exported pure helper functions — synchronous, no network calls
// ---------------------------------------------------------------------------

/** Returns true when the HTTP status indicates a crawler was blocked. */
export function isCrawlerBlocked(status) {
  return CRAWLER_BLOCK_STATUSES.has(status);
}

/** Returns true when 401 is acceptable (admin-protected endpoints only). */
export function isAcceptableAdminStatus(status) {
  return status === 401 || status === 200;
}

/**
 * Extracts the og:title content from an HTML string.
 * Handles both attribute orderings: property first or content first.
 */
export function extractOgTitle(html) {
  const m =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*\/?>/i);
  return m ? m[1] : null;
}

/**
 * Extracts the og:image content from an HTML string.
 */
export function extractOgImage(html) {
  const m =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*\/?>/i);
  return m ? m[1] : null;
}

/**
 * Extracts the og:description content from an HTML string.
 */
export function extractOgDescription(html) {
  const m =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*\/?>/i);
  return m ? m[1] : null;
}

/**
 * Returns the list of missing required OG tags for a given HTML string.
 * An empty array means all required tags are present.
 */
export function missingOgTags(html) {
  const missing = [];
  if (!extractOgTitle(html))       missing.push("og:title");
  if (!extractOgImage(html))       missing.push("og:image");
  if (!extractOgDescription(html)) missing.push("og:description");
  return missing;
}

/** Returns true if html contains the stale Vercel preview alias. */
export function hasStaleVercelUrl(html) {
  return html.includes("ask-magic-mike.vercel.app");
}

/** Returns true if html contains the canonical OTP ask-mike URL. */
export function hasCanonicalAskMikeLink(html) {
  return html.includes("ourtownproperties.com/ask-mike");
}

/**
 * Returns true if html contains confidential MLS listing data.
 * Does NOT fail for public FlexMLS portal navigation text.
 */
export function hasConfidentialMlsLeak(html) {
  return MLS_CONFIDENTIAL_PATTERNS.some((p) => p.test(html));
}

// ---------------------------------------------------------------------------
// URLs under test
// ---------------------------------------------------------------------------

const URLS_TO_CHECK = [
  {
    label:        "AMM Homepage",
    url:          "https://www.askmagicmike.com/",
    checkOg:      true,
    checkStale:   true,
    checkAskMike: false,
  },
  {
    label:        "AMM /ask page",
    url:          "https://www.askmagicmike.com/ask",
    checkOg:      true,
    checkStale:   true,
    checkAskMike: false,
  },
  {
    label:        "AMM /value page",
    url:          "https://www.askmagicmike.com/value",
    checkOg:      true,
    checkStale:   true,
    checkAskMike: false,
  },
  {
    label:        "OTP /ask-mike/ embed page",
    url:          "https://www.ourtownproperties.com/ask-mike/",
    checkOg:      true,
    checkStale:   true,
    checkAskMike: true,
  },
  {
    label:        "OTP Mike Eatmon profile",
    url:          "https://www.ourtownproperties.com/agents/mike-eatmon/",
    checkOg:      true,
    checkStale:   true,
    checkAskMike: true,
  },
];

// ---------------------------------------------------------------------------
// CLI-only state
// ---------------------------------------------------------------------------

let pass = 0;
let fail = 0;

function ok(label) {
  console.log(`    PASS  ${label}`);
  pass++;
}

function err(label, detail = "") {
  console.log(`    FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  fail++;
}

function warn(label, detail = "") {
  console.log(`    WARN  ${label}${detail ? ` — ${detail}` : ""}`);
  // Warn does not increment fail — it is advisory only.
}

async function fetchWithAgent(url, userAgent, method = "HEAD") {
  const res = await fetch(url, {
    method,
    redirect: "follow",
    headers: { "User-Agent": userAgent },
  });
  return { status: res.status, res };
}

async function fetchHtmlWithAgent(url, userAgent) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { "User-Agent": userAgent },
  });
  return { status: res.status, html: res.ok ? await res.text() : "" };
}

// ---------------------------------------------------------------------------
// Main CLI runner — only executes when run directly, not when imported
// ---------------------------------------------------------------------------

async function runChecks() {
  console.log("\nAsk Magic Mike — Social Preview Readiness Verify");
  console.log("=".repeat(54));
  console.log("Tests each URL with browser + 5 social crawler user agents.");
  console.log("A crawler is considered BLOCKED at HTTP 403, 406, 429, or 503.");

  const blockedSummary = [];

  for (const target of URLS_TO_CHECK) {
    console.log(`\n[${target.label}]`);
    console.log(`  URL: ${target.url}`);

    // Step 1: browser baseline GET (needed for OG parsing)
    let baselineHtml = "";
    let baselineStatus = 0;
    try {
      const { status, html } = await fetchHtmlWithAgent(target.url, CRAWLER_AGENTS.browser);
      baselineStatus = status;
      baselineHtml = html;
      status === 200
        ? ok(`Browser baseline: HTTP ${status}`)
        : err(`Browser baseline: HTTP ${status}`);
    } catch (e) {
      err("Browser baseline: fetch failed", String(e));
    }

    // Step 2: crawler HEAD checks
    const crawlerEntries = Object.entries(CRAWLER_AGENTS).filter(([k]) => k !== "browser");
    const crawlerResults = [];

    for (const [name, ua] of crawlerEntries) {
      try {
        const { status } = await fetchWithAgent(target.url, ua, "HEAD");
        const blocked = isCrawlerBlocked(status);
        if (blocked) {
          err(`${name}: HTTP ${status} — BLOCKED`);
          blockedSummary.push({ url: target.url, crawler: name, status });
          crawlerResults.push({ name, status, blocked: true });
        } else {
          ok(`${name}: HTTP ${status}`);
          crawlerResults.push({ name, status, blocked: false });
        }
      } catch (e) {
        err(`${name}: fetch failed`, String(e));
        crawlerResults.push({ name, status: 0, blocked: true });
      }
    }

    // Step 3: OG tag checks (from browser baseline HTML)
    if (target.checkOg && baselineHtml) {
      const missing = missingOgTags(baselineHtml);
      if (missing.length === 0) {
        ok(`OG tags present (title, image, description)`);
      } else {
        err(`Missing OG tags: ${missing.join(", ")}`);
      }

      // Log found values for visibility
      const title = extractOgTitle(baselineHtml);
      const image = extractOgImage(baselineHtml);
      const desc  = extractOgDescription(baselineHtml);
      if (title)  console.log(`    INFO  og:title = "${title.slice(0, 80)}"`);
      if (image)  console.log(`    INFO  og:image = "${image.slice(0, 80)}"`);
      if (desc)   console.log(`    INFO  og:description = "${desc.slice(0, 80)}"`);
    }

    // Step 4: stale Vercel URL check
    if (target.checkStale && baselineHtml) {
      !hasStaleVercelUrl(baselineHtml)
        ? ok("No stale ask-magic-mike.vercel.app URL")
        : err("STALE URL: ask-magic-mike.vercel.app found in HTML");
    }

    // Step 5: canonical ask-mike link check
    if (target.checkAskMike && baselineHtml) {
      hasCanonicalAskMikeLink(baselineHtml)
        ? ok("Canonical ourtownproperties.com/ask-mike link present")
        : warn("Canonical ask-mike link not detected (may use a different CTA path)");
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(54));
  console.log(`  Checks: ${pass + fail}   PASS: ${pass}   FAIL: ${fail}`);
  console.log("=".repeat(54));

  if (blockedSummary.length > 0) {
    console.log("\n  CRAWLER BLOCKS DETECTED:");
    for (const b of blockedSummary) {
      console.log(`    ${b.url}  →  ${b.crawler}  HTTP ${b.status}`);
    }
    console.log("\n  REMEDIATION:");
    console.log("    The affected host is blocking social crawlers by user agent.");
    console.log("    This is typically a Cloudflare Bot Fight Mode or WAF rule on the host.");
    console.log("    To fix on OTP WordPress:");
    console.log("      1. Log into Cloudflare or the host WAF for ourtownproperties.com");
    console.log("      2. Allow FacebookExternalHit, Twitterbot, LinkedInBot, Slackbot, Discordbot");
    console.log("      3. Or add a firewall exception for these user agent strings");
    console.log("      4. Re-run: pnpm run amm:verify:social-preview");
    console.log("    Ask Magic Mike (askmagicmike.com) is hosted on Vercel which does not");
    console.log("    block social crawlers by default — check Vercel Edge Config if AMM blocks.");
  }

  if (fail === 0) {
    console.log("\n  SOCIAL_PREVIEW_VERIFY_PASS\n");
    process.exit(0);
  } else {
    console.log("\n  SOCIAL_PREVIEW_VERIFY_FAIL\n");
    process.exit(1);
  }
}

// Run only when invoked directly (not when imported by tests)
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runChecks().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
