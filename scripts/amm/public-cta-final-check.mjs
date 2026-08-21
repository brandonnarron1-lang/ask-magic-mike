#!/usr/bin/env node
/**
 * public-cta-final-check.mjs
 *
 * Read-only static check that all public CTAs and routes are wired correctly
 * before activating WordPress traffic to www.askmagicmike.com.
 *
 * No network calls. No secrets read. No .env files read.
 * No production mutations.
 *
 * Usage:
 *   node scripts/amm/public-cta-final-check.mjs
 *   npm run amm:public:cta-check
 *
 * Exit codes:
 *   0  PUBLIC_CTA_CHECK: PASS
 *   1  PUBLIC_CTA_CHECK: FAIL
 */

import { existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

import {
  readFileSafe,
  collectDeployableFiles,
  findStaleVercelUrls,
  findRedTokens,
  findNoveltyCopy,
  findMlsMarkers,
} from "./launch-readiness-doctor.mjs";

// ---------------------------------------------------------------------------
// Exported helpers — for unit tests
// ---------------------------------------------------------------------------

export const CTA_PASS = "PASS";
export const CTA_FAIL = "FAIL";

export const REQUIRED_CTA_SCRIPTS = [
  "amm:launch:authority",
  "amm:public:cta-check",
];

export const REQUIRED_CTA_DOCS = [
  "docs/CONTROLLED_TRAFFIC_ACTIVATION.md",
  "docs/GO_LIVE_RUNBOOK.md",
  "docs/OWNER_ACTIONS_REMAINING.md",
];

export const REQUIRED_ROUTES = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/ask/page.tsx",
  "app/home-value/page.tsx",
  "app/value/page.tsx",
  "app/sell/page.tsx",
  "app/buy/page.tsx",
  "app/embed/ask/page.tsx",
  "app/widget/v1/page.tsx",
];

export const REQUIRED_CTA_LINKS = [
  { file: "app/components/black-diamond/HeroSection.tsx", href: "/home-value", label: "hero_home_value" },
  { file: "app/components/black-diamond/HeroSection.tsx", href: "/ask", label: "hero_ask" },
  { file: "app/components/black-diamond/BlackDiamondHeader.tsx", href: "/buy", label: "header_buy" },
  { file: "app/components/black-diamond/BlackDiamondShell.tsx", href: "/sell", label: "path_sell" },
  { file: "app/components/black-diamond/BlackDiamondShell.tsx", href: "/buy", label: "path_buy" },
  { file: "app/components/black-diamond/BlackDiamondShell.tsx", href: "/plan", label: "path_plan" },
];

/**
 * Check that a file contains a given substring.
 * Returns true if content is found.
 */
export function fileContains(filePath, substring) {
  const content = readFileSafe(filePath);
  return content.includes(substring);
}

/**
 * Check all required routes exist.
 * Returns array of missing relative paths.
 */
export function findMissingRoutes(root, requiredRoutes) {
  return requiredRoutes.filter((rel) => !existsSync(join(root, rel)));
}

/**
 * Check that required package scripts exist.
 * Returns array of missing script names.
 */
export function findMissingCtaScripts(root, requiredScripts) {
  const pkg = JSON.parse(readFileSafe(join(root, "package.json")) || "{}");
  return requiredScripts.filter((s) => !pkg.scripts?.[s]);
}

/**
 * Check that required docs exist.
 * Returns array of missing relative doc paths.
 */
export function findMissingCtaDocs(root, requiredDocs) {
  return requiredDocs.filter((rel) => !existsSync(join(root, rel)));
}

/**
 * Compute final CTA check status string from fail count.
 */
export function computeCtaStatus(failCount) {
  return failCount > 0 ? CTA_FAIL : CTA_PASS;
}

// ---------------------------------------------------------------------------
// Script entry point
// ---------------------------------------------------------------------------

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../");

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const deployableFiles = collectDeployableFiles(ROOT);

  let passCount = 0;
  let failCount = 0;

  function pass(label, detail = "") {
    passCount++;
    process.stdout.write(`  PASS  ${label}${detail ? "  — " + detail : ""}\n`);
  }

  function fail(label, detail = "") {
    failCount++;
    process.stderr.write(`  FAIL  ${label}${detail ? "  — " + detail : ""}\n`);
  }

  console.log("\nAsk Magic Mike — Public CTA Final Check\n");

  // ── CTA link checks ─────────────────────────────────────────────────────────
  console.log("[CTA links]");

  for (const link of REQUIRED_CTA_LINKS) {
    const path = join(ROOT, link.file);
    if (fileContains(path, link.href)) {
      pass(`cta:${link.label}`, `${link.file} links to ${link.href}`);
    } else {
      fail(`cta:${link.label}`, `${link.file} does not link to ${link.href}`);
    }
  }

  // ── Route existence checks ───────────────────────────────────────────────────
  console.log("\n[Routes]");

  const missingRoutes = findMissingRoutes(ROOT, REQUIRED_ROUTES);
  for (const rel of REQUIRED_ROUTES) {
    if (missingRoutes.includes(rel)) {
      fail(`cta:route_exists`, `missing: ${rel}`);
    } else {
      pass(`cta:route_exists`, rel);
    }
  }

  // ── Source code safety checks ────────────────────────────────────────────────
  console.log("\n[Source safety]");

  const staleUrls = findStaleVercelUrls(deployableFiles);
  if (staleUrls.length === 0) {
    pass("cta:no_stale_vercel_urls", "no stale vercel.app URLs in deployable app/ or src/");
  } else {
    fail("cta:no_stale_vercel_urls", `stale URLs in: ${staleUrls.join(", ")}`);
  }

  const redTokenFiles = findRedTokens(deployableFiles);
  if (redTokenFiles.length === 0) {
    pass("cta:no_red_tokens", "no prohibited red-* Tailwind tokens in deployable app/ or src/");
  } else {
    fail("cta:no_red_tokens", `red-* tokens in: ${redTokenFiles.join(", ")}`);
  }

  const noveltyFiles = findNoveltyCopy(deployableFiles);
  if (noveltyFiles.length === 0) {
    pass("cta:no_novelty_copy", "no genie/magic lamp copy in deployable app/ or src/");
  } else {
    fail("cta:no_novelty_copy", `novelty copy in: ${noveltyFiles.join(", ")}`);
  }

  const mlsFiles = findMlsMarkers(deployableFiles);
  if (mlsFiles.length === 0) {
    pass("cta:no_mls_markers", "no MLS/IDX markers in deployable app/ or src/");
  } else {
    fail("cta:no_mls_markers", `MLS markers in: ${mlsFiles.join(", ")}`);
  }

  // ── Package script checks ────────────────────────────────────────────────────
  console.log("\n[Package scripts]");

  const missingScripts = findMissingCtaScripts(ROOT, REQUIRED_CTA_SCRIPTS);
  for (const s of REQUIRED_CTA_SCRIPTS) {
    if (missingScripts.includes(s)) {
      fail(`cta:script_exists:${s}`, `missing from package.json scripts`);
    } else {
      pass(`cta:script_exists:${s}`);
    }
  }

  // ── Required doc checks ──────────────────────────────────────────────────────
  console.log("\n[Required docs]");

  const missingDocs = findMissingCtaDocs(ROOT, REQUIRED_CTA_DOCS);
  for (const rel of REQUIRED_CTA_DOCS) {
    if (missingDocs.includes(rel)) {
      fail(`cta:doc_exists`, `missing: ${rel}`);
    } else {
      pass(`cta:doc_exists`, rel);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const status = computeCtaStatus(failCount);

  console.log("\n====================================================");
  console.log(`  Checks: ${passCount + failCount}   PASS: ${passCount}   FAIL: ${failCount}`);
  console.log("====================================================\n");
  console.log(`  PUBLIC_CTA_CHECK: ${status}\n`);

  if (status === CTA_FAIL) {
    console.error(
      "  ACTION REQUIRED: Fix all FAIL items before activating WordPress CTAs.\n" +
      "  Procedure: docs/CONTROLLED_TRAFFIC_ACTIVATION.md\n"
    );
    process.exit(1);
  }
}
