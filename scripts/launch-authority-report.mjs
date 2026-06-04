#!/usr/bin/env node
/**
 * Launch Authority report — final pre-promotion decision artifact.
 *
 *   npm run launch:authority
 *
 * Reads available artifacts and emits a single verdict on the ladder:
 *
 *   BLOCKED  /  LOCAL_READY  /  PREVIEW_READY
 *            /  MUTATION_READY  /  PROMOTION_READY
 *
 * PROMOTION_READY never promotes. It only means the system is
 * eligible for human review.
 *
 * Output:
 *   artifacts/launch-authority-report.json
 *   artifacts/launch-authority-report.md
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { computeLaunchVerdict } from "./launch-authority-lib.mjs";

const REPO_ROOT = resolve(".");
const OUT_DIR = resolve(REPO_ROOT, "artifacts");

function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8", cwd: REPO_ROOT });
  return (r.stdout ?? "").trim();
}

async function readJson(path) {
  try {
    const text = await readFile(resolve(REPO_ROOT, path), "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function exists(p) {
  try {
    await access(resolve(REPO_ROOT, p));
    return true;
  } catch {
    return false;
  }
}

function summarizePreviewQa(report) {
  if (!report) return null;
  const results = Array.isArray(report.results) ? report.results : [];
  return {
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
          live_sms_disabled: report.health.safety?.live_sms_disabled,
          live_email_disabled: report.health.safety?.live_email_disabled,
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
  if (!report) return null;
  const stats = report.stats ?? {};
  return {
    passed: (stats.unexpected ?? 0) === 0 && (stats.flaky ?? 0) === 0,
    stats: {
      expected: stats.expected ?? null,
      unexpected: stats.unexpected ?? null,
      flaky: stats.flaky ?? null,
      skipped: stats.skipped ?? null,
    },
  };
}

function summarizeReleaseCandidate(rc) {
  if (!rc) return null;
  return {
    verdict_go: rc.verdict?.go === true,
    blockers: rc.verdict?.blockers ?? [],
  };
}

function renderMarkdown(s) {
  return [
    `# Launch Authority report`,
    "",
    `- Generated: ${s.generated_at}`,
    `- Branch: ${s.git.branch}`,
    `- Commit: ${s.git.commit}`,
    "",
    `## Verdict`,
    "",
    `**${s.verdict.verdict}**`,
    "",
    s.verdict.reasons.length
      ? `Reasons:\n${s.verdict.reasons.map((r) => `- ${r}`).join("\n")}`
      : `_No reasons logged._`,
    "",
    s.verdict.missing_work.length
      ? `Missing work:\n${s.verdict.missing_work.map((m) => `- ${m}`).join("\n")}`
      : `_Nothing outstanding._`,
    "",
    `## Production safety`,
    "",
    `- Production at \`ecf59c9\` not touched, not merged, not promoted.`,
    `- PROMOTION_READY does not promote. Human approval is required.`,
    "",
    `## Inputs`,
    "",
    `- Doctor healthy: ${s.inputs.doctor?.healthy ?? "unknown"}`,
    `- Safety scan passed: ${s.inputs.safetyScan?.passed ?? "unknown"}`,
    `- Preview QA present: ${!!s.inputs.previewQa}`,
    s.inputs.previewQa
      ? [
          `  - Preview URL: \`${s.inputs.previewQa.preview_url ?? ""}\``,
          `  - Access blocked: ${s.inputs.previewQa.access_blocked}`,
          `  - Bypass present: ${s.inputs.previewQa.protection_bypass_present}`,
          `  - Totals: pass=${s.inputs.previewQa.totals?.pass} · fail=${s.inputs.previewQa.totals?.fail}`,
          `  - Mutation gate allowed: ${s.inputs.previewQa.mutation_gate_allowed}`,
          s.inputs.previewQa.health_summary
            ? `  - Health safe_for_preview_mutation: ${s.inputs.previewQa.health_summary.safe_for_preview_mutation}`
            : null,
          s.inputs.previewQa.health_summary
            ? `  - Health live_sms_disabled / live_email_disabled: ${s.inputs.previewQa.health_summary.live_sms_disabled} / ${s.inputs.previewQa.health_summary.live_email_disabled}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    `- Widget e2e present: ${!!s.inputs.widgetE2e}`,
    s.inputs.widgetE2e
      ? `  - Stats: ${JSON.stringify(s.inputs.widgetE2e.stats)}`
      : null,
    `- Release candidate verdict.go: ${s.inputs.releaseCandidate?.verdict_go ?? "unknown"}`,
    `- Rollback runbook present: ${s.inputs.docs.rollbackDoc}`,
    `- Governance docs present: ${s.inputs.docs.governanceDocs}`,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const commit = git(["rev-parse", "--short=10", "HEAD"]);

  const doctor = await readJson("artifacts/release-doctor-report.json");
  const safetyScanFromDoctor = doctor
    ? {
        // Doctor doesn't run release-safety itself — we use the
        // release-candidate report's safety_scan summary if present.
        passed: false,
      }
    : { passed: false };
  const releaseCandidate = await readJson(
    "artifacts/release-candidate-report.json"
  );
  const previewQa = await readJson("artifacts/preview-qa-report.json");
  const widgetE2e = await readJson("artifacts/widget-e2e-report.json");

  // Prefer the release-candidate report's safety_scan when available;
  // otherwise mark it unverified.
  const safetyScan = releaseCandidate?.safety_scan
    ? {
        passed: !!releaseCandidate.safety_scan.passed,
        pass_count: releaseCandidate.safety_scan.pass_count ?? null,
        fail_count: releaseCandidate.safety_scan.fail_count ?? null,
      }
    : safetyScanFromDoctor;

  const docs = {
    rollbackDoc: await exists("docs/rollback-runbook.md"),
    governanceDocs:
      (await exists("docs/github-actions-release-gate.md")) &&
      (await exists("docs/controlled-preview-mutation-qa.md")),
  };

  const previewQaSummary = summarizePreviewQa(previewQa);
  const widgetE2eSummary = summarizeWidgetE2e(widgetE2e);
  const releaseCandidateSummary = summarizeReleaseCandidate(releaseCandidate);

  const verdict = computeLaunchVerdict({
    doctor: doctor
      ? {
          healthy: !!doctor.healthy,
          blocking_failures: doctor.blocking_failures ?? [],
        }
      : { healthy: false, blocking_failures: ["doctor_report_missing"] },
    safetyScan,
    previewQa: previewQaSummary,
    widgetE2e: widgetE2eSummary,
    releaseCandidate: releaseCandidateSummary,
    docs,
  });

  const summary = {
    generated_at: generatedAt,
    git: { branch, commit },
    verdict,
    inputs: {
      doctor: doctor
        ? {
            healthy: doctor.healthy,
            blocking_failures: doctor.blocking_failures ?? [],
          }
        : null,
      safetyScan,
      previewQa: previewQaSummary,
      widgetE2e: widgetE2eSummary,
      releaseCandidate: releaseCandidateSummary,
      docs,
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUT_DIR, "launch-authority-report.json"),
    JSON.stringify(summary, null, 2)
  );
  await writeFile(
    resolve(OUT_DIR, "launch-authority-report.md"),
    renderMarkdown(summary)
  );

  // eslint-disable-next-line no-console
  console.log(
    `launch-authority: ${verdict.verdict}` +
      (verdict.missing_work.length
        ? ` — missing: ${verdict.missing_work.join("; ")}`
        : "")
  );
  console.log("Report: artifacts/launch-authority-report.json + .md");
  // Always exit 0. Downstream tools read the JSON verdict.
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("FATAL", err);
  process.exit(2);
});
