#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildProductionAcceptanceReceipt,
  parseReleaseIntent,
  receiptTag,
  validateReleaseAuthorityPolicy,
} from "../lib/release-authority-receipt.mjs";
import {
  extractVercelDeploymentId,
  findSuccessfulVercelStatus,
  ghApi,
} from "../lib/release-authority-platform.mjs";

const ROOT = resolve(".");
const POLICY_PATH = resolve(ROOT, "config/release-authority-policy.json");
const OUT_DIR = resolve(ROOT, process.env.RELEASE_RECEIPT_OUTPUT_DIR || "artifacts/release-authority");
const MONITOR_PATH = resolve(ROOT, process.env.MONITOR_REPORT_PATH || "artifacts/production-monitor-report.json");
const SMOKE_PATH = resolve(ROOT, process.env.SMOKE_REPORT_PATH || "artifacts/prod-smoke-report.json");

function requiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`receipt_environment_missing:${name}`);
  return value;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function readJson(path, code) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error(code);
  }
}

async function waitForReleaseGate(repository, sha) {
  const maxAttempts = Math.max(1, Math.min(60, Number(process.env.RELEASE_GATE_WAIT_ATTEMPTS || 40)));
  const delayMs = Math.max(1_000, Number(process.env.RELEASE_GATE_WAIT_MS || 15_000));
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const runs = ghApi(
      `repos/${repository}/actions/workflows/release-gate.yml/runs?head_sha=${sha}&event=push&per_page=20`,
    ).workflow_runs ?? [];
    const run = runs.find((item) => item.head_sha === sha);
    if (run?.status === "completed") {
      if (run.conclusion !== "success") throw new Error("receipt_release_gate_failed");
      return run;
    }
    if (attempt < maxAttempts) await sleep(delayMs);
  }
  throw new Error("receipt_release_gate_timeout");
}

function findMergedPullRequest(repository, sha) {
  const pulls = ghApi(`repos/${repository}/commits/${sha}/pulls`, {
    headers: ["Accept: application/vnd.github+json"],
  });
  const merged = pulls.find((pull) => pull.merged_at && pull.merge_commit_sha === sha);
  if (!merged) throw new Error("receipt_merged_pull_request_missing");
  return merged;
}

function countMigrations(repository, baseSha, sha) {
  const comparison = ghApi(`repos/${repository}/compare/${baseSha}...${sha}`);
  const migrationFiles = (comparison.files ?? []).filter(
    (file) => /^supabase\/migrations\/[^/]+\.sql$/.test(file.filename),
  );
  if (migrationFiles.some((file) => file.status !== "added")) {
    throw new Error("receipt_existing_migration_modified_or_removed");
  }
  return migrationFiles.length;
}

function latestDeploymentStatus(repository, deploymentId) {
  const statuses = ghApi(`repos/${repository}/deployments/${deploymentId}/statuses`);
  const status = statuses[0];
  if (!status || status.state !== "success") throw new Error("receipt_github_deployment_not_successful");
  return status;
}

function findRollbackDeployment(repository, currentDeploymentId, currentCreatedAt, policy) {
  const deployments = ghApi(`repos/${repository}/deployments?environment=Production&per_page=100`);
  for (const deployment of deployments) {
    if (deployment.id === currentDeploymentId) continue;
    if (new Date(deployment.created_at).getTime() >= new Date(currentCreatedAt).getTime()) continue;
    const statuses = ghApi(`repos/${repository}/deployments/${deployment.id}/statuses`);
    if (statuses[0]?.state !== "success") continue;
    const combined = ghApi(`repos/${repository}/commits/${deployment.sha}/status`);
    try {
      return findSuccessfulVercelStatus(combined, {
        team: policy.productionTarget.vercelTeam,
        project: policy.productionTarget.vercelProject,
      }).deploymentId;
    } catch {
      // Continue to the next previously successful Production deployment.
    }
  }
  throw new Error("receipt_rollback_deployment_missing");
}

function normalizeMonitor(report, expectedSha) {
  if (
    report.status !== "passed"
    || report.failed !== 0
    || report.observed_release_commit !== expectedSha
  ) {
    throw new Error("receipt_monitor_evidence_invalid");
  }
  const ready = report.results?.find((item) => item.name === "ready");
  return {
    monitor: {
      status: "passed",
      passed: report.passed,
      failed: report.failed,
      attemptCount: report.attempt_count,
    },
    readiness: { status: ready?.actual },
    canonicalReleaseCommit: report.observed_release_commit,
  };
}

function normalizeSmoke(report) {
  if (report.write_mode !== false || report.totals?.fail !== 0) {
    throw new Error("receipt_smoke_evidence_invalid");
  }
  return {
    passed: report.totals.pass,
    skipped: report.totals.skip,
    failed: report.totals.fail,
    writeMode: false,
  };
}

async function main() {
  const repository = requiredEnv("ACCEPTED_REPOSITORY");
  const sha = requiredEnv("ACCEPTED_DEPLOYMENT_SHA");
  const githubDeploymentId = Number(requiredEnv("ACCEPTED_GITHUB_DEPLOYMENT_ID"));
  const acceptedAt = requiredEnv("ACCEPTED_DEPLOYMENT_STATUS_AT");
  const postDeployRunId = Number(requiredEnv("ACCEPTED_POST_DEPLOY_RUN_ID"));
  if (requiredEnv("ACCEPTED_POST_DEPLOY_RESULT") !== "success") {
    throw new Error("receipt_post_deploy_failed");
  }

  const policy = validateReleaseAuthorityPolicy(await readJson(POLICY_PATH, "release_policy_invalid_json"));
  if (repository !== policy.repository) throw new Error("receipt_repository_mismatch");
  const commit = ghApi(`repos/${repository}/git/commits/${sha}`);
  const pull = findMergedPullRequest(repository, sha);
  const intent = parseReleaseIntent(pull.body);
  const observedMigrationCount = countMigrations(repository, commit.parents[0].sha, sha);
  if (intent.migrationCount !== observedMigrationCount) {
    throw new Error("receipt_declared_migration_count_mismatch");
  }

  const deployment = ghApi(`repos/${repository}/deployments/${githubDeploymentId}`);
  const deploymentStatus = latestDeploymentStatus(repository, githubDeploymentId);
  if (deployment.sha !== sha || deployment.environment !== policy.productionTarget.githubEnvironment) {
    throw new Error("receipt_github_deployment_mismatch");
  }
  if (deployment.creator?.login !== "vercel[bot]" || deploymentStatus.creator?.login !== "vercel[bot]") {
    throw new Error("receipt_github_deployment_creator_mismatch");
  }
  const combinedStatus = ghApi(`repos/${repository}/commits/${sha}/status`);
  const expectedVercelTarget = {
    team: policy.productionTarget.vercelTeam,
    project: policy.productionTarget.vercelProject,
  };
  const vercelStatus = findSuccessfulVercelStatus(combinedStatus, expectedVercelTarget);
  const eventDeploymentId = extractVercelDeploymentId(
    vercelStatus.targetUrl,
    expectedVercelTarget,
  );
  const releaseGate = await waitForReleaseGate(repository, sha);
  const rollbackDeploymentId = findRollbackDeployment(
    repository,
    githubDeploymentId,
    deployment.created_at,
    policy,
  );
  const monitorEvidence = normalizeMonitor(await readJson(MONITOR_PATH, "receipt_monitor_report_missing"), sha);
  const smoke = normalizeSmoke(await readJson(SMOKE_PATH, "receipt_smoke_report_missing"));
  const generatedUrl = String(deploymentStatus.environment_url || deploymentStatus.target_url || "").replace(/\/$/, "");

  const receipt = buildProductionAcceptanceReceipt({
    repository,
    acceptedAt,
    source: {
      pr: pull.number,
      reviewedHead: pull.head.sha,
      mergeCommit: sha,
      tree: commit.tree.sha,
    },
    deployment: {
      id: eventDeploymentId,
      githubDeploymentId,
      generatedUrl,
      canonicalUrl: policy.productionTarget.canonicalUrl,
      state: "READY",
      target: "production",
      environment: policy.productionTarget.githubEnvironment,
      vercelTeam: policy.productionTarget.vercelTeam,
      vercelProject: policy.productionTarget.vercelProject,
      vercelProjectId: policy.productionTarget.vercelProjectId,
    },
    githubDeploymentSha: deployment.sha,
    vercelStatusSha: vercelStatus.sha,
    vercelStatusDeploymentId: vercelStatus.deploymentId,
    pullRequestMergeCommit: pull.merge_commit_sha,
    observedTree: commit.tree.sha,
    canonicalReleaseCommit: monitorEvidence.canonicalReleaseCommit,
    observedMigrationCount,
    verification: {
      releaseGate: { runId: releaseGate.id, result: "success", headSha: releaseGate.head_sha },
      postDeploy: { runId: postDeployRunId, result: "success", headSha: sha },
      monitor: monitorEvidence.monitor,
      smoke,
      readiness: monitorEvidence.readiness,
      runtime: { errorCount: null, fatalCount: null, availability: "not_collected" },
    },
    changes: {
      migrationCount: intent.migrationCount,
      environmentChangeCount: intent.environmentChangeCount,
      externalMutations: intent.externalMutations,
    },
    rollback: { deploymentId: rollbackDeploymentId },
    evidence: {
      acceptanceSource: {
        kind: "github_release_asset",
        tag: `${policy.receiptStore.tagPrefix}${eventDeploymentId}`,
      },
      releaseIntent: {
        ownerGate: intent.ownerGate,
        status: "consumed_by_merge",
      },
      githubDeploymentStatusUrl: deploymentStatus.target_url,
    },
  }, policy);

  const tag = receiptTag(receipt, policy);
  await mkdir(OUT_DIR, { recursive: true });
  const receiptPath = resolve(OUT_DIR, policy.receiptStore.assetName);
  const checksumPath = resolve(OUT_DIR, policy.receiptStore.checksumAssetName);
  const notesPath = resolve(OUT_DIR, "release-notes.md");
  await Promise.all([
    writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
    writeFile(checksumPath, `${receipt.integrity.canonicalPayloadSha256}  ${policy.receiptStore.assetName}\n`, "utf8"),
    writeFile(
      notesPath,
      `# Ask Magic Mike Production acceptance\n\n` +
        `- PR: #${receipt.source.pr}\n` +
        `- Merge: ${receipt.source.mergeCommit}\n` +
        `- Deployment: ${receipt.deployment.id}\n` +
        `- Canonical: ${receipt.deployment.canonicalUrl}\n` +
        `- Acceptance: ${receipt.acceptanceStatus}\n` +
        `- Integrity: ${receipt.integrity.canonicalPayloadSha256}\n\n` +
        `This append-only release evidence contains no credentials or customer data.\n`,
      "utf8",
    ),
  ]);
  process.stdout.write(`${JSON.stringify({ tag, receiptPath, checksumPath, notesPath })}\n`);
}

main().catch((error) => {
  process.stderr.write(`production acceptance receipt generation failed: ${error instanceof Error ? error.message : "unknown_error"}\n`);
  process.exitCode = 1;
});
