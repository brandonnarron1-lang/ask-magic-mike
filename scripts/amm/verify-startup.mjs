/**
 * verify-startup.mjs
 *
 * Verifies that all required configuration is present and Supabase is
 * reachable. Intended to run against a live deployment before promoting
 * a release to production traffic.
 *
 * Requires:
 *   TARGET_URL   Base URL of the deployment to check (default: https://www.askmagicmike.com)
 *   ADMIN_SECRET Admin secret for authenticated endpoints
 *
 * Usage:
 *   node scripts/amm/verify-startup.mjs
 *   TARGET_URL=https://preview.askmagicmike.com node scripts/amm/verify-startup.mjs
 *
 * Exit codes:
 *   0  All startup checks pass
 *   1  One or more checks failed
 */

import { fileURLToPath } from "url";

const TARGET = process.env.TARGET_URL?.replace(/\/$/, "") ?? "https://www.askmagicmike.com";
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
  console.log("\nAsk Magic Mike — Startup Verification");
  console.log("=".repeat(48));
  console.log(`  Target: ${TARGET}`);

  // ─── 1. Liveness ────────────────────────────────────────────────────────────
  console.log("\n[Liveness]");
  try {
    const res = await fetch(`${TARGET}/api/health/live`);
    if (res.status === 200) {
      const body = await res.json();
      body.ok === true
        ? ok("/api/health/live returns ok:true")
        : err("/api/health/live returned ok:false");
    } else {
      err("/api/health/live", `HTTP ${res.status}`);
    }
  } catch (e) {
    err("/api/health/live", String(e));
  }

  // ─── 2. Readiness ───────────────────────────────────────────────────────────
  console.log("\n[Readiness]");
  try {
    const res = await fetch(`${TARGET}/api/health/ready`);
    if (res.status === 200) {
      const body = await res.json();
      body.ok === true && body.status === "ready"
        ? ok("/api/health/ready is ready")
        : err("/api/health/ready returned not-ready", JSON.stringify(body));
    } else {
      const body = await res.json().catch(() => ({}));
      err("/api/health/ready", `HTTP ${res.status} — ${body.reason ?? "unknown"}`);
    }
  } catch (e) {
    err("/api/health/ready", String(e));
  }

  // ─── 3. Dependency audit (admin-authenticated) ────────────────────────────
  console.log("\n[Dependencies]");
  if (!ADMIN_SECRET) {
    console.log("  SKIP  /api/health/dependencies — ADMIN_SECRET not set");
  } else {
    try {
      const res = await fetch(`${TARGET}/api/health/dependencies`, {
        headers: { "x-admin-secret": ADMIN_SECRET },
      });
      if (res.status === 200) {
        const body = await res.json();
        ok(`/api/health/dependencies healthy (${body.summary?.passed ?? "?"}/${body.summary?.total ?? "?"} checks)`);

        // Surface any failed checks individually
        if (body.checks) {
          for (const check of body.checks) {
            if (check.status === "fail") {
              err(`  dependency check failed: ${check.name}`, check.message);
            }
          }
        }
      } else if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        err("/api/health/dependencies degraded", `${body.summary?.failed ?? "?"} checks failed`);

        if (body.checks) {
          for (const check of body.checks) {
            if (check.status === "fail") {
              err(`  ${check.name}`, check.message);
            }
          }
        }
      } else {
        err("/api/health/dependencies", `HTTP ${res.status}`);
      }
    } catch (e) {
      err("/api/health/dependencies", String(e));
    }
  }

  // ─── 4. Legacy health ────────────────────────────────────────────────────
  console.log("\n[Legacy Health]");
  try {
    const res = await fetch(`${TARGET}/api/health`);
    res.status === 200
      ? ok("/api/health returns 200")
      : err("/api/health", `HTTP ${res.status}`);
  } catch (e) {
    err("/api/health", String(e));
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(48));
  console.log(`  Checks: ${pass + fail}   PASS: ${pass}   FAIL: ${fail}`);
  console.log("=".repeat(48));

  if (fail === 0) {
    console.log("\n  STARTUP_VERIFY_PASS\n");
    process.exit(0);
  } else {
    console.log("\n  STARTUP_VERIFY_FAIL\n");
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
