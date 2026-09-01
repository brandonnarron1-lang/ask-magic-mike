#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import {
  buildIncidentMarkdown,
  findOpenIncident,
  PRODUCTION_INCIDENT_TITLE,
} from "./lib/production-incident.mjs";

const reportPath = process.env.REPORT_PATH || "artifacts/production-monitor-report.json";
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

if (!repository || !token) {
  throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required for incident reconciliation.");
}
const report = JSON.parse(await readFile(reportPath, "utf8"));
const update = buildIncidentMarkdown(report, { runUrl: process.env.MONITOR_RUN_URL });
const apiBase = `https://api.github.com/repos/${repository}`;

async function github(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub incident API ${init.method || "GET"} ${path} failed with HTTP ${response.status}.`);
  }
  if (response.status === 204) return null;
  return response.json();
}

const issues = await github("/issues?state=open&per_page=100");
const existing = findOpenIncident(issues);

if (report.status === "failed") {
  if (!existing) {
    const created = await github("/issues", {
      method: "POST",
      body: JSON.stringify({
        title: PRODUCTION_INCIDENT_TITLE,
        body: update,
      }),
    });
    console.log(`Opened rolling production incident #${created.number}.`);
  } else {
    await github(`/issues/${existing.number}`, {
      method: "PATCH",
      body: JSON.stringify({ body: update }),
    });
    await github(`/issues/${existing.number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: update }),
    });
    console.log(`Updated rolling production incident #${existing.number}.`);
  }
} else if (existing) {
  const recovery = `${update}\n\nClosing automatically because the current bounded verification is healthy.`;
  await github(`/issues/${existing.number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: recovery }),
  });
  await github(`/issues/${existing.number}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "completed" }),
  });
  console.log(`Recorded recovery and closed production incident #${existing.number}.`);
} else {
  console.log("Production verification is healthy; no open rolling incident exists.");
}
