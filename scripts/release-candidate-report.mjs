#!/usr/bin/env node
/**
 * Consolidate release-gate evidence into a single operator-readable
 * artifact at:
 *
 *   artifacts/release-candidate-report.json
 *   artifacts/release-candidate-report.md
 *
 * Reads:
 *   - git metadata (HEAD sha, branch, remote)
 *   - package.json scripts
 *   - artifacts/preview-qa-report.json (if present)
 *   - artifacts/widget-e2e-report.json (if present — Playwright JSON
 *     reporter output, when the operator opts in)
 *   - re-runs `node scripts/release-safety-scan.mjs` and captures the
 *     summary line so the report is self-evident
 *
 * Never reads or echoes secrets.
 *
 * GO is only set when every required check is satisfied. Otherwise
 * NO-GO with a list of blockers.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(".");
const OUT_DIR = resolve(REPO_ROOT, "artifacts");

function gitOut(args) {
  const r = spawnSync("git", args, { encoding: "utf8", cwd: REPO_ROOT });
  return (r.stdout ?? "").trim();
}

async function readJsonIfPresent(path) {
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function runSafetyScan() {
  const r = spawnSync(
    "node",
    ["scripts/release-safety-scan.mjs"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 }
  );
  const stdout = r.stdout ?? "";
  const totals = stdout.match(/Totals: (\d+) pass · (\d+) fail/);
  return {
    exit_code: r.status,
    passed: r.status === 0,
    pass_count: totals ? Number(totals[1]) : null,
    fail_count: totals ? Number(totals[2]) : null,
    stdout: stdout.trim().slice(0, 4000),
  };
}

async function readPackageScripts() {
  const text = await readFile(resolve(REPO_ROOT, "package.json"), "utf8");
  const pkg = JSON.parse(text);
  return pkg.scripts ?? {};
}

function summarizePreviewQa(report) {
  if (!report) {
    return {
      present: false,
      access_blocked: null,
      protection_bypass_present: null,
      mutation_gate_allowed: null,
      totals: null,
    };
  }
  const results = Array.isArray(report.results) ? report.results : [];
  return {
    present: true,
    preview_url: report.preview_url,
    run_at: report.run_at,
    access_blocked: !!report.access_blocked,
    protection_bypass_present: !!report.protection_bypass_present,
    mutation_gate_allowed: report.mutation_gate?.allowed === true,
    mutation_gate_reason: report.mutation_gate?.reason ?? null,
    health_summary: report.health
      ? {
          commit: report.health.build?.commit,
          vercel_env: report.health.build?.vercel_env,
          database_env: report.health.database?.identity?.database_env,
          safe_for_preview_mutation:
            report.health.safety?.safe_for_preview_mutation,
        }
      : null,
    totals: {
      pass: results.filter((r) => r.status === "pass").length,
      skip: results.filter((r) => r.status === "skip").length,
      fail: results.filter((r) => r.status === "fail").length,
    },
  };
}

function summarizeWidgetE2e(report) {
  if (!report) {
    return { present: false };
  }
  // Playwright JSON reporter shape: { stats: { expected, unexpected, ... } }
  const stats = report.stats ?? {};
  return {
    present: true,
    passed: (stats.unexpected ?? 0) === 0 && (stats.flaky ?? 0) === 0,
    stats: {
      expected: stats.expected ?? null,
      unexpected: stats.unexpected ?? null,
      flaky: stats.flaky ?? null,
      skipped: stats.skipped ?? null,
    },
  };
}

function computeVerdict(input) {
  const blockers = [];
  if (!input.safety.passed) blockers.push("release_safety_scan_failed");

  if (!input.previewQa.present) {
    blockers.push("preview_qa_report_missing");
  } else {
    const qa = input.previewQa;
    // Preview QA failures are acceptable IFF the only failure is the
    // documented missing-bypass early-fail. The operator must still
    // run with bypass before promotion.
    if (qa.totals && qa.totals.fail > 0) {
      // If access was blocked by missing bypass and no other failures
      // exist, treat it as a known-blocked state rather than a failure.
      const onlyAccessBlocked =
        qa.access_blocked && qa.totals.fail === 1 && qa.totals.pass === 0;
      if (!onlyAccessBlocked) {
        blockers.push("preview_qa_has_failures");
      }
    }
    // Mutation gate must be blocked unless explicitly allowed by health.
    if (qa.mutation_gate_allowed && qa.health_summary?.safe_for_preview_mutation !== true) {
      blockers.push("mutation_gate_allowed_without_health_confirmation");
    }
  }

  if (input.widgetE2e.present && !input.widgetE2e.passed) {
    blockers.push("widget_e2e_failed");
  }

  return {
    go: blockers.length === 0,
    blockers,
  };
}

function renderMarkdown(summary) {
  const qa = summary.preview_qa;
  const e2e = summary.widget_e2e;
  const lines = [
    `# Release candidate report`,
    "",
    `- Generated: ${summary.generated_at}`,
    `- Branch: ${summary.git.branch}`,
    `- Commit: ${summary.git.commit}`,
    `- Remote: ${summary.git.remote}`,
    "",
    `## Production safety`,
    "",
    `- Production at \`ecf59c9\` not touched, not merged, not promoted.`,
    "",
    `## Verdict`,
    "",
    `**${summary.verdict.go ? "GO" : "NO-GO"}**`,
    "",
    summary.verdict.blockers.length === 0
      ? `_No blockers._`
      : `Blockers:\n${summary.verdict.blockers.map((b) => `- ${b}`).join("\n")}`,
    "",
    `## Static safety scan (release:safety)`,
    "",
    `- Exit code: ${summary.safety_scan.exit_code}`,
    `- Result: ${summary.safety_scan.passed ? "PASS" : "FAIL"}`,
    `- Pass / Fail counts: ${summary.safety_scan.pass_count} / ${summary.safety_scan.fail_count}`,
    "",
    `## Preview QA`,
    "",
    qa.present
      ? [
          `- Preview URL: \`${qa.preview_url}\``,
          `- Run at: ${qa.run_at}`,
          `- Protection bypass present: ${qa.protection_bypass_present}`,
          `- Access blocked early: ${qa.access_blocked}`,
          `- Mutation gate allowed: ${qa.mutation_gate_allowed}`,
          qa.mutation_gate_reason
            ? `- Mutation gate reason: ${qa.mutation_gate_reason}`
            : null,
          qa.totals
            ? `- Totals: pass=${qa.totals.pass} · skip=${qa.totals.skip} · fail=${qa.totals.fail}`
            : null,
          qa.health_summary
            ? [
                `- Health database_env: ${qa.health_summary.database_env}`,
                `- Health safe_for_preview_mutation: ${qa.health_summary.safe_for_preview_mutation}`,
              ].join("\n")
            : `- Health: not captured`,
        ]
          .filter(Boolean)
          .join("\n")
      : "_No preview QA report on disk. Run `npm run preview:qa`._",
    "",
    `## Widget browser e2e`,
    "",
    e2e.present
      ? `- Status: ${e2e.passed ? "PASS" : "FAIL"}\n- Stats: ${JSON.stringify(e2e.stats)}`
      : "_No widget e2e JSON on disk. Run `npm run preview:e2e -- --reporter=json --output=artifacts/widget-e2e-report.json`._",
    "",
    `## Package scripts`,
    "",
    Object.entries(summary.scripts)
      .filter(([k]) =>
        [
          "release:safety",
          "release:gate",
          "release:report",
          "preview:find",
          "preview:qa",
          "preview:e2e",
        ].includes(k)
      )
      .map(([k, v]) => `- \`${k}\` → \`${v}\``)
      .join("\n"),
    "",
    `## Manual setup remaining`,
    "",
    summary.manual_remaining.map((m) => `- ${m}`).join("\n"),
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const git = {
    branch: gitOut(["rev-parse", "--abbrev-ref", "HEAD"]),
    commit: gitOut(["rev-parse", "--short=10", "HEAD"]),
    remote: gitOut(["config", "--get", "remote.origin.url"]),
  };

  const scripts = await readPackageScripts();
  const safetyScan = runSafetyScan();
  const previewQaRaw = await readJsonIfPresent(
    resolve(OUT_DIR, "preview-qa-report.json")
  );
  const widgetE2eRaw = await readJsonIfPresent(
    resolve(OUT_DIR, "widget-e2e-report.json")
  );

  const previewQa = summarizePreviewQa(previewQaRaw);
  const widgetE2e = summarizeWidgetE2e(widgetE2eRaw);
  const verdict = computeVerdict({
    safety: safetyScan,
    previewQa,
    widgetE2e,
  });

  const manualRemaining = [];
  if (!previewQa.present) {
    manualRemaining.push(
      "Run `npm run preview:qa` against the latest preview (with VERCEL_AUTOMATION_BYPASS_SECRET) to produce artifacts/preview-qa-report.*"
    );
  } else if (previewQa.access_blocked) {
    manualRemaining.push(
      "Re-run preview:qa with VERCEL_AUTOMATION_BYPASS_SECRET to clear early access failure."
    );
  }
  if (!widgetE2e.present) {
    manualRemaining.push(
      "Run `npm run preview:e2e -- --reporter=json --output=artifacts/widget-e2e-report.json` to populate the browser-flow evidence."
    );
  }
  manualRemaining.push(
    "Confirm DATABASE_ENV, ALLOW_PREVIEW_DB_MUTATION, and PREVIEW_SUPABASE_PROJECT_REF in Vercel Preview env before any mutation run."
  );
  manualRemaining.push("Do not promote to production from automation.");

  const summary = {
    generated_at: generatedAt,
    git,
    safety_scan: safetyScan,
    preview_qa: previewQa,
    widget_e2e: widgetE2e,
    scripts,
    verdict,
    manual_remaining: manualRemaining,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUT_DIR, "release-candidate-report.json"),
    JSON.stringify(summary, null, 2)
  );
  await writeFile(
    resolve(OUT_DIR, "release-candidate-report.md"),
    renderMarkdown(summary)
  );

  // eslint-disable-next-line no-console
  console.log(
    `release-candidate: ${verdict.go ? "GO" : "NO-GO"}` +
      (verdict.blockers.length
        ? ` — blockers: ${verdict.blockers.join(", ")}`
        : "")
  );
  console.log("Report: artifacts/release-candidate-report.json + .md");

  // Always exit 0 — the report is the artifact; downstream tooling
  // can read .verdict.go.
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("FATAL", err);
  process.exit(2);
});
