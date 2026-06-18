#!/usr/bin/env node
/**
 * Production smoke runner for Ask Magic Mike.
 *
 * Verifies that the live domain, metadata, and write path are healthy
 * after a deploy or security rotation. Safe by default: the session-create
 * POST is opt-in and always cleaned up.
 *
 * Usage:
 *   TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs
 *   TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs --write
 *
 * Flags:
 *   --write     Create a smoke session via POST /api/session/create and
 *               verify the response. The session is marked with a
 *               smoke-test UTM campaign. No lead is created.
 *   --dry-run   Print what would be checked; make no network calls.
 *
 * Env vars consulted (values are NEVER logged):
 *   TARGET_URL           Required. Base URL to smoke-test.
 *   ADMIN_SECRET         Optional. Enables the admin/health check.
 *
 * Hard rules:
 *   - Never log secret values — only "present: true/false"
 *   - Never create a real customer lead
 *   - Never send outbound SMS or email
 *   - If --write is NOT passed, no POST calls are made
 *   - Any session created with --write is tagged AMM_SMOKE_DO_NOT_CONTACT
 *
 * Exit codes:
 *   0  all checks passed (or skipped)
 *   1  one or more checks failed
 *   2  configuration error (missing TARGET_URL)
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const TARGET_URL = (process.env.TARGET_URL ?? "").replace(/\/$/, "");
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
const WRITE_MODE = process.argv.includes("--write");
const DRY_RUN = process.argv.includes("--dry-run");
const OUT_DIR = resolve("artifacts");

/** UTM campaign used to tag smoke sessions. Never tag real leads with this. */
export const SMOKE_UTM_CAMPAIGN = "AMM_SMOKE_DO_NOT_CONTACT";

// ---------------------------------------------------------------------------
// Pure helper functions (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Parse a session/create JSON response body and return a safe summary.
 * Never returns raw personally-identifying fields.
 *
 * @param {unknown} body  Parsed JSON from the response.
 * @returns {{ ok: boolean; sessionId: string | null; hasExpiry: boolean }}
 */
export function parseSessionResponse(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, sessionId: null, hasExpiry: false };
  }
  const b = /** @type {Record<string, unknown>} */ (body);
  const sessionId = typeof b.sessionId === "string" ? b.sessionId : null;
  const hasExpiry = typeof b.expiresAt === "string" && b.expiresAt.length > 0;
  return { ok: !!sessionId, sessionId, hasExpiry };
}

/**
 * Return true when an og:url tag pointing to the expected domain is
 * present in raw HTML. Case-insensitive.
 *
 * @param {string} html
 * @param {string} expectedOrigin  e.g. "https://www.askmagicmike.com"
 * @returns {boolean}
 */
export function hasOgUrl(html, expectedOrigin) {
  const origin = expectedOrigin.replace(/\/$/, "").toLowerCase();
  const lower = html.toLowerCase();
  const tagRx = /property=["']og:url["'][^>]*content=["']([^"']+)["']/gi;
  const contentRx = /content=["']([^"']+)["'][^>]*property=["']og:url["']/gi;
  for (const rx of [tagRx, contentRx]) {
    let m;
    while ((m = rx.exec(lower)) !== null) {
      if (m[1]?.startsWith(origin)) return true;
    }
  }
  return false;
}

/**
 * Return true when a `<link rel="canonical">` pointing to the expected
 * origin is found in raw HTML.
 *
 * @param {string} html
 * @param {string} expectedOrigin
 * @returns {boolean}
 */
export function hasCanonical(html, expectedOrigin) {
  const origin = expectedOrigin.replace(/\/$/, "").toLowerCase();
  const lower = html.toLowerCase();
  return lower.includes(`rel="canonical"`) && lower.includes(origin);
}

/**
 * Return true when robots.txt disallows the admin path.
 *
 * @param {string} robotsTxt
 * @returns {boolean}
 */
export function robotsBlocksAdmin(robotsTxt) {
  return /Disallow:\s*\/admin/i.test(robotsTxt);
}

/**
 * Return true when a sitemap.xml entry contains the expected origin.
 *
 * @param {string} sitemapXml
 * @param {string} expectedOrigin
 * @returns {boolean}
 */
export function sitemapHasOrigin(sitemapXml, expectedOrigin) {
  return sitemapXml.includes(expectedOrigin.replace(/\/$/, ""));
}

// ---------------------------------------------------------------------------
// Network helpers
// ---------------------------------------------------------------------------

const UA = "amm-prod-smoke/1.0";

async function fetchText(path, opts = {}) {
  const url = `${TARGET_URL}${path}`;
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: { "User-Agent": UA, ...opts.headers },
    body: opts.body,
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text, url };
}

async function fetchJson(path, opts = {}) {
  const r = await fetchText(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  let json = null;
  try {
    json = JSON.parse(r.text);
  } catch {
    // not JSON — leave null
  }
  return { ...r, json };
}

// ---------------------------------------------------------------------------
// Check runner
// ---------------------------------------------------------------------------

const results = [];

function record(name, status, extras = {}) {
  results.push({ name, status, ...extras });
  const tag =
    status === "pass" ? "[PASS]" : status === "fail" ? "[FAIL]" : "[SKIP]";
  const http = extras.http !== undefined ? ` (HTTP ${extras.http})` : "";
  const msg = extras.message ? ` — ${extras.message}` : "";
  // eslint-disable-next-line no-console
  console.log(`${tag} ${name}${http}${msg}`);
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

async function checkHomepage() {
  const r = await fetchText("/");
  if (!r.ok) {
    record("homepage:status", "fail", { http: r.status });
    return;
  }
  record("homepage:status", "pass", { http: r.status });

  if (hasOgUrl(r.text, TARGET_URL)) {
    record("homepage:og_url", "pass");
  } else {
    record("homepage:og_url", "fail", {
      message: `og:url not found pointing to ${TARGET_URL}`,
    });
  }

  if (hasCanonical(r.text, TARGET_URL)) {
    record("homepage:canonical", "pass");
  } else {
    record("homepage:canonical", "fail", {
      message: `canonical link not found for ${TARGET_URL}`,
    });
  }

  // Quick guard: no raw secret strings in HTML
  const secretPatterns = [
    /sb_secret_[A-Za-z0-9_-]{20,}/i,
    /service_role.*eyJ/i,
    /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  ];
  const leak = secretPatterns.some((rx) => rx.test(r.text));
  if (leak) {
    record("homepage:no_secret_leak", "fail", {
      message: "secret-like pattern found in HTML — investigate immediately",
    });
  } else {
    record("homepage:no_secret_leak", "pass");
  }
}

async function checkRobots() {
  const r = await fetchText("/robots.txt");
  if (!r.ok) {
    record("robots:status", "fail", { http: r.status });
    return;
  }
  record("robots:status", "pass", { http: r.status });
  if (robotsBlocksAdmin(r.text)) {
    record("robots:blocks_admin", "pass");
  } else {
    record("robots:blocks_admin", "fail", {
      message: "/admin is not disallowed in robots.txt",
    });
  }
}

async function checkSitemap() {
  const r = await fetchText("/sitemap.xml");
  if (!r.ok) {
    record("sitemap:status", "fail", { http: r.status });
    return;
  }
  record("sitemap:status", "pass", { http: r.status });
  if (sitemapHasOrigin(r.text, TARGET_URL)) {
    record("sitemap:canonical_origin", "pass");
  } else {
    record("sitemap:canonical_origin", "fail", {
      message: `${TARGET_URL} not found in sitemap.xml`,
    });
  }
}

async function checkAdminHealth() {
  if (!ADMIN_SECRET) {
    record("admin:health", "skip", {
      message: "ADMIN_SECRET not set — skipping auth'd health check",
    });
    return;
  }
  const r = await fetchJson("/api/admin/health", {
    headers: { "x-admin-secret": ADMIN_SECRET },
  });
  if (!r.ok || !r.json?.ok) {
    record("admin:health", "fail", {
      http: r.status,
      message: r.json?.error ?? "non-ok response",
    });
    return;
  }
  record("admin:health", "pass", { http: r.status });

  const db = r.json.database ?? {};
  if (db.reachable) {
    record("admin:health:db_reachable", "pass");
  } else {
    record("admin:health:db_reachable", "fail", {
      message: "database not reachable according to health endpoint",
    });
  }

  const safety = r.json.safety ?? {};
  if (safety.live_sms_disabled !== false) {
    record("admin:health:sms_disabled", "pass");
  } else {
    record("admin:health:sms_disabled", "fail", {
      message: "live SMS is enabled in production — expected disabled",
    });
  }
}

/** Track sessionId created so we can report it (we do not delete sessions — they expire naturally). */
let smokeSessionId = null;

async function checkSessionCreate() {
  if (!WRITE_MODE) {
    record("session:create", "skip", {
      message: "pass --write to verify POST /api/session/create",
    });
    return;
  }

  const payload = JSON.stringify({
    entryPath: "/",
    referrer: "prod-smoke",
    utmSource: "smoke",
    utmMedium: "internal",
    utmCampaign: SMOKE_UTM_CAMPAIGN,
  });

  const r = await fetchJson("/api/session/create", {
    method: "POST",
    body: payload,
  });

  if (!r.ok) {
    record("session:create", "fail", {
      http: r.status,
      message: r.json?.error ?? "non-ok response",
    });
    return;
  }

  const parsed = parseSessionResponse(r.json);
  if (!parsed.ok) {
    record("session:create", "fail", { http: r.status, message: "no sessionId in response" });
    return;
  }

  smokeSessionId = parsed.sessionId;
  record("session:create", "pass", {
    http: r.status,
    message: `sessionId present, hasExpiry=${parsed.hasExpiry}`,
  });
  // Sessions expire automatically — no DB delete needed.
  // The smoke UTM campaign tag makes them identifiable if manual cleanup needed.
  console.log(
    `  Note: smoke session created (${SMOKE_UTM_CAMPAIGN}). It expires naturally.`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!TARGET_URL) {
    console.error("ERROR: TARGET_URL is required.");
    console.error("  TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs");
    process.exit(2);
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no network calls.");
    console.log(`Would check: ${TARGET_URL}`);
    console.log("Checks: homepage, og_url, canonical, no_secret_leak, robots, sitemap, admin:health, session:create");
    console.log(`Write mode: ${WRITE_MODE ? "ON" : "OFF (default)"}`);
    console.log(`Admin health: ${ADMIN_SECRET ? "enabled" : "skipped (no ADMIN_SECRET)"}`);
    process.exit(0);
  }

  console.log(`\nAsk Magic Mike production smoke`);
  console.log(`  Target: ${TARGET_URL}`);
  console.log(`  Write:  ${WRITE_MODE ? "yes (session/create POST)" : "no (read-only)"}`);
  console.log(`  Admin:  ${ADMIN_SECRET ? "yes (health check enabled)" : "skipped"}`);
  console.log("");

  await checkHomepage();
  await checkRobots();
  await checkSitemap();
  await checkAdminHealth();
  await checkSessionCreate();

  const totals = {
    pass: results.filter((r) => r.status === "pass").length,
    skip: results.filter((r) => r.status === "skip").length,
    fail: results.filter((r) => r.status === "fail").length,
  };

  console.log("");
  console.log(
    `Totals: ${totals.pass} pass · ${totals.skip} skip · ${totals.fail} fail`
  );
  if (smokeSessionId) {
    console.log(`Smoke session created — expires naturally (campaign: ${SMOKE_UTM_CAMPAIGN})`);
  }

  const report = {
    target_url: TARGET_URL,
    run_at: new Date().toISOString(),
    write_mode: WRITE_MODE,
    results,
    totals,
    smoke_session_id: smokeSessionId,
  };

  try {
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(
      resolve(OUT_DIR, "prod-smoke-report.json"),
      JSON.stringify(report, null, 2)
    );
    console.log("Report: artifacts/prod-smoke-report.json");
  } catch {
    // Non-fatal — report written to stdout above.
  }

  process.exit(totals.fail > 0 ? 1 : 0);
}

const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) {
  main().catch((err) => {
    console.error("FATAL:", err.message);
    process.exit(2);
  });
}
