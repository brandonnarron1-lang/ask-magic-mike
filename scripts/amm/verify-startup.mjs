/**
 * verify-startup.mjs
 *
 * Verifies that the active Neon-backed runtime is reachable and ready.
 * Intended to run against a live deployment before promoting
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
import {
  isAdminHealthResponse,
  isLiveResponse,
  isReadyResponse,
} from "./verify-health.mjs";

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
      isLiveResponse(body)
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
      isReadyResponse(body)
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
    console.log("  SKIP  /api/admin/health — ADMIN_SECRET not set");
  } else {
    try {
      const res = await fetch(`${TARGET}/api/admin/health`, {
        headers: { "x-admin-secret": ADMIN_SECRET },
      });
      if (res.status === 200) {
        const body = await res.json();
        isAdminHealthResponse(body)
          ? ok("/api/admin/health confirms Neon lead-pipe readiness")
          : err("/api/admin/health", "database or lead-pipe schema is not ready");
      } else {
        err("/api/admin/health", `HTTP ${res.status}`);
      }
    } catch (e) {
      err("/api/admin/health", String(e));
    }
  }

  // ─── 4. Legacy health ────────────────────────────────────────────────────
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
