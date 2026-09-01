#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import {
  evaluateReadinessContract,
  evaluateRouteContract,
  PRODUCTION_ROUTE_CONTRACTS,
} from "./lib/monitor-contracts.mjs";
import {
  boundedAttemptCount,
  buildMonitorReport,
  formatMonitorMarkdown,
} from "./lib/monitor-report.mjs";

const base = (process.env.TARGET_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS || 12_000);
const maxAttempts = boundedAttemptCount(process.env.MONITOR_MAX_ATTEMPTS);
const retryDelayMs = Math.max(0, Number(process.env.MONITOR_RETRY_DELAY_MS || 2_000));
const trigger = process.env.MONITOR_TRIGGER
  || (process.env.GITHUB_ACTIONS ? process.env.GITHUB_EVENT_NAME : "point_in_time");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function check(contract) {
  const { name, path, expected, expectedLocation } = contract;
  const started = Date.now();
  try {
    const response = await fetch(base + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "AskMagicMike-Production-Monitor/1.0" },
    });
    const actualLocation = response.headers.get("location");
    const routeContract = evaluateRouteContract(contract, {
      status: response.status,
      location: actualLocation,
    });
    let readinessContract;
    if (name === "ready") {
      try {
        readinessContract = evaluateReadinessContract(await response.json());
      } catch {
        readinessContract = evaluateReadinessContract(null);
      }
    }
    return {
      name,
      path,
      expected,
      actual: response.status,
      ok: routeContract.ok && (readinessContract?.ok ?? true),
      duration_ms: Date.now() - started,
      cache_control: response.headers.get("cache-control"),
      ...(expectedLocation
        ? {
            expected_location: expectedLocation,
            actual_location: actualLocation,
          }
        : {}),
      ...(readinessContract ? { contract_checks: readinessContract.checks } : {}),
    };
  } catch (error) {
    return {
      name,
      path,
      expected,
      actual: null,
      ok: false,
      duration_ms: Date.now() - started,
      error: error instanceof Error ? error.name : "request_failed",
    };
  }
}

const attempts = [];
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const results = await Promise.all(PRODUCTION_ROUTE_CONTRACTS.map(check));
  const failed = results.filter((item) => !item.ok).length;
  attempts.push({
    attempt,
    checked_at: new Date().toISOString(),
    passed: results.length - failed,
    failed,
    results,
  });
  if (failed === 0 || attempt === maxAttempts) break;
  await sleep(retryDelayMs * attempt);
}

const report = buildMonitorReport({ attempts, target: base, trigger, maxAttempts });
const markdown = formatMonitorMarkdown(report);
await mkdir("artifacts", { recursive: true });
await Promise.all([
  writeFile("artifacts/production-monitor-report.json", `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile("artifacts/production-monitor-report.md", markdown, "utf8"),
]);
console.log(JSON.stringify(report, null, 2));
if (report.failed) process.exitCode = 1;
