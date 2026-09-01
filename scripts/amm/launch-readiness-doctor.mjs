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
 *   vercel env ls production --format json | \
 *     jq '{envs:[.envs[]|{key,target,type}]}' | \
 *     node scripts/amm/launch-readiness-doctor.mjs --vercel-json-stdin
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

/**
 * Collect every source tree that can ship in the current Next.js build.
 * Root app/ is canonical; src/ remains deployable for delegated routes and
 * shared modules, so release checks must cover both without double counting.
 */
export function collectDeployableFiles(root, exts = [".ts", ".tsx"]) {
  return ["app", "src"].flatMap((dir) => collectFiles(join(root, dir), exts));
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
  /\b(?:flexmls|rets\b|idx_feed|mls_number|mls_id|IDX_PIN|RETS_URL)\b|\bMATRIX\b(?=[^\n]{0,48}\b(?:listing|mls|feed|export)\b)|\b(?:listing|mls|feed|export)\b(?=[^\n]{0,48}\bMATRIX\b)/i;

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

export const REQUIRED_PRODUCTION_ENV_VARS = [
  "DATABASE_URL",
  "DATABASE_ENV",
  "LEAD_CENTER_RBAC_ENABLED",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "ADMIN_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "EMAIL_ENABLED",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "LEAD_NOTIFICATION_TO",
  "LEAD_NOTIFICATION_BCC",
  "PHONE_SETUP_SIGNING_SECRET",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
];

export const OPTIONAL_EMAIL_PROVIDER_SELECTOR = "EMAIL_PROVIDER";

export const PRODUCTION_FAIL_CLOSED_GATES = [
  "GROWTH_SPEND_IMPORT_ENABLED",
  "GROWTH_SEARCH_IMPORT_ENABLED",
  "GROWTH_LOCAL_PROFILE_IMPORT_ENABLED",
];

function flattenedTargets(target) {
  if (Array.isArray(target)) return target.flat(Infinity).map(String);
  return target == null ? [] : [String(target)];
}

/**
 * Parse the metadata-only projection produced from
 * `vercel env ls --format json` and return Production-scoped variable names.
 * Values are neither accepted nor returned. This lets release checks verify
 * Vercel configuration without writing secrets into the checkout or logs.
 */
export function parseVercelProductionEnvNames(input) {
  let payload;
  try {
    payload = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    throw new Error("vercel_env_manifest_invalid_json");
  }

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.envs)) {
    throw new Error("vercel_env_manifest_shape_invalid");
  }

  const names = new Set();
  for (const item of payload.envs) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("vercel_env_manifest_entry_invalid");
    }
    const unsafeField = Object.keys(item).find((field) =>
      /^(?:value|decrypted|secretValue|plainValue|password|token)$/i.test(field),
    );
    if (unsafeField) throw new Error("vercel_env_manifest_contains_values");

    const key = typeof item.key === "string" ? item.key.trim() : "";
    if (!key || !/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
    if (flattenedTargets(item.target).includes("production")) names.add(key);
  }
  return [...names].sort();
}

/** Runtime-compatible email provider selector status without reading values. */
export function classifyEmailProviderPresence(names) {
  const present = names instanceof Set ? names : new Set(names);
  if (present.has(OPTIONAL_EMAIL_PROVIDER_SELECTOR)) {
    return { ok: true, mode: "explicit_selector_present", valueVerificationRequired: true };
  }
  if (present.has("RESEND_API_KEY")) {
    return {
      ok: true,
      mode: "resend_inferred_from_existing_key",
      valueVerificationRequired: false,
    };
  }
  return { ok: false, mode: "provider_unconfigured", valueVerificationRequired: false };
}

/**
 * A missing growth-import gate is safe because runtime defaults are false.
 * A name-only manifest cannot prove the value of a present gate.
 */
export function classifyFailClosedGatePresence(names) {
  const present = names instanceof Set ? names : new Set(names);
  return {
    absentSafe: PRODUCTION_FAIL_CLOSED_GATES.filter((name) => !present.has(name)),
    presentNeedsValueVerification: PRODUCTION_FAIL_CLOSED_GATES.filter((name) => present.has(name)),
  };
}

export function findMlsMarkers(files) {
  const hits = [];
  for (const file of files) {
    if (MLS_ALLOWLIST.some((a) => file.includes(a))) continue;
    const content = readFileSafe(file)
      .split("\n")
      .filter((line) => {
        const trimmed = line.trimStart();
        return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
      })
      .join("\n");
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
 * Parse the repository's canonical release-authority manifest and return only
 * the fields required to prove the accepted Production release. The manifest
 * is configuration metadata, never a secret-bearing environment source.
 */
export function parseCurrentProductionAuthority(input) {
  let payload;
  try {
    payload = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    throw new Error("current_release_authority_invalid_json");
  }

  const production = payload?.production;
  const shaPattern = /^[0-9a-f]{40}$/;
  if (
    !payload
    || typeof payload !== "object"
    || !Number.isInteger(payload.schemaVersion)
    || payload.schemaVersion < 1
    || !production
    || typeof production !== "object"
    || !Number.isInteger(production.pr)
    || production.pr < 1
    || !shaPattern.test(String(production.mergeCommit ?? ""))
    || !shaPattern.test(String(production.tree ?? ""))
    || !/^dpl_[A-Za-z0-9]+$/.test(String(production.deploymentId ?? ""))
    || production.status !== "accepted"
  ) {
    throw new Error("current_release_authority_shape_invalid");
  }

  return {
    schemaVersion: payload.schemaVersion,
    pr: production.pr,
    mergeCommit: production.mergeCommit,
    tree: production.tree,
    deploymentId: production.deploymentId,
    status: production.status,
  };
}

export function loadCurrentProductionAuthority(root) {
  const path = join(root, "config/current-release-authority.json");
  const content = readFileSafe(path);
  if (!content) {
    return { ok: false, reason: "current_release_authority_missing" };
  }
  try {
    return { ok: true, authority: parseCurrentProductionAuthority(content) };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error
        ? error.message
        : "current_release_authority_invalid",
    };
  }
}

/**
 * Require one exact release-log block for the accepted Production PR. A mere
 * historical PR mention is insufficient: the block must contain the manifest's
 * merge commit, tree, and Vercel deployment ID.
 */
export function releaseLogMatchesCurrentProduction(releaseLogPath, authority) {
  const content = readFileSafe(releaseLogPath);
  if (!content) return { ok: false, reason: "PRODUCTION_RELEASE_LOG.md not found" };

  const headingPattern = new RegExp(`^## \\[PR #${authority.pr}\\][^\\n]*$`, "m");
  const heading = headingPattern.exec(content);
  if (!heading || heading.index === undefined) {
    return { ok: false, reason: `current PR #${authority.pr} block not found in release log` };
  }

  const afterHeading = content.slice(heading.index + heading[0].length);
  const nextHeadingIndex = afterHeading.search(/^## \\[PR #\d+\\]/m);
  const block = nextHeadingIndex >= 0
    ? afterHeading.slice(0, nextHeadingIndex)
    : afterHeading;
  const required = [
    ["merge commit", authority.mergeCommit],
    ["production tree", authority.tree],
    ["deployment", authority.deploymentId],
  ];
  for (const [label, value] of required) {
    if (!block.includes(value)) {
      return {
        ok: false,
        reason: `current PR #${authority.pr} release-log block missing ${label}`,
      };
    }
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

  const appFiles = collectFiles(join(ROOT, "app"), [".ts", ".tsx"]);
  const srcFiles = collectFiles(SRC, [".ts", ".tsx"]);
  const deployableFiles = [...appFiles, ...srcFiles];

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

  // ── Current release authority and release-log currency ──────────────────
  console.log("\n[Release log currency]");
  const releaseLogPath = join(ROOT, "docs/PRODUCTION_RELEASE_LOG.md");
  const currentAuthority = loadCurrentProductionAuthority(ROOT);
  if (!currentAuthority.ok) {
    fail("current release authority manifest rejected", currentAuthority.reason);
  } else {
    const production = currentAuthority.authority;
    pass(
      `current release authority loaded: PR #${production.pr}`,
      `${production.mergeCommit.slice(0, 7)} / ${production.deploymentId}`,
    );
    const logResult = releaseLogMatchesCurrentProduction(releaseLogPath, production);
    if (logResult.ok) {
      pass(`release log matches current Production PR #${production.pr}`);
    } else {
      fail(`release log is stale for current Production PR #${production.pr}`, logResult.reason);
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
  const staleUrls = findStaleVercelUrls(deployableFiles);
  if (staleUrls.length === 0) {
    pass("no stale vercel.app URLs in deployable app/ or src/");
  } else {
    fail(
      `stale vercel.app URLs found in ${staleUrls.length} file(s)`,
      staleUrls.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── Red-* token check ────────────────────────────────────────────────────
  console.log("\n[Prohibited red-* UI tokens]");
  const redTokens = findRedTokens(deployableFiles);
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
  const novelty = findNoveltyCopy(deployableFiles);
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
  const mlsHits = findMlsMarkers(deployableFiles);
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
  const vercelManifestMode = process.argv.includes("--vercel-json-stdin");
  let verifiedProductionEnvNames = null;
  console.log(
    vercelManifestMode
      ? "\n[Production Vercel env metadata — names and scopes only]"
      : "\n[Owner-gated env var checks (production — not verifiable here)]",
  );

  if (vercelManifestMode) {
    try {
      verifiedProductionEnvNames = new Set(
        parseVercelProductionEnvNames(readFileSync(0, "utf8")),
      );
      pass(
        "Vercel Production metadata parsed without values",
        `${verifiedProductionEnvNames.size} scoped variable names`,
      );
    } catch (error) {
      fail(
        "Vercel Production metadata rejected",
        error instanceof Error ? error.message : "vercel_env_manifest_invalid",
      );
    }
  }

  const observedNames = verifiedProductionEnvNames
    ?? new Set(Object.keys(process.env).filter((name) => Boolean(process.env[name])));

  for (const v of REQUIRED_PRODUCTION_ENV_VARS) {
    if (observedNames.has(v)) {
      pass(`${vercelManifestMode ? "production env var present" : "env var present locally"}: ${v}`);
    } else if (vercelManifestMode && verifiedProductionEnvNames) {
      fail(`required Production env var missing: ${v}`);
    } else {
      skip(
        `env var not set locally: ${v}`,
        "verify name-only presence in Vercel Production metadata",
      );
    }
  }

  const emailProvider = classifyEmailProviderPresence(observedNames);
  const explicitLocalProvider = String(process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  if (!vercelManifestMode && explicitLocalProvider) {
    if (explicitLocalProvider === "resend" || explicitLocalProvider === "smtp") {
      pass("email provider selection is runtime-compatible", "EMAIL_PROVIDER is explicit");
    } else {
      fail("email provider selector is unsupported");
    }
  } else if (emailProvider.ok && !(vercelManifestMode && emailProvider.valueVerificationRequired)) {
    pass(
      "email provider selection is runtime-compatible",
      "Resend is safely inferred from RESEND_API_KEY",
    );
  } else if (vercelManifestMode && emailProvider.valueVerificationRequired) {
    skip(
      "EMAIL_PROVIDER value needs verification",
      "name-only metadata proves selector presence but not a supported value",
    );
  } else if (vercelManifestMode && verifiedProductionEnvNames) {
    fail("email provider is not configured");
  } else {
    skip(
      "email provider selection is not verifiable locally",
      "EMAIL_PROVIDER is optional when the Production RESEND_API_KEY exists",
    );
  }

  const failClosedGates = classifyFailClosedGatePresence(observedNames);
  for (const gate of failClosedGates.absentSafe) {
    if (vercelManifestMode && verifiedProductionEnvNames) {
      pass(`growth import gate absent and fail-closed: ${gate}`);
    }
  }
  for (const gate of failClosedGates.presentNeedsValueVerification) {
    if (vercelManifestMode && verifiedProductionEnvNames) {
      skip(
        `growth import gate value needs verification: ${gate}`,
        "name-only metadata intentionally cannot reveal whether the value is false",
      );
    } else if (String(process.env[gate] ?? "").toLowerCase() === "true") {
      fail(`growth import gate must remain disabled: ${gate}`);
    } else if (process.env[gate]) {
      pass(`growth import gate is locally disabled: ${gate}`);
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
