#!/usr/bin/env node
/**
 * Strict CI gate. Reads artifacts/launch-authority-report.json
 * (preferred) and falls back to artifacts/release-candidate-report.json.
 *
 * Exit codes:
 *   0 — verdict is acceptable at the requested level (default
 *       LOCAL_READY). The default is intentionally permissive so this
 *       can run in PR CI without requiring preview secrets.
 *   1 — verdict below the required level or the artifact is missing.
 *
 * Environment:
 *   REQUIRE_VERDICT — one of:
 *     LOCAL_READY (default)
 *     PREVIEW_READY
 *     MUTATION_READY
 *     PROMOTION_READY
 *
 * Never promotes. Never mutates. Never prints secrets.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const REPO_ROOT = resolve(".");

const LADDER = [
  "BLOCKED",
  "LOCAL_READY",
  "PREVIEW_READY",
  "MUTATION_READY",
  "PROMOTION_READY",
];

const REQUIRE = (process.env.REQUIRE_VERDICT ?? "LOCAL_READY").toUpperCase();

async function readJson(path) {
  try {
    const text = await readFile(resolve(REPO_ROOT, path), "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function rankOf(verdict) {
  const idx = LADDER.indexOf(verdict);
  return idx === -1 ? -1 : idx;
}

async function main() {
  const required = rankOf(REQUIRE);
  if (required === -1) {
    console.error(
      `release:assert — REQUIRE_VERDICT must be one of ${LADDER.join(", ")}`
    );
    process.exit(2);
  }

  const launch = await readJson("artifacts/launch-authority-report.json");
  const rc = await readJson("artifacts/release-candidate-report.json");

  if (!launch && !rc) {
    console.error(
      "release:assert — neither launch-authority-report.json nor release-candidate-report.json found. " +
        "Run `npm run release:report && npm run launch:authority` first."
    );
    process.exit(1);
  }

  if (launch) {
    const actual = launch.verdict?.verdict ?? "BLOCKED";
    const ok = rankOf(actual) >= required;
    console.log(
      `release:assert — verdict=${actual} required=${REQUIRE} ${ok ? "OK" : "FAIL"}`
    );
    if (!ok && Array.isArray(launch.verdict?.missing_work)) {
      for (const m of launch.verdict.missing_work) console.log(`  - ${m}`);
    }
    process.exit(ok ? 0 : 1);
  }

  // Fallback: derive a coarse pass/fail from release-candidate-report.
  const go = rc?.verdict?.go === true;
  const synthetic = go ? "LOCAL_READY" : "BLOCKED";
  const ok = rankOf(synthetic) >= required;
  console.log(
    `release:assert (fallback) — release-candidate go=${go} synthetic=${synthetic} required=${REQUIRE} ${ok ? "OK" : "FAIL"}`
  );
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(2);
});
