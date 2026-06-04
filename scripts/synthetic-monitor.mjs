#!/usr/bin/env node
/**
 * Synthetic monitor.
 *
 * Runs lightweight non-mutating checks against a target URL after a
 * deployment lands. By design, this script only issues GET (or HEAD)
 * requests — POST/PATCH/PUT/DELETE are forbidden and the release
 * safety scanner enforces that.
 *
 *   TARGET_URL=https://askmagicmike.com npm run monitor:synthetic
 *
 * Optional env:
 *   ADMIN_SECRET                       enables /api/admin/health check
 *   CRON_SECRET                        enables /api/admin/health via Bearer
 *   VERCEL_AUTOMATION_BYPASS_SECRET    Vercel protection bypass header
 *   SET_VERCEL_BYPASS_COOKIE           "true" to also send the cookie header
 *
 * Output:
 *   artifacts/synthetic-monitor-report.json
 *   artifacts/synthetic-monitor-report.md
 *
 * Exits nonzero if any check fails.
 *
 * Hard rules:
 *   - never POST /api/leads
 *   - never write to the DB
 *   - never log raw secrets
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildRequestHeaders,
  redactSecrets,
} from "./preview-qa-lib.mjs";

const TARGET_URL = (process.env.TARGET_URL ?? "").replace(/\/$/, "");
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const OUT_DIR = resolve("artifacts");

const SECRETS = [
  ADMIN_SECRET,
  CRON_SECRET,
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "",
];

const results = [];

function record(name, status, extras = {}) {
  results.push({ name, status, ...extras });
  const tag = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "SKIP";
  const http = extras.http !== undefined ? ` (${extras.http})` : "";
  const msg = extras.message ? ` — ${redactSecrets(extras.message, SECRETS)}` : "";
  // eslint-disable-next-line no-console
  console.log(`[${tag}] ${name}${http}${msg}`);
}

async function getJson(path, extraHeaders = {}) {
  const url = `${TARGET_URL}${path}`;
  const headers = buildRequestHeaders(
    {
      "User-Agent": "amm-synthetic-monitor/1.0",
      ...extraHeaders,
    },
    process.env
  );
  let res;
  try {
    res = await fetch(url, { method: "GET", headers });
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
  const ct = res.headers.get("content-type") ?? "";
  let json = null;
  let text = "";
  if (ct.includes("application/json")) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  } else {
    try {
      text = await res.text();
    } catch {
      text = "";
    }
  }
  return { ok: res.ok, status: res.status, json, text };
}

const FORBIDDEN_LISTING_FIELDS = [
  "agent_remarks",
  "lockbox_info",
  "showing_instructions",
  "compensation",
  "owner_notes",
  "internal_notes",
  "private_remarks",
  "broker_notes",
];

/**
 * Check whether any item in an items array contains a forbidden private
 * MLS field. Exported for unit tests.
 *
 * @param {Array<Record<string, unknown>>} items
 * @returns {string|null} name of the leaking field, or null if clean
 */
export function findPrivateListingLeak(items) {
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    for (const field of FORBIDDEN_LISTING_FIELDS) {
      if (field in item) return field;
    }
  }
  return null;
}

async function publicRoutes() {
  for (const p of ["/", "/ask", "/value", "/widget-preview"]) {
    const r = await getJson(p);
    if (r.status >= 200 && r.status < 400) {
      record(`public:${p}`, "pass", { http: r.status });
    } else {
      record(`public:${p}`, "fail", {
        http: r.status,
        message: r.error ?? `non-2xx response`,
      });
    }
  }
}

async function listingPrivateLeakCheck() {
  const r = await getJson("/api/listings/search?q=Wilson&limit=3");
  if (!r.ok || !r.json) {
    record("listings:search", "fail", {
      http: r.status,
      message: r.error ?? "non-ok response",
    });
    return;
  }
  record("listings:search", "pass", { http: r.status });
  const leak = findPrivateListingLeak(r.json.items);
  if (leak) {
    record("listings:no_private_field_leak", "fail", {
      message: `private MLS field "${leak}" present in public listing response`,
    });
  } else {
    record("listings:no_private_field_leak", "pass", { http: r.status });
  }
}

async function healthCheck() {
  if (!ADMIN_SECRET && !CRON_SECRET) {
    record("admin:health", "skip", { message: "no ADMIN_SECRET or CRON_SECRET" });
    return;
  }
  const headers = {};
  if (ADMIN_SECRET) headers["x-admin-secret"] = ADMIN_SECRET;
  if (CRON_SECRET) headers["Authorization"] = `Bearer ${CRON_SECRET}`;
  const r = await getJson("/api/admin/health", headers);
  if (r.ok && r.json?.ok) {
    record("admin:health", "pass", { http: r.status });
  } else {
    record("admin:health", "fail", {
      http: r.status,
      message: redactSecrets(JSON.stringify(r.json ?? r.text), SECRETS),
    });
  }
}

async function main() {
  if (!TARGET_URL) {
    console.error("ERROR: TARGET_URL is required.");
    console.error("  TARGET_URL=https://… npm run monitor:synthetic");
    process.exit(2);
  }
  console.log(`Synthetic monitor against: ${TARGET_URL}`);

  await publicRoutes();
  await listingPrivateLeakCheck();
  await healthCheck();

  const summary = {
    target_url: TARGET_URL,
    run_at: new Date().toISOString(),
    results,
    totals: {
      pass: results.filter((r) => r.status === "pass").length,
      skip: results.filter((r) => r.status === "skip").length,
      fail: results.filter((r) => r.status === "fail").length,
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUT_DIR, "synthetic-monitor-report.json"),
    JSON.stringify(summary, null, 2)
  );
  await writeFile(
    resolve(OUT_DIR, "synthetic-monitor-report.md"),
    [
      `# Synthetic monitor report`,
      "",
      `- Target: \`${TARGET_URL}\``,
      `- Run at: ${summary.run_at}`,
      `- Totals: ${summary.totals.pass} pass · ${summary.totals.skip} skip · ${summary.totals.fail} fail`,
      "",
      `| Check | Status | HTTP | Message |`,
      `| --- | --- | --- | --- |`,
      ...results.map(
        (r) =>
          `| ${r.name} | ${r.status} | ${r.http ?? ""} | ${(r.message ?? "").replace(/\|/g, "\\|")} |`
      ),
      "",
    ].join("\n")
  );

  console.log(
    `\nTotals: ${summary.totals.pass} pass · ${summary.totals.skip} skip · ${summary.totals.fail} fail`
  );
  console.log("Report: artifacts/synthetic-monitor-report.json + .md");
  process.exit(summary.totals.fail > 0 ? 1 : 0);
}

const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) {
  main().catch((err) => {
    console.error("FATAL", err);
    process.exit(2);
  });
}
