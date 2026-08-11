#!/usr/bin/env node

const target = (process.env.TARGET_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
const routes = ["/", "/ask", "/sell", "/value", "/buy", "/widget/v1", "/robots.txt", "/sitemap.xml", "/api/health/live"];
const results = [];

for (const route of routes) {
  const started = Date.now();
  try {
    const response = await fetch(target + route, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    results.push({ route, status: response.status, ok: response.status >= 200 && response.status < 400, ms: Date.now() - started });
  } catch (error) {
    results.push({ route, status: null, ok: false, ms: Date.now() - started, error: error instanceof Error ? error.message : "request_failed" });
  }
}

const report = { target, checked_at: new Date().toISOString(), ok: results.every((result) => result.ok), results };
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
