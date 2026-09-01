#!/usr/bin/env node
/**
 * launch-authority-report.mjs
 *
 * Read-only Go/No-Go authority report for Ask Magic Mike.
 * Imports pure helpers from launch-readiness-doctor.mjs and adds
 * authority-specific checks against the canonical current-release manifest.
 *
 * No network calls. No secrets read. No .env files read.
 * No production mutations.
 *
 * Usage:
 *   node scripts/amm/launch-authority-report.mjs
 *   vercel env ls production --format json | \
 *     jq '{envs:[.envs[]|{key,target,type}]}' | \
 *     node scripts/amm/launch-authority-report.mjs --vercel-json-stdin
 *   npm run amm:launch:authority
 *
 * Exit codes:
 *   0  GO or NOT_GO_OWNER_ACTION_REQUIRED (no code failures)
 *   1  NOT_GO_FAILING_CHECKS (code/doc failures exist)
 *
 * Authority outputs:
 *   LAUNCH_AUTHORITY: GO_CONTROLLED_TRAFFIC_READY
 *   LAUNCH_AUTHORITY: NOT_GO_OWNER_ACTION_REQUIRED
 *   LAUNCH_AUTHORITY: NOT_GO_FAILING_CHECKS
 */

import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

import {
  readFileSafe,
  collectFiles,
  findStaleVercelUrls,
  findRedTokens,
  findNoveltyCopy,
  findMlsMarkers,
  checkCanonicalSiteConfig,
  findStaleVercelUrlsInDocs,
  REQUIRED_PRODUCTION_ENV_VARS,
  parseVercelProductionEnvNames,
  classifyEmailProviderPresence,
  classifyFailClosedGatePresence,
  loadCurrentProductionAuthority,
  releaseLogMatchesCurrentProduction,
} from "./launch-readiness-doctor.mjs";

// ---------------------------------------------------------------------------
// Exported constants and helpers — for unit tests
// ---------------------------------------------------------------------------

export const AUTHORITY_GO = "GO_CONTROLLED_TRAFFIC_READY";
export const AUTHORITY_NOT_GO_OWNER = "NOT_GO_OWNER_ACTION_REQUIRED";
export const AUTHORITY_NOT_GO_FAIL = "NOT_GO_FAILING_CHECKS";

export const REQUIRED_AUTHORITY_DOCS = [
  "docs/CONTROLLED_LAUNCH_RUNBOOK.md",
  "docs/OWNER_ACTION_PROOF_PACK.md",
  "docs/PRODUCTION_DEPLOY_REHEARSAL.md",
  "docs/GO_NO_GO_COMMAND_CENTER.md",
  "docs/KNOWN_BLOCKERS.md",
  "docs/PRODUCTION_RELEASE_LOG.md",
  "docs/PRODUCTION_LAUNCH_GATE.md",
];

export const OWNER_GATED_VARS = [...REQUIRED_PRODUCTION_ENV_VARS];

/**
 * Determine the launch authority result given check counters.
 * Pure function — suitable for unit testing without running the full script.
 */
export function computeAuthorityStatus(failCount, skipCount) {
  if (failCount > 0) return AUTHORITY_NOT_GO_FAIL;
  if (skipCount > 0) return AUTHORITY_NOT_GO_OWNER;
  return AUTHORITY_GO;
}

/**
 * Check that all required authority docs exist.
 * Returns array of missing doc paths (relative).
 */
export function findMissingAuthorityDocs(root) {
  return REQUIRED_AUTHORITY_DOCS.filter((rel) => !existsSync(join(root, rel)));
}

/**
 * Check that all required package scripts exist in package.json.
 * Returns array of missing script names.
 */
export function findMissingPackageScripts(root, requiredScripts) {
  const pkg = JSON.parse(readFileSafe(join(root, "package.json")) || "{}");
  return requiredScripts.filter((s) => !pkg.scripts?.[s]);
}

/**
 * Check that required env vars are present in the current process.
 * Returns array of missing var names.
 */
export function findMissingEnvVars(varNames) {
  return varNames.filter((v) => !process.env[v]);
}

// ---------------------------------------------------------------------------
// Script entry point
// ---------------------------------------------------------------------------

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../");

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const SRC = join(ROOT, "src");
  const SCRIPTS = join(ROOT, "scripts");

  const appFiles = collectFiles(join(ROOT, "app"), [".ts", ".tsx"]);
  const srcFiles = collectFiles(SRC, [".ts", ".tsx"]);
  const deployableFiles = [...appFiles, ...srcFiles];

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  function pass(label, detail = "") {
    passCount++;
    process.stdout.write(`  PASS        ${label}${detail ? "  — " + detail : ""}\n`);
  }

  function fail(label, detail = "") {
    failCount++;
    process.stderr.write(`  FAIL        ${label}${detail ? "  — " + detail : ""}\n`);
  }

  function skipOwner(label, detail = "") {
    skipCount++;
    process.stdout.write(`  SKIP_OWNER  ${label}${detail ? "  — " + detail : ""}\n`);
  }

  console.log("\nAsk Magic Mike — Launch Authority Report\n");

  // ── Required package scripts ──────────────────────────────────────────────
  console.log("[Package scripts]");
  const requiredScripts = [
    "typecheck", "lint", "test", "build",
    "amm:verify:funnel", "amm:smoke:prod",
    "amm:launch:doctor", "amm:launch:authority",
  ];
  const missingScripts = findMissingPackageScripts(ROOT, requiredScripts);
  for (const s of requiredScripts) {
    if (missingScripts.includes(s)) {
      fail(`script missing: ${s}`);
    } else {
      pass(`script exists: ${s}`);
    }
  }

  // ── Required cockpit docs ────────────────────────────────────────────────
  console.log("\n[Launch cockpit docs]");
  const missingDocs = findMissingAuthorityDocs(ROOT);
  for (const rel of REQUIRED_AUTHORITY_DOCS) {
    if (missingDocs.includes(rel)) {
      fail(`doc missing: ${rel}`);
    } else {
      pass(`doc exists: ${rel}`);
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
    const result = releaseLogMatchesCurrentProduction(releaseLogPath, production);
    if (result.ok) {
      pass(`release log matches current Production PR #${production.pr}`);
    } else {
      fail(`release log is stale for current Production PR #${production.pr}`, result.reason);
    }
  }

  // ── Stale vercel.app URLs in operational docs ────────────────────────────
  console.log("\n[Stale vercel.app URLs in operational docs]");
  const operationalDocs = [
    join(ROOT, "docs/CONTROLLED_LAUNCH_RUNBOOK.md"),
    join(ROOT, "docs/OWNER_ACTION_PROOF_PACK.md"),
    join(ROOT, "docs/PRODUCTION_DEPLOY_REHEARSAL.md"),
    join(ROOT, "docs/GO_NO_GO_COMMAND_CENTER.md"),
  ].filter(existsSync);
  const staleDocUrls = findStaleVercelUrlsInDocs(operationalDocs);
  if (staleDocUrls.length === 0) {
    pass("no stale vercel.app URLs in launch cockpit docs");
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

  // ── Prohibited red-* tokens ──────────────────────────────────────────────
  console.log("\n[Prohibited red-* UI tokens]");
  const redTokens = findRedTokens(deployableFiles);
  if (redTokens.length === 0) {
    pass("no prohibited red-* tokens in deployable app/ or src/");
  } else {
    fail(
      `red-* tokens found in ${redTokens.length} file(s)`,
      redTokens.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── Novelty genie/lamp copy ──────────────────────────────────────────────
  console.log("\n[Novelty genie/lamp copy]");
  const novelty = findNoveltyCopy(deployableFiles);
  if (novelty.length === 0) {
    pass("no prohibited genie/lamp copy in deployable app/ or src/");
  } else {
    fail(
      `genie/lamp copy found in ${novelty.length} file(s)`,
      novelty.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── MLS/FlexMLS markers in public src/ ───────────────────────────────────
  console.log("\n[MLS/FlexMLS confidential markers in public src/]");
  const mlsHits = findMlsMarkers(deployableFiles);
  if (mlsHits.length === 0) {
    pass("no MLS/FlexMLS markers in deployable public source");
  } else {
    fail(
      `MLS markers found in ${mlsHits.length} file(s)`,
      mlsHits.map((f) => f.replace(ROOT + "/", "")).join(", ")
    );
  }

  // ── Canonical site config ────────────────────────────────────────────────
  console.log("\n[Canonical site configuration]");
  const cfgResult = checkCanonicalSiteConfig(join(SRC, "lib/site-config.ts"));
  if (cfgResult.ok) {
    pass("site-config.ts canonical domain points to askmagicmike.com");
  } else {
    fail("site-config.ts canonical domain check failed", cfgResult.reason);
  }

  // ── Production scripts exist ─────────────────────────────────────────────
  console.log("\n[Production scripts]");
  const criticalScripts = [
    ["scripts/prod-smoke.mjs", "prod-smoke.mjs"],
    ["scripts/amm/verify-live-conversion-funnel.mjs", "verify-live-conversion-funnel.mjs"],
    ["scripts/amm/launch-readiness-doctor.mjs", "launch-readiness-doctor.mjs"],
  ];
  for (const [rel, label] of criticalScripts) {
    if (existsSync(join(ROOT, rel))) {
      pass(`script exists: ${label}`);
    } else {
      fail(`script missing: ${label}`, rel);
    }
  }

  // ── Production env metadata ──────────────────────────────────────────────
  const vercelManifestMode = process.argv.includes("--vercel-json-stdin");
  let verifiedProductionEnvNames = null;
  console.log(
    vercelManifestMode
      ? "\n[Production Vercel env metadata — names and scopes only]"
      : "\n[Owner-gated production env vars (not verifiable here)]",
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

  for (const v of OWNER_GATED_VARS) {
    if (observedNames.has(v)) {
      pass(`${vercelManifestMode ? "production env var present" : "env var present locally"}: ${v}`);
    } else if (vercelManifestMode && verifiedProductionEnvNames) {
      fail(`required Production env var missing: ${v}`);
    } else {
      skipOwner(
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
    skipOwner(
      "EMAIL_PROVIDER value needs verification",
      "name-only metadata proves selector presence but not a supported value",
    );
  } else if (vercelManifestMode && verifiedProductionEnvNames) {
    fail("email provider is not configured");
  } else {
    skipOwner(
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
      skipOwner(
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
  const authorityStatus = computeAuthorityStatus(failCount, skipCount);

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `  Checks: ${passCount + failCount + skipCount}   PASS: ${passCount}   FAIL: ${failCount}   SKIP_OWNER: ${skipCount}`
  );
  console.log(`${"=".repeat(60)}`);
  console.log(`\n  LAUNCH_AUTHORITY: ${authorityStatus}\n`);

  if (authorityStatus === AUTHORITY_NOT_GO_FAIL) {
    process.stderr.write(
      `  ACTION REQUIRED: ${failCount} check(s) must be resolved before any traffic.\n` +
      `  Run: npm run amm:launch:doctor for full detail.\n\n`
    );
    process.exit(1);
  }

  if (authorityStatus === AUTHORITY_NOT_GO_OWNER) {
    process.stdout.write(
      `  ACTION REQUIRED: ${skipCount} owner-gated item(s) must be completed.\n` +
      `  Procedure: docs/CONTROLLED_LAUNCH_RUNBOOK.md\n` +
      `  Evidence:  docs/OWNER_ACTION_PROOF_PACK.md\n` +
      `  Timeline:  docs/PRODUCTION_DEPLOY_REHEARSAL.md\n\n`
    );
  }

  if (authorityStatus === AUTHORITY_GO) {
    process.stdout.write(
      `  All checks PASS. Controlled traffic is authorized.\n` +
      `  Review docs/GO_NO_GO_COMMAND_CENTER.md §12 before sending traffic.\n\n`
    );
  }
}
