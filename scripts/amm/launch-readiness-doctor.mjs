#!/usr/bin/env node
/**
 * launch-readiness-doctor.mjs
 *
 * Read-only static analysis check for Ask Magic Mike launch readiness.
 * Scans the local repository — no network calls, no secrets read, no
 * production mutations.
 *
 * Usage:
 *   node scripts/amm/launch-readiness-doctor.mjs
 *   npm run amm:launch:doctor
 *
 * Exit codes:
 *   0  All checks PASS (or owner-gated SKIPs)
 *   1  At least one FAIL
 *
 * Pure helper functions are exported for unit testing (no side effects
 * when the module is imported rather than run directly).
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Helpers — exported for tests
// ---------------------------------------------------------------------------

/** Recursively collect all files under a directory matching an extension list. */
export function collectFiles(dir, exts = [".ts", ".tsx"]) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      results.push(...collectFiles(full, exts));
    } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

/** Return file contents as a string, or empty string if not found. */
export function readFileSafe(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

/**
 * Detect stale vercel.app preview URLs in user-facing source code.
 * Allowlist: internal config (site-config.ts, visual-system.ts,
 * utm-link-builder.ts) where the URL appears as a blocklist value or alias.
 */
export const VERCEL_URL_PATTERN = /ask-magic-mike\.vercel\.app|\.vercel\.app\/(?!github)/;

export const VERCEL_URL_ALLOWLIST = [
  "site-config.ts",
  "visual-system.ts",
  "utm-link-builder.ts",
];

export function findStaleVercelUrls(files) {
  const hits = [];
  for (const file of files) {
    if (VERCEL_URL_ALLOWLIST.some((a) => file.endsWith(a))) continue;
    const content = readFileSafe(file);
    if (VERCEL_URL_PATTERN.test(content)) {
      hits.push(file);
    }
  }
  return hits;
}

/**
 * Detect prohibited red-NNN Tailwind tokens in UI source.
 * Pattern: text-red-NNN, bg-red-NNN, border-red-NNN, from-red-NNN etc.
 */
export const RED_TOKEN_PATTERN =
  /\b(?:text|bg|border|ring|from|to|via)-red-\d{2,3}\b/;

export function findRedTokens(files) {
  const hits = [];
  for (const file of files) {
    const content = readFileSafe(file);
    // Ignore pure comment lines
    const nonCommentLines = content
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("//") && !l.trimStart().startsWith("*"));
    if (nonCommentLines.join("\n").match(RED_TOKEN_PATTERN)) {
      hits.push(file);
    }
  }
  return hits;
}

/**
 * Detect novelty genie/lamp copy that is prohibited in user-facing source.
 * Allow occurrences that are in comments or code strings that explicitly
 * say "No lamp" / "No genie" (prohibition reminders).
 */
export const NOVELTY_COPY_PATTERN = /\b(?:genie|magic lamp)\b/i;
export const NOVELTY_COPY_NEGATION = /\bno\s+(?:lamp|genie)\b/i;

export function findNoveltyCopy(files) {
  const hits = [];
  for (const file of files) {
    const content = readFileSafe(file);
    // Skip files that only mention these terms in negation (prohibition reminders)
    if (!NOVELTY_COPY_PATTERN.test(content)) continue;
    const lines = content.split("\n");
    const offending = lines.filter((l) => {
      if (!NOVELTY_COPY_PATTERN.test(l)) return false;
      if (NOVELTY_COPY_NEGATION.test(l)) return false;
      if (l.trimStart().startsWith("//") || l.trimStart().startsWith("*")) return false;
      return true;
    });
    if (offending.length > 0) hits.push(file);
  }
  return hits;
}

/**
 * Detect MLS/FlexMLS confidential markers in public-facing source.
 * Admin-only files are excluded since MLS data can be imported there.
 */
export const MLS_PATTERN =
  /\b(?:MATRIX|flexmls|rets\b|idx_feed|mls_number|mls_id|IDX_PIN|RETS_URL)\b/i;

export const MLS_ALLOWLIST = [
  "(admin)",
  "admin/",
  "_inbox_flexmls",
  "real-estate-intelligence",
  "listing-csv-provider",
  "listing-sanitizer",
  "listing.schema",
  "analytics/events",
  "brand-pack-assets",
];

export function findMlsMarkers(files) {
  const hits = [];
  for (const file of files) {
    if (MLS_ALLOWLIST.some((a) => file.includes(a))) continue;
    const content = readFileSafe(file);
    if (MLS_PATTERN.test(content)) hits.push(file);
  }
  return hits;
}

/**
 * Check that the production release log mentions a specific PR number.
 * Used to verify the log is kept current with the merge train.
 */
export function releaseLogMentionsPr(releaseLogPath, prNumber) {
  const content = readFileSafe(releaseLogPath);
  if (!content) return { ok: false, reason: "PRODUCTION_RELEASE_LOG.md not found" };
  const patterns = [`[PR #${prNumber}]`, `PR #${prNumber}`];
  const found = patterns.some((p) => content.includes(p));
  if (!found) {
    return { ok: false, reason: `PR #${prNumber} not found in release log` };
  }
  return { ok: true };
}

/**
 * Check that a set of operational docs do not contain stale vercel.app preview URLs.
 * Unlike the src check, this applies to specified doc paths directly.
 */
export function findStaleVercelUrlsInDocs(docPaths) {
  const hits = [];
  for (const docPath of docPaths) {
    const content = readFileSafe(docPath);
    if (VERCEL_URL_PATTERN.test(content)) hits.push(docPath);
  }
  return hits;
}

/**
 * Verify canonical site URL in site-config.ts points to production domain.
 */
export const CANONICAL_DOMAIN = "askmagicmike.com";

export function checkCanonicalSiteConfig(siteConfigPath) {
  const content = readFileSafe(siteConfigPath);
  if (!content) return { ok: false, reason: "site-config.ts not found" };
  if (!content.includes(CANONICAL_DOMAIN)) {
    return { ok: false, reason: `${CANONICAL_DOMAIN} not found in site-config.ts` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Script entry point
// ---------------------------------------------------------------------------

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../");

// ---------------------------------------------------------------------------
// Main — only runs when executed directly
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const SRC = join(ROOT, "src");
  const DOCS = join(ROOT, "docs");
  const SCRIPTS = join(ROOT, "scripts");

  const srcFiles = collectFiles(SRC, [".ts", ".tsx"]);

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  function pass(label, detail = "") {
    passCount++;
    console.log(`  PASS  ${label}${detail ? "  — " + detail : ""}`);
  }

  function fail(label, detail = "") {
    failCount++;
    console.error(`  FAIL  ${label}${detail ? "  — " + detail : ""}`);
  }

  function skip(label, detail = "") {
    skipCount++;
    console.log(`  SKIP  ${label}${detail ? "  — " + detail : ""}`);
  }

  console.log("\nAsk Magic Mike — Launch Readiness Doctor\n");

  // ── Package scripts ──────────────────────────────────────────────────────
  console.log("[Package scripts]");
  const pkg = JSON.parse(readFileSafe(join(ROOT, "package.json")) || "{}");
  const requiredScripts = [
    "typecheck",
    "lint",
    "test",
    "build",
    "amm:verify:funnel",
    "amm:smoke:prod",
    "amm:launch:doctor",
  ];
  for (const s of requiredScripts) {
    if (pkg.scripts?.[s]) {
      pass(`script exists: ${s}`);
    } else {
      fail(`script missing: ${s}`);
    }
  }

  // ── Required docs ────────────────────────────────────────────────────────
  console.log("\n[Required docs]");
  const requiredDocs = [
    ["docs/PRODUCTION_LAUNCH_GATE.md", "Pre-launch checklist"],
    ["docs/CONTROLLED_LAUNCH_RUNBOOK.md", "Owner action runbook"],
    ["docs/LAUNCH_CANDIDATE_3_FINAL_GATE.md", "Final gate audit"],
    ["docs/KNOWN_BLOCKERS.md", "Known blockers"],
    ["docs/PRODUCTION_RELEASE_LOG.md", "Release log"],
    ["docs/ADMIN_OPERATIONS_GUIDE.md", "Admin ops guide"],
    ["docs/regency-wordpress-handoff.md", "WordPress handoff"],
    ["docs/OWNER_ACTION_PROOF_PACK.md", "Owner proof pack"],
    ["docs/PRODUCTION_DEPLOY_REHEARSAL.md", "Deploy rehearsal checklist"],
  ];
  for (const [rel, label] of requiredDocs) {
    if (existsSync(join(ROOT, rel))) {
      pass(`doc exists: ${label}`, rel);
    } else {
      fail(`doc missing: ${label}`, rel);
    }
  }

  // ── Release log currency check ───────────────────────────────────────────
  console.log("\n[Release log currency]");
  const releaseLogPath = join(ROOT, "docs/PRODUCTION_RELEASE_LOG.md");
  for (const prNum of [49, 50]) {
    const logResult = releaseLogMentionsPr(releaseLogPath, prNum);
    if (logResult.ok) {
      pass(`release log mentions PR #${prNum}`);
    } else {
      fail(`release log missing PR #${prNum} entry`, logResult.reason);
    }
  }

  // ── Stale vercel.app URLs in new operational docs ────────────────────────
  console.log("\n[Stale vercel.app URLs in operational docs]");
  const operationalDocs = [
    join(ROOT, "docs/CONTROLLED_LAUNCH_RUNBOOK.md"),
    join(ROOT, "docs/OWNER_ACTION_PROOF_PACK.md"),
    join(ROOT, "docs/PRODUCTION_DEPLOY_REHEARSAL.md"),
  ].filter(existsSync);
  const staleDocUrls = findStaleVercelUrlsInDocs(operationalDocs);
  if (staleDocUrls.length === 0) {
    pass("no stale vercel.app URLs in operational docs");
  } else {
    fail(
      `stale vercel.app URLs in ${staleDocUrls.length} doc(s)`,
      staleDocUrls.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── Stale vercel.app URLs in src/ ────────────────────────────────────────
  console.log("\n[Stale vercel.app URLs in src/]");
  const staleUrls = findStaleVercelUrls(srcFiles);
  if (staleUrls.length === 0) {
    pass("no stale vercel.app URLs in src/");
  } else {
    fail(
      `stale vercel.app URLs found in ${staleUrls.length} file(s)`,
      staleUrls.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── Red-* token check ────────────────────────────────────────────────────
  console.log("\n[Prohibited red-* UI tokens]");
  const redTokens = findRedTokens(srcFiles);
  if (redTokens.length === 0) {
    pass("no prohibited red-* tokens in src/");
  } else {
    fail(
      `red-* tokens found in ${redTokens.length} file(s)`,
      redTokens.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── Genie/lamp novelty copy ──────────────────────────────────────────────
  console.log("\n[Novelty genie/lamp copy]");
  const novelty = findNoveltyCopy(srcFiles);
  if (novelty.length === 0) {
    pass("no prohibited genie/lamp copy in src/");
  } else {
    fail(
      `genie/lamp copy found in ${novelty.length} file(s)`,
      novelty.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── MLS/FlexMLS markers in public source ─────────────────────────────────
  console.log("\n[MLS/FlexMLS confidential markers in public src/]");
  const mlsHits = findMlsMarkers(srcFiles);
  if (mlsHits.length === 0) {
    pass("no MLS/FlexMLS markers in public src/");
  } else {
    fail(
      `MLS markers found in ${mlsHits.length} file(s)`,
      mlsHits.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── Canonical site config ────────────────────────────────────────────────
  console.log("\n[Canonical site configuration]");
  const siteConfigPath = join(SRC, "lib/site-config.ts");
  const cfgResult = checkCanonicalSiteConfig(siteConfigPath);
  if (cfgResult.ok) {
    pass(`site-config.ts canonical domain points to ${CANONICAL_DOMAIN}`);
  } else {
    fail("site-config.ts canonical domain check failed", cfgResult.reason);
  }

  // ── Production smoke script ──────────────────────────────────────────────
  console.log("\n[Production scripts]");
  const smokeScript = join(ROOT, "scripts/prod-smoke.mjs");
  if (existsSync(smokeScript)) {
    pass("prod-smoke.mjs exists", "scripts/prod-smoke.mjs");
  } else {
    fail("prod-smoke.mjs missing", "scripts/prod-smoke.mjs");
  }

  const funnelScript = join(SCRIPTS, "amm/verify-live-conversion-funnel.mjs");
  if (existsSync(funnelScript)) {
    pass("verify-live-conversion-funnel.mjs exists");
  } else {
    fail("verify-live-conversion-funnel.mjs missing");
  }

  // ── Owner-gated environment variable check ───────────────────────────────
  console.log("\n[Owner-gated env var checks (production — not verifiable here)]");
  const requiredProdVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_SECRET",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_AGENT_LICENSE",
  ];
  for (const v of requiredProdVars) {
    if (process.env[v]) {
      pass(`env var present locally: ${v}`);
    } else {
      skip(
        `env var not set locally: ${v}`,
        "must be set in Vercel Dashboard for production"
      );
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(
    `\n====================================================`
  );
  console.log(
    `  Checks: ${passCount + failCount + skipCount}   PASS: ${passCount}   FAIL: ${failCount}   SKIP: ${skipCount}`
  );
  console.log(`====================================================\n`);

  if (failCount > 0) {
    console.error(
      `  LAUNCH_DOCTOR_FAIL — ${failCount} check(s) must be resolved before traffic.\n`
    );
    process.exit(1);
  }

  if (skipCount > 0) {
    console.log(
      `  LAUNCH_DOCTOR_PASS_WITH_OWNER_ACTIONS — ${skipCount} check(s) require owner action in Vercel.\n`
    );
  } else {
    console.log(`  LAUNCH_DOCTOR_PASS\n`);
  }
}
