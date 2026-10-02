#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildBootstrapReceiptFromComment,
  evaluateResolvedAuthority,
  selectReceiptWithBootstrap,
  validateProductionAcceptanceReceipt,
  validateReleaseAuthorityPolicy,
} from "../lib/release-authority-receipt.mjs";
import {
  fetchStatus,
  findSuccessfulVercelStatus,
  ghApi,
  vercelApi,
} from "../lib/release-authority-platform.mjs";

const ROOT = resolve(".");

async function readJson(path, code = "json_file_invalid") {
  try {
    return JSON.parse(await readFile(resolve(ROOT, path), "utf8"));
  } catch {
    throw new Error(code);
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function parseCommentLabel(body, label) {
  const match = new RegExp(`^- ${label}: (.+)$`, "m").exec(body);
  if (!match) throw new Error(`bootstrap_receipt_field_missing:${label}`);
  return match[1].trim();
}

function releaseAssetReceipt(policy) {
  const releases = ghApi(`repos/${policy.repository}/releases?per_page=100`)
    .filter((release) => !release.draft && release.tag_name.startsWith(policy.receiptStore.tagPrefix))
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  if (!releases.length) return null;
  const selected = releases[0];
  const asset = selected.assets?.find((item) => item.name === policy.receiptStore.assetName);
  if (!asset) throw new Error("published_receipt_asset_missing");
  const receipt = ghApi(asset.url, {
    headers: ["Accept: application/octet-stream"],
  });
  validateProductionAcceptanceReceipt(receipt, policy);
  return receipt;
}

function commitStatusEvidence(repository, sha, policy) {
  const combined = ghApi(`repos/${repository}/commits/${sha}/status`);
  const vercel = findSuccessfulVercelStatus(combined, {
    team: policy.productionTarget.vercelTeam,
    project: policy.productionTarget.vercelProject,
  });
  return { combined, vercel };
}

function buildBootstrapReceipt(policy) {
  const bootstrap = policy.receiptStore.bootstrap;
  const comment = ghApi(`repos/${policy.repository}/issues/comments/${bootstrap.commentId}`);
  const mergeCommit = parseCommentLabel(comment.body, "Merge commit");
  const githubDeploymentId = Number(
    parseCommentLabel(comment.body, "GitHub deployment receipt").split(/\s/)[0],
  );
  const commit = ghApi(`repos/${policy.repository}/git/commits/${mergeCommit}`);
  const pull = ghApi(`repos/${policy.repository}/pulls/${bootstrap.pr}`);
  const deployment = ghApi(`repos/${policy.repository}/deployments/${githubDeploymentId}`);
  const status = commitStatusEvidence(policy.repository, mergeCommit, policy).vercel;
  const vercel = vercelApi(`/v13/deployments/${status.deploymentId}`, policy.productionTarget.vercelTeam);

  return buildBootstrapReceiptFromComment(comment, policy, {
    githubDeploymentSha: deployment.sha,
    vercelStatusSha: status.sha,
    vercelStatusDeploymentId: status.deploymentId,
    pullRequestMergeCommit: pull.merge_commit_sha,
    observedTree: commit.tree.sha,
    canonicalReleaseCommit: vercel.meta?.githubCommitSha,
  });
}

function loadAcceptedReceipt(policy) {
  const published = releaseAssetReceipt(policy);
  return selectReceiptWithBootstrap(published, () => buildBootstrapReceipt(policy));
}

function actionRunEvidence(repository, runId) {
  const run = ghApi(`repos/${repository}/actions/runs/${runId}`);
  return { conclusion: run.conclusion, headSha: run.head_sha };
}

async function gatherAuthenticatedEvidence(receipt, policy) {
  const repository = policy.repository;
  const commit = ghApi(`repos/${repository}/git/commits/${receipt.source.mergeCommit}`);
  const pull = ghApi(`repos/${repository}/pulls/${receipt.source.pr}`);
  const deployment = ghApi(`repos/${repository}/deployments/${receipt.deployment.githubDeploymentId}`);
  const deploymentStatuses = ghApi(
    `repos/${repository}/deployments/${receipt.deployment.githubDeploymentId}/statuses`,
  );
  const latestDeploymentStatus = deploymentStatuses[0];
  const vercelStatus = commitStatusEvidence(repository, receipt.source.mergeCommit, policy).vercel;
  const vercel = vercelApi(
    `/v13/deployments/${receipt.deployment.id}`,
    policy.productionTarget.vercelTeam,
  );
  const rollback = vercelApi(
    `/v13/deployments/${receipt.rollback.deploymentId}`,
    policy.productionTarget.vercelTeam,
  );
  const [live, ready] = await Promise.all([
    fetchStatus(`${policy.productionTarget.canonicalUrl}/api/health/live`),
    fetchStatus(`${policy.productionTarget.canonicalUrl}/api/health/ready`),
  ]);

  return {
    resolvedAt: new Date().toISOString(),
    github: {
      commitExists: Boolean(commit.sha),
      tree: commit.tree?.sha,
      pr: pull.number,
      pullRequestMergeCommit: pull.merge_commit_sha,
      deploymentSha: deployment.sha,
      deploymentEnvironment: deployment.environment,
      deploymentState: latestDeploymentStatus?.state,
      vercelStatusState: vercelStatus ? "success" : "missing",
      vercelStatusDeploymentId: vercelStatus.deploymentId,
      releaseGate: actionRunEvidence(repository, receipt.verification.releaseGate.runId),
      postDeploy: actionRunEvidence(repository, receipt.verification.postDeploy.runId),
    },
    vercel: {
      id: vercel.id,
      readyState: vercel.readyState,
      target: vercel.target,
      projectId: vercel.projectId,
      name: vercel.name,
      githubCommitSha: vercel.meta?.githubCommitSha,
      githubCommitRepo: vercel.meta?.githubCommitRepo,
      githubCommitOrg: vercel.meta?.githubCommitOrg,
      url: vercel.url,
      aliases: Array.isArray(vercel.alias) ? vercel.alias : [],
    },
    rollback: {
      id: rollback.id,
      readyState: rollback.readyState,
      projectId: rollback.projectId,
    },
    health: {
      liveStatus: live.status,
      readyStatus: ready.status,
      releaseCommit: live.headers.get("x-amm-release-commit"),
    },
  };
}

async function main() {
  const policy = validateReleaseAuthorityPolicy(
    await readJson("config/release-authority-policy.json", "release_policy_invalid_json"),
  );
  const receiptPath = argValue("--receipt");
  const evidencePath = argValue("--evidence");
  let receipt;
  let evidence;
  if (receiptPath || evidencePath) {
    if (!receiptPath || !evidencePath) throw new Error("resolver_fixture_pair_required");
    receipt = validateProductionAcceptanceReceipt(await readJson(receiptPath), policy);
    evidence = await readJson(evidencePath, "resolver_evidence_invalid_json");
  } else {
    receipt = loadAcceptedReceipt(policy);
    evidence = await gatherAuthenticatedEvidence(receipt, policy);
  }
  const resolution = evaluateResolvedAuthority(receipt, evidence, policy);
  process.stdout.write(`${JSON.stringify(resolution, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Production authority resolution failed: ${error instanceof Error ? error.message : "unknown_error"}\n`);
  process.exitCode = 1;
});
