/**
 * verify-health.mjs
 *
 * Comprehensive health endpoint verification for Ask Magic Mike.
 * Checks all three tiers: liveness, readiness, and dependencies.
 *
 * Requires:
 *   TARGET_URL   Base URL of the deployment (default: https://www.askmagicmike.com)
 *   ADMIN_SECRET Admin secret for authenticated endpoints
 *
 * Usage:
 *   node scripts/amm/verify-health.mjs
 *   TARGET_URL=https://preview.askmagicmike.com ADMIN_SECRET=xxx node scripts/amm/verify-health.mjs
 *
 * Exit codes:
 *   0  All health checks pass
 *   1  One or more checks failed
 */

import { fileURLToPath } from "url";

export const TARGET_DEFAULT = "https://www.askmagicmike.com";

/** Returns true when the response body has ok:true and the expected status field. */
export function isHealthyResponse(body, expectedStatus) {
  return body.ok === true && body.status === expectedStatus;
}

/** Returns all failed check names from a dependency response body. */
export function getFailedChecks(body) {
  if (!Array.isArray(body.checks)) return [];
  return body.checks
    .filter((c) => c.status === "fail")
    .map((c) => c.name);
}

const TARGET = process.env.TARGET_URL?.replace(/\/$/, "") ?? TARGET_DEFAULT;
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

let pass = 0;
let fail = 0;

function ok(label) {
  console.log(`  PASS  ${label}`);
  pass++;
}

function err(label, detail = "") {
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  fail++;
}

async function runChecks() {
  console.log("\nAsk Magic Mike — Health Verification");
  console.log("=".repeat(48));
  console.log(`  Target: ${TARGET}`);

  // ─── Liveness ─────────────────────────────────────────────────────────────
  console.log("\n[Liveness — /api/health/live]");
  try {
    const res = await fetch(`${TARGET}/api/health/live`);
    if (res.status !== 200) {
      err("liveness probe", `HTTP ${res.status} (expected 200)`);
    } else {
      const body = await res.json();
      isHealthyResponse(body, "live")
        ? ok("liveness probe ok")
        : err("liveness probe", `body.ok=${body.ok} body.status=${body.status}`);
    }
  } catch (e) {
    err("liveness probe", String(e));
  }

  // ─── Readiness ────────────────────────────────────────────────────────────
  console.log("\n[Readiness — /api/health/ready]");
  try {
    const res = await fetch(`${TARGET}/api/health/ready`);
    if (res.status === 200) {
      const body = await res.json();
      isHealthyResponse(body, "ready")
        ? ok("readiness probe ok")
        : err("readiness probe", `unexpected body: ${JSON.stringify(body)}`);
    } else if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      err("readiness probe returned not_ready", `reason=${body.reason ?? "unknown"}`);
    } else {
      err("readiness probe", `HTTP ${res.status}`);
    }
  } catch (e) {
    err("readiness probe", String(e));
  }

  // ─── Dependencies ─────────────────────────────────────────────────────────
  console.log("\n[Dependencies — /api/health/dependencies]");
  if (!ADMIN_SECRET) {
    console.log("  SKIP  ADMIN_SECRET not set — skipping dependency check");
  } else {
    try {
      const res = await fetch(`${TARGET}/api/health/dependencies`, {
        headers: { "x-admin-secret": ADMIN_SECRET },
      });

      if (res.status === 401) {
        err("dependency check auth", "401 unauthorized — check ADMIN_SECRET");
      } else if (res.status === 200 || res.status === 503) {
        const body = await res.json();
        const failed = getFailedChecks(body);

        if (res.status === 200) {
          ok(`all dependencies healthy (${body.summary?.passed ?? "?"}/${body.summary?.total ?? "?"} checks)`);
          if (body.summary?.warnings > 0) {
            console.log(`  WARN  ${body.summary.warnings} warning(s)`);
          }
        } else {
          err(`${failed.length} dependency check(s) failed`);
          for (const name of failed) {
            const check = body.checks?.find((c) => c.name === name);
            err(`  ${name}`, check?.message ?? "");
          }
        }
      } else {
        err("dependency check", `HTTP ${res.status}`);
      }
    } catch (e) {
      err("dependency check", String(e));
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(48));
  console.log(`  Checks: ${pass + fail}   PASS: ${pass}   FAIL: ${fail}`);
  console.log("=".repeat(48));

  if (fail === 0) {
    console.log("\n  HEALTH_VERIFY_PASS\n");
    process.exit(0);
  } else {
    console.log("\n  HEALTH_VERIFY_FAIL\n");
    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runChecks().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
