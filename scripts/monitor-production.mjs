#!/usr/bin/env node

import {
  evaluateReadinessContract,
  evaluateRouteContract,
  PRODUCTION_ROUTE_CONTRACTS,
} from "./lib/monitor-contracts.mjs";

const base = (process.env.TARGET_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS || 12_000);
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

const results = await Promise.all(PRODUCTION_ROUTE_CONTRACTS.map(check));
const report = {
  checked_at: new Date().toISOString(),
  target: base,
  type: process.env.GITHUB_ACTIONS ? "scheduled_synthetic" : "point_in_time",
  passed: results.filter((item) => item.ok).length,
  failed: results.filter((item) => !item.ok).length,
  results,
};
console.log(JSON.stringify(report, null, 2));
if (report.failed) process.exitCode = 1;
