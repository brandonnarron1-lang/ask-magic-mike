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
  collectFiles,
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
  "docs/GO_NO_GO_COMMAND_CENTER.md",
  "docs/CONTROLLED_TRAFFIC_ACTIVATION.md",
];

export const REQUIRED_ROUTES = [
  "src/app/(intake)/ask/layout.tsx",
  "src/app/(intake)/ask/page.tsx",
  "src/app/(campaign)/value/page.tsx",
  "src/app/(embed)/embed/ask/page.tsx",
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
  const SRC = join(ROOT, "src");

  const srcFiles = collectFiles(SRC, [".ts", ".tsx"]);

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

  const heroPath = join(SRC, "components/landing/hero-section.tsx");
  if (fileContains(heroPath, "/ask")) {
    pass("cta:hero_links_ask", "hero-section.tsx links to /ask");
  } else {
    fail("cta:hero_links_ask", "hero-section.tsx does not link to /ask");
  }

  if (fileContains(heroPath, "/value")) {
    pass("cta:hero_links_value", "hero-section.tsx links to /value");
  } else {
    fail("cta:hero_links_value", "hero-section.tsx does not link to /value");
  }

  const footerPath = join(SRC, "components/landing/footer.tsx");
  if (fileContains(footerPath, "/ask")) {
    pass("cta:footer_links_ask", "footer.tsx links to /ask");
  } else {
    fail("cta:footer_links_ask", "footer.tsx does not link to /ask");
  }

  if (fileContains(footerPath, "/value")) {
    pass("cta:footer_links_value", "footer.tsx links to /value");
  } else {
    fail("cta:footer_links_value", "footer.tsx does not link to /value");
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

  const staleUrls = findStaleVercelUrls(srcFiles);
  if (staleUrls.length === 0) {
    pass("cta:no_stale_vercel_urls", "no stale vercel.app URLs in src/");
  } else {
    fail("cta:no_stale_vercel_urls", `stale URLs in: ${staleUrls.join(", ")}`);
  }

  const redTokenFiles = findRedTokens(srcFiles);
  if (redTokenFiles.length === 0) {
    pass("cta:no_red_tokens", "no prohibited red-* Tailwind tokens in src/");
  } else {
    fail("cta:no_red_tokens", `red-* tokens in: ${redTokenFiles.join(", ")}`);
  }

  const noveltyFiles = findNoveltyCopy(srcFiles);
  if (noveltyFiles.length === 0) {
    pass("cta:no_novelty_copy", "no genie/magic lamp copy in src/");
  } else {
    fail("cta:no_novelty_copy", `novelty copy in: ${noveltyFiles.join(", ")}`);
  }

  const mlsFiles = findMlsMarkers(srcFiles);
  if (mlsFiles.length === 0) {
    pass("cta:no_mls_markers", "no MLS/IDX markers in public src/");
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
