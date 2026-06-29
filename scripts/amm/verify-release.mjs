/**
 * verify-release.mjs
 *
 * Master release gate for Ask Magic Mike. Orchestrates all pre-release
 * verification checks in order. Exits 1 if any stage fails so CI can
 * block a bad deploy.
 *
 * Requires:
 *   TARGET_URL   Base URL of the deployment to verify
 *   ADMIN_SECRET Admin secret for authenticated endpoints
 *
 * Usage (typically run after a deployment completes):
 *   TARGET_URL=https://www.askmagicmike.com ADMIN_SECRET=xxx node scripts/amm/verify-release.mjs
 *
 * Exit codes:
 *   0  Release verified — safe to route traffic
 *   1  Release verification failed — do not route traffic
 */

import { fileURLToPath } from "url";
import { execSync } from "child_process";

const TARGET = process.env.TARGET_URL?.replace(/\/$/, "") ?? "https://www.askmagicmike.com";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

function run(label, cmd) {
  console.log(`\n[${label}]`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env, TARGET_URL: TARGET, ADMIN_SECRET } });
    return true;
  } catch {
    return false;
  }
}

async function checkAdminHealth() {
  console.log("\n[Admin Health]");
  if (!ADMIN_SECRET) {
    console.log("  SKIP  ADMIN_SECRET not set");
    return true;
  }
  try {
    const res = await fetch(`${TARGET}/api/admin/health`, {
      headers: { "x-admin-secret": ADMIN_SECRET },
    });
    if (res.status === 200) {
      const body = await res.json();
      const dbOk = body.database?.reachable === true;
      const envOk = body.env?.supabase_url_present && body.env?.supabase_service_role_present && body.env?.admin_secret_present;

      if (dbOk && envOk) {
        console.log("  PASS  /api/admin/health — DB reachable, env vars present");
        return true;
      } else {
        if (!dbOk) console.log("  FAIL  /api/admin/health — DB not reachable");
        if (!envOk) console.log("  FAIL  /api/admin/health — required env vars missing");
        return false;
      }
    } else {
      console.log(`  FAIL  /api/admin/health — HTTP ${res.status}`);
      return false;
    }
  } catch (e) {
    console.log(`  FAIL  /api/admin/health — ${e}`);
    return false;
  }
}

async function runRelease() {
  console.log("\nAsk Magic Mike — Release Verification");
  console.log("=".repeat(48));
  console.log(`  Target: ${TARGET}`);
  console.log(`  Date:   ${new Date().toISOString()}`);

  const results = [];

  // Stage 1: Startup (liveness, readiness, dependencies)
  results.push(run(
    "Stage 1: Startup",
    `node ${new URL("verify-startup.mjs", import.meta.url).pathname}`
  ));

  // Stage 2: Health endpoints
  results.push(run(
    "Stage 2: Health",
    `node ${new URL("verify-health.mjs", import.meta.url).pathname}`
  ));

  // Stage 3: Admin health telemetry
  results.push(await checkAdminHealth());

  // Stage 4: Conversion funnel (public surface check)
  results.push(run(
    "Stage 4: Conversion Funnel",
    `node ${new URL("verify-live-conversion-funnel.mjs", import.meta.url).pathname}`
  ));

  // ─── Summary ──────────────────────────────────────────────────────────────
  const stageLabels = ["Startup", "Health", "Admin Health", "Conversion Funnel"];
  console.log("\n" + "=".repeat(48));
  console.log("  Release Stage Summary:");
  for (let i = 0; i < results.length; i++) {
    console.log(`    ${results[i] ? "PASS" : "FAIL"}  Stage ${i + 1}: ${stageLabels[i]}`);
  }
  console.log("=".repeat(48));

  const allPassed = results.every(Boolean);
  if (allPassed) {
    console.log("\n  RELEASE_VERIFY_PASS — safe to promote\n");
    process.exit(0);
  } else {
    const failedCount = results.filter((r) => !r).length;
    console.log(`\n  RELEASE_VERIFY_FAIL — ${failedCount} stage(s) failed\n`);
    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runRelease().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
