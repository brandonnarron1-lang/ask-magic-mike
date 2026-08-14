#!/usr/bin/env node

const base = (process.env.TARGET_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS || 12_000);
const checks = [
  ["home", "/", 200],
  ["seller", "/sell", 200],
  ["buyer", "/buy", 200],
  ["value", "/value", 200],
  ["ask", "/ask", 200],
  ["widget", "/widget/v1", 200],
  ["live", "/api/health/live", 200],
  ["ready", "/api/health/ready", 200],
  ["admin-anonymous-denial", "/admin", [401, 307]],
];

async function check([name, path, expected]) {
  const started = Date.now();
  try {
    const response = await fetch(base + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "AskMagicMike-Production-Monitor/1.0" },
    });
    return {
      name,
      path,
      expected,
      actual: response.status,
      ok: (Array.isArray(expected) ? expected : [expected]).includes(response.status),
      duration_ms: Date.now() - started,
      cache_control: response.headers.get("cache-control"),
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

const results = await Promise.all(checks.map(check));
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
