#!/usr/bin/env node
/**
 * Release doctor — fast local checks that don't require preview
 * secrets. Run before pushing.
 *
 *   npm run release:doctor
 *
 * Produces:
 *   artifacts/release-doctor-report.json
 *   artifacts/release-doctor-report.md
 *
 * Exit code:
 *   0 — all blocking checks pass
 *   1 — at least one blocking check failed
 *
 * Never requires:
 *   PREVIEW_URL, ADMIN_SECRET, CRON_SECRET,
 *   VERCEL_AUTOMATION_BYPASS_SECRET, or DB credentials.
 *
 * Never prints secrets.
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { decideExitCode, summarize } from "./release-doctor-lib.mjs";

const REPO_ROOT = resolve(".");
const OUT_DIR = resolve(REPO_ROOT, "artifacts");

function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8", cwd: REPO_ROOT });
  return (r.stdout ?? "").trim();
}

async function exists(p) {
  try {
    await access(resolve(REPO_ROOT, p));
    return true;
  } catch {
    return false;
  }
}

async function readText(p) {
  try {
    return await readFile(resolve(REPO_ROOT, p), "utf8");
  } catch {
    return null;
  }
}

function check(id, status, blocking, message, details = undefined) {
  return { id, status, blocking, message, details };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const commit = git(["rev-parse", "--short=10", "HEAD"]);
  const dirty = git(["status", "--porcelain"]).length > 0;

  const results = [];

  // ─ Git hygiene ─
  results.push(
    check(
      "git.tree_clean",
      dirty ? "fail" : "pass",
      false,
      dirty ? "uncommitted changes present" : "working tree clean"
    )
  );
  results.push(
    check(
      "git.branch_present",
      branch && branch !== "HEAD" ? "pass" : "fail",
      true,
      branch ? `on branch ${branch}` : "no branch (detached HEAD)"
    )
  );

  // ─ Required scripts in package.json ─
  const pkgText = await readText("package.json");
  const pkg = pkgText ? JSON.parse(pkgText) : { scripts: {} };
  const requiredScripts = [
    "release:safety",
    "release:gate",
    "release:doctor",
    "release:report",
    "release:assert",
    "preview:find",
    "preview:wait",
    "preview:qa",
    "preview:e2e",
    "launch:authority",
    "monitor:synthetic",
  ];
  for (const name of requiredScripts) {
    const present = !!pkg.scripts?.[name];
    results.push(
      check(
        `scripts.${name}`,
        present ? "pass" : "fail",
        true,
        present ? `${name} defined` : `missing npm script: ${name}`
      )
    );
  }

  // ─ Required files / scripts on disk ─
  const requiredFiles = [
    "scripts/release-safety-scan.mjs",
    "scripts/find-vercel-preview.mjs",
    "scripts/wait-for-vercel-preview.mjs",
    "scripts/preview-qa.mjs",
    "scripts/preview-qa-lib.mjs",
    "scripts/release-candidate-report.mjs",
    "scripts/launch-authority-report.mjs",
    "scripts/synthetic-monitor.mjs",
    "src/lib/admin/health-safety.ts",
    "src/app/api/admin/health/route.ts",
    "tests/e2e/widget-preview-flow.spec.ts",
  ];
  for (const f of requiredFiles) {
    const ok = await exists(f);
    results.push(
      check(
        `files.${f}`,
        ok ? "pass" : "fail",
        true,
        ok ? `${f} present` : `missing required file: ${f}`
      )
    );
  }

  // ─ Required docs ─
  const requiredDocs = [
    "docs/release-gate.md",
    "docs/preview-qa-checklist.md",
    "docs/controlled-preview-mutation-qa.md",
    "docs/rollback-runbook.md",
    "docs/github-actions-release-gate.md",
  ];
  for (const d of requiredDocs) {
    const ok = await exists(d);
    results.push(
      check(
        `docs.${d}`,
        ok ? "pass" : "fail",
        true,
        ok ? `${d} present` : `missing required doc: ${d}`
      )
    );
  }

  // ─ Required workflows (advisory; CI is the operating layer) ─
  for (const wf of [
    ".github/workflows/release-gate.yml",
    ".github/workflows/preview-qa.yml",
    ".github/pull_request_template.md",
  ]) {
    const ok = await exists(wf);
    results.push(
      check(
        `workflows.${wf}`,
        ok ? "pass" : "fail",
        true,
        ok ? `${wf} present` : `missing CI/governance file: ${wf}`
      )
    );
  }

  // ─ Hygiene rules in source ─
  const gitignore = (await readText(".gitignore")) ?? "";
  results.push(
    check(
      "gitignore.artifacts",
      gitignore.includes("artifacts") ? "pass" : "fail",
      true,
      gitignore.includes("artifacts")
        ? "artifacts/ is gitignored"
        : ".gitignore is missing an entry for artifacts/"
    )
  );
  results.push(
    check(
      "gitignore.env_preview_local",
      /(\.env\*\.local|\.env\.preview\.local)/.test(gitignore)
        ? "pass"
        : "fail",
      true,
      /(\.env\*\.local|\.env\.preview\.local)/.test(gitignore)
        ? ".env.preview.local matched by .gitignore"
        : ".gitignore should match .env*.local"
    )
  );

  // ─ Source-level forbidden patterns ─
  const e2e = (await readText("tests/e2e/widget-preview-flow.spec.ts")) ?? "";
  results.push(
    check(
      "e2e.intercepts_api_leads",
      /page\.route\(\s*['"`]\*\*\/api\/leads['"`]/.test(e2e) ? "pass" : "fail",
      true,
      "widget e2e intercepts POST /api/leads"
    )
  );

  const mutationLib =
    (await readText("scripts/preview-qa-lib.mjs")) ?? "";
  results.push(
    check(
      "mutation.no_force_override",
      !/!health\.safety\?\.safe_for_preview_mutation && !force/.test(
        mutationLib
      )
        ? "pass"
        : "fail",
      true,
      "mutation gate does not let FORCE_DB_WRITE override unsafe health"
    )
  );

  const syntheticMonitor =
    (await readText("scripts/synthetic-monitor.mjs")) ?? "";
  results.push(
    check(
      "synthetic.no_mutating_methods",
      !/method\s*:\s*["'`](POST|PATCH|PUT|DELETE)["'`]/i.test(
        syntheticMonitor
      )
        ? "pass"
        : "fail",
      true,
      "synthetic monitor uses no mutating HTTP methods"
    )
  );
  results.push(
    check(
      "synthetic.no_post_api_leads",
      !/\/api\/leads/.test(syntheticMonitor) ||
        /never|forbidden|do not POST/i.test(syntheticMonitor)
        ? "pass"
        : "fail",
      true,
      "synthetic monitor does not POST /api/leads"
    )
  );

  // ─ Workflow content rules ─
  const releaseGateWorkflow =
    (await readText(".github/workflows/release-gate.yml")) ?? "";
  const previewQaWorkflow =
    (await readText(".github/workflows/preview-qa.yml")) ?? "";
  const bannedInWorkflows = [
    "SAFE_DB_WRITE=true",
    "vercel promote",
    "git merge",
    "git checkout main",
    "vercel rollback",
  ];
  for (const phrase of bannedInWorkflows) {
    const inGate = releaseGateWorkflow.includes(phrase);
    const inQa = previewQaWorkflow.includes(phrase);
    results.push(
      check(
        `workflows.no_banned_phrase:${phrase}`,
        !inGate && !inQa ? "pass" : "fail",
        true,
        !inGate && !inQa
          ? `no workflow contains "${phrase}"`
          : `forbidden phrase "${phrase}" present in workflow`
      )
    );
  }

  const summary = summarize({
    generated_at: generatedAt,
    git: { branch, commit, clean: !dirty },
    results,
  });

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUT_DIR, "release-doctor-report.json"),
    JSON.stringify(summary, null, 2)
  );
  await writeFile(
    resolve(OUT_DIR, "release-doctor-report.md"),
    renderMarkdown(summary)
  );

  const exit = decideExitCode(summary.results);
  // eslint-disable-next-line no-console
  console.log(
    `release-doctor: ${summary.healthy ? "HEALTHY" : "BLOCKING-FAILURES"}` +
      ` — ${summary.totals.pass} pass · ${summary.totals.fail} fail · ${summary.totals.skip} skip`
  );
  if (!summary.healthy) {
    console.log(
      `blocking failures: ${summary.blocking_failures.join(", ")}`
    );
  }
  console.log(`Report: artifacts/release-doctor-report.json + .md`);
  process.exit(exit);
}

function renderMarkdown(s) {
  const lines = [
    `# Release doctor report`,
    "",
    `- Generated: ${s.generated_at}`,
    `- Branch: ${s.git.branch}`,
    `- Commit: ${s.git.commit}`,
    `- Tree clean: ${s.git.clean}`,
    `- Verdict: ${s.healthy ? "HEALTHY" : "BLOCKING-FAILURES"}`,
    `- Totals: ${s.totals.pass} pass · ${s.totals.fail} fail · ${s.totals.skip} skip`,
    "",
    `## Blocking failures`,
    "",
    s.blocking_failures.length
      ? s.blocking_failures.map((b) => `- ${b}`).join("\n")
      : `_None._`,
    "",
    `## Checks`,
    "",
    `| ID | Status | Blocking | Message |`,
    `| --- | --- | --- | --- |`,
    ...s.results.map(
      (r) =>
        `| ${r.id} | ${r.status} | ${r.blocking} | ${(r.message ?? "").replace(/\|/g, "\\|")} |`
    ),
    "",
  ];
  return lines.join("\n");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("FATAL", err);
  process.exit(2);
});
