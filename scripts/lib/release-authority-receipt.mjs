import { createHash } from "node:crypto";

export const RECEIPT_SCHEMA_VERSION = "amm.production-acceptance.v1";
export const RESOLUTION_SCHEMA_VERSION = "amm.production-authority-resolution.v1";
export const RELEASE_INTENT_MARKER = "amm-release-intent:v1";

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DEPLOYMENT_PATTERN = /^dpl_[A-Za-z0-9]+$/;
const FORBIDDEN_FIELD_PATTERN = /(?:secret|token|password|credential|authorization|cookie|database.?url|api.?key)/i;
const FORBIDDEN_VALUE_PATTERNS = [
  /postgres(?:ql)?:\/\//i,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  /\b(?:sk|rk|pk|re)_[A-Za-z0-9_-]{16,}\b/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/,
];

const EXTERNAL_MUTATION_KEYS = [
  "wordpress",
  "productionDataWrites",
  "leadSubmissions",
  "notifications",
  "dns",
  "billing",
  "nellySelly",
];

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, code) {
  if (!isObject(value)) fail(code);
  return value;
}

function requireString(value, code) {
  if (typeof value !== "string" || !value.trim()) fail(code);
  return value;
}

function requireInteger(value, code, { min = 0 } = {}) {
  if (!Number.isInteger(value) || value < min) fail(code);
  return value;
}

function requireUrl(value, code) {
  const text = requireString(value, code);
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    fail(code);
  }
  if (parsed.protocol !== "https:") fail(code);
  return parsed.toString().replace(/\/$/, "");
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function assertNoSensitiveReceiptData(value, path = "receipt") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSensitiveReceiptData(entry, `${path}[${index}]`));
    return;
  }
  if (isObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (FORBIDDEN_FIELD_PATTERN.test(key)) fail("receipt_sensitive_field", `${path}.${key}`);
      assertNoSensitiveReceiptData(entry, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === "string") {
    for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
      if (pattern.test(value)) fail("receipt_sensitive_value", path);
    }
  }
}

export function withReceiptIntegrity(receiptWithoutIntegrity) {
  const payload = structuredClone(receiptWithoutIntegrity);
  delete payload.integrity;
  assertNoSensitiveReceiptData(payload);
  return {
    ...payload,
    integrity: {
      algorithm: "sha256",
      canonicalPayloadSha256: sha256(canonicalJson(payload)),
    },
  };
}

export function validateReceiptIntegrity(receipt) {
  const copy = structuredClone(receipt);
  const integrity = copy.integrity;
  delete copy.integrity;
  if (
    !isObject(integrity)
    || integrity.algorithm !== "sha256"
    || !/^[0-9a-f]{64}$/.test(String(integrity.canonicalPayloadSha256 ?? ""))
  ) {
    fail("receipt_integrity_invalid");
  }
  const actual = sha256(canonicalJson(copy));
  if (actual !== integrity.canonicalPayloadSha256) fail("receipt_integrity_mismatch");
  return true;
}

export function validateReleaseAuthorityPolicy(policy) {
  requireObject(policy, "release_policy_invalid");
  if (policy.schemaVersion !== 1) fail("release_policy_schema_unsupported");
  requireString(policy.repository, "release_policy_repository_missing");
  if (
    policy.authorityModel?.policy !== "source_authored"
    || policy.authorityModel?.candidate !== "review_time_only"
    || policy.authorityModel?.acceptedProduction !== "deployment_generated_receipt"
    || policy.authorityModel?.resolver !== "authenticated_fail_closed"
  ) {
    fail("release_policy_authority_model_invalid");
  }
  const target = requireObject(policy.productionTarget, "release_policy_target_missing");
  if (target.githubEnvironment !== "Production") fail("release_policy_environment_invalid");
  requireString(target.vercelTeam, "release_policy_vercel_team_missing");
  requireString(target.vercelProject, "release_policy_vercel_project_missing");
  if (!/^prj_[A-Za-z0-9]+$/.test(String(target.vercelProjectId ?? ""))) {
    fail("release_policy_vercel_project_id_invalid");
  }
  requireUrl(target.canonicalUrl, "release_policy_canonical_url_invalid");
  const store = requireObject(policy.receiptStore, "release_policy_receipt_store_missing");
  if (store.kind !== "github_release_asset") fail("release_policy_receipt_store_invalid");
  requireString(store.tagPrefix, "release_policy_receipt_tag_prefix_missing");
  requireString(store.assetName, "release_policy_receipt_asset_missing");
  requireString(store.checksumAssetName, "release_policy_checksum_asset_missing");
  if (policy.approvalPolicy?.historicalApprovalReplayAllowed !== false) {
    fail("release_policy_historical_replay_not_disabled");
  }
  if (policy.approvalPolicy?.automaticExternalMutationMaximum !== 0) {
    fail("release_policy_external_mutation_limit_invalid");
  }
  const phrases = new Set();
  for (const approval of policy.consumedApprovals ?? []) {
    requireInteger(approval.pr, "release_policy_consumed_pr_invalid", { min: 1 });
    const phrase = requireString(approval.phrase, "release_policy_consumed_phrase_invalid");
    if (phrases.has(phrase)) fail("release_policy_consumed_phrase_duplicate");
    phrases.add(phrase);
  }
  if (policy.candidate != null) {
    const candidate = requireObject(policy.candidate, "release_policy_candidate_invalid");
    requireInteger(candidate.pr, "release_policy_candidate_pr_invalid", { min: 1 });
    if (!SHA_PATTERN.test(String(candidate.reviewedHead ?? ""))) {
      fail("release_policy_candidate_head_invalid");
    }
    if (!SHA_PATTERN.test(String(candidate.tree ?? ""))) fail("release_policy_candidate_tree_invalid");
    const candidateGate = requireString(
      candidate.approvalGate,
      "release_policy_candidate_gate_missing",
    );
    if (phrases.has(candidateGate)) fail("release_policy_candidate_gate_consumed");
  }
  if (policy.candidate != null && policy.reviewVehicle != null) {
    fail("release_policy_multiple_review_states");
  }
  assertNoSensitiveReceiptData(policy);
  return policy;
}

export function parseReleaseIntent(body) {
  const text = String(body ?? "");
  const pattern = new RegExp(
    `<!--\\s*${RELEASE_INTENT_MARKER.replace(":", "\\:")}\\s*([\\s\\S]*?)-->`,
    "m",
  );
  const match = pattern.exec(text);
  if (!match) fail("release_intent_missing");
  let payload;
  try {
    payload = JSON.parse(match[1].trim());
  } catch {
    fail("release_intent_invalid_json");
  }
  requireObject(payload, "release_intent_invalid");
  if (payload.schemaVersion !== 1) fail("release_intent_schema_unsupported");
  requireInteger(payload.migrationCount, "release_intent_migration_count_invalid");
  requireInteger(payload.environmentChangeCount, "release_intent_environment_count_invalid");
  requireString(payload.ownerGate, "release_intent_owner_gate_missing");
  const external = requireObject(payload.externalMutations, "release_intent_external_mutations_missing");
  if (Object.keys(external).sort().join(",") !== [...EXTERNAL_MUTATION_KEYS].sort().join(",")) {
    fail("release_intent_external_mutation_keys_invalid");
  }
  for (const key of EXTERNAL_MUTATION_KEYS) {
    requireInteger(external[key], `release_intent_external_mutation_invalid:${key}`);
  }
  assertNoSensitiveReceiptData(payload, "releaseIntent");
  return payload;
}

export function externalMutationTotal(externalMutations) {
  return EXTERNAL_MUTATION_KEYS.reduce(
    (total, key) => total + Number(externalMutations?.[key] ?? 0),
    0,
  );
}

export function buildProductionAcceptanceReceipt(evidence, policy) {
  validateReleaseAuthorityPolicy(policy);
  const source = requireObject(evidence.source, "receipt_source_missing");
  const deployment = requireObject(evidence.deployment, "receipt_deployment_missing");
  const verification = requireObject(evidence.verification, "receipt_verification_missing");
  const changes = requireObject(evidence.changes, "receipt_changes_missing");
  const rollback = requireObject(evidence.rollback, "receipt_rollback_missing");

  requireInteger(source.pr, "receipt_pr_invalid", { min: 1 });
  if (!SHA_PATTERN.test(String(source.mergeCommit ?? ""))) fail("receipt_merge_commit_invalid");
  if (!SHA_PATTERN.test(String(source.tree ?? ""))) fail("receipt_tree_invalid");
  if (source.reviewedHead != null && !SHA_PATTERN.test(String(source.reviewedHead))) {
    fail("receipt_reviewed_head_invalid");
  }
  if (evidence.repository !== policy.repository) fail("receipt_repository_mismatch");
  if (!DEPLOYMENT_PATTERN.test(String(deployment.id ?? ""))) fail("receipt_deployment_id_invalid");
  if (deployment.state !== "READY") fail("receipt_deployment_not_ready");
  if (deployment.target !== "production") fail("receipt_deployment_target_invalid");
  if (deployment.environment !== policy.productionTarget.githubEnvironment) {
    fail("receipt_environment_mismatch");
  }
  if (
    deployment.vercelTeam !== policy.productionTarget.vercelTeam
    || deployment.vercelProject !== policy.productionTarget.vercelProject
    || deployment.vercelProjectId !== policy.productionTarget.vercelProjectId
  ) {
    fail("receipt_vercel_target_mismatch");
  }
  if (deployment.canonicalUrl.replace(/\/$/, "") !== policy.productionTarget.canonicalUrl.replace(/\/$/, "")) {
    fail("receipt_canonical_url_mismatch");
  }
  requireUrl(deployment.generatedUrl, "receipt_generated_url_invalid");
  requireUrl(deployment.canonicalUrl, "receipt_canonical_url_invalid");
  requireInteger(deployment.githubDeploymentId, "receipt_github_deployment_id_invalid", { min: 1 });

  if (evidence.githubDeploymentSha !== source.mergeCommit) fail("receipt_github_deployment_sha_mismatch");
  if (evidence.vercelStatusSha !== source.mergeCommit) fail("receipt_vercel_status_sha_mismatch");
  if (evidence.vercelStatusDeploymentId !== deployment.id) fail("receipt_vercel_status_id_mismatch");
  if (evidence.pullRequestMergeCommit !== source.mergeCommit) fail("receipt_pr_merge_mismatch");
  if (evidence.observedTree !== source.tree) fail("receipt_tree_mismatch");
  if (evidence.canonicalReleaseCommit !== source.mergeCommit) fail("receipt_alias_source_mismatch");

  if (verification.releaseGate?.result !== "success") fail("receipt_release_gate_failed");
  if (verification.releaseGate?.headSha !== source.mergeCommit) fail("receipt_release_gate_sha_mismatch");
  if (verification.postDeploy?.result !== "success") fail("receipt_post_deploy_failed");
  if (verification.postDeploy?.headSha !== source.mergeCommit) fail("receipt_post_deploy_sha_mismatch");
  if (!verification.monitor || verification.monitor.failed !== 0 || verification.monitor.status !== "passed") {
    fail("receipt_monitor_failed");
  }
  if (!verification.smoke || verification.smoke.failed !== 0 || verification.smoke.writeMode !== false) {
    fail("receipt_smoke_failed_or_mutating");
  }
  if (verification.readiness?.status !== 200) fail("receipt_readiness_failed");
  requireInteger(changes.migrationCount, "receipt_migration_count_invalid");
  requireInteger(changes.environmentChangeCount, "receipt_environment_change_count_invalid");
  if (changes.migrationCount !== evidence.observedMigrationCount) fail("receipt_migration_count_mismatch");
  if (externalMutationTotal(changes.externalMutations) > policy.approvalPolicy.automaticExternalMutationMaximum) {
    fail("receipt_external_mutation_not_automatic");
  }
  if (!DEPLOYMENT_PATTERN.test(String(rollback.deploymentId ?? ""))) fail("receipt_rollback_invalid");
  if (rollback.deploymentId === deployment.id) fail("receipt_rollback_matches_current");

  const receipt = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    repository: policy.repository,
    acceptedAt: requireString(evidence.acceptedAt, "receipt_accepted_at_missing"),
    acceptanceStatus: "accepted",
    source: {
      pr: source.pr,
      ...(source.reviewedHead ? { reviewedHead: source.reviewedHead } : {}),
      mergeCommit: source.mergeCommit,
      tree: source.tree,
    },
    deployment: {
      id: deployment.id,
      githubDeploymentId: deployment.githubDeploymentId,
      generatedUrl: deployment.generatedUrl,
      canonicalUrl: deployment.canonicalUrl,
      state: "READY",
      target: "production",
      environment: policy.productionTarget.githubEnvironment,
      vercelTeam: policy.productionTarget.vercelTeam,
      vercelProject: policy.productionTarget.vercelProject,
      vercelProjectId: policy.productionTarget.vercelProjectId,
    },
    verification: {
      releaseGate: verification.releaseGate,
      postDeploy: verification.postDeploy,
      monitor: verification.monitor,
      smoke: verification.smoke,
      readiness: verification.readiness,
      runtime: verification.runtime ?? {
        errorCount: null,
        fatalCount: null,
        availability: "not_collected",
      },
    },
    changes: {
      migrationCount: changes.migrationCount,
      environmentChangeCount: changes.environmentChangeCount,
      externalMutations: Object.fromEntries(
        EXTERNAL_MUTATION_KEYS.map((key) => [key, changes.externalMutations[key]]),
      ),
    },
    rollback: { deploymentId: rollback.deploymentId },
    evidence: evidence.evidence,
  };
  return withReceiptIntegrity(receipt);
}

export function validateProductionAcceptanceReceipt(receipt, policy) {
  validateReleaseAuthorityPolicy(policy);
  requireObject(receipt, "receipt_invalid");
  if (receipt.schemaVersion !== RECEIPT_SCHEMA_VERSION) fail("receipt_schema_unsupported");
  if (receipt.acceptanceStatus !== "accepted") fail("receipt_not_accepted");
  if (receipt.repository !== policy.repository) fail("receipt_repository_mismatch");
  const acceptedAt = requireString(receipt.acceptedAt, "receipt_accepted_at_missing");
  if (Number.isNaN(Date.parse(acceptedAt))) fail("receipt_accepted_at_invalid");
  const source = requireObject(receipt.source, "receipt_source_missing");
  requireInteger(source.pr, "receipt_pr_invalid", { min: 1 });
  if (!SHA_PATTERN.test(String(source.mergeCommit ?? ""))) fail("receipt_merge_commit_invalid");
  if (!SHA_PATTERN.test(String(source.tree ?? ""))) fail("receipt_tree_invalid");
  if (source.reviewedHead != null && !SHA_PATTERN.test(String(source.reviewedHead))) {
    fail("receipt_reviewed_head_invalid");
  }
  const deployment = requireObject(receipt.deployment, "receipt_deployment_missing");
  if (!DEPLOYMENT_PATTERN.test(String(deployment.id ?? ""))) fail("receipt_deployment_id_invalid");
  requireInteger(deployment.githubDeploymentId, "receipt_github_deployment_id_invalid", { min: 1 });
  requireUrl(deployment.generatedUrl, "receipt_generated_url_invalid");
  requireUrl(deployment.canonicalUrl, "receipt_canonical_url_invalid");
  if (deployment.state !== "READY" || deployment.target !== "production") {
    fail("receipt_deployment_not_ready");
  }
  if (
    deployment.vercelTeam !== policy.productionTarget.vercelTeam
    || deployment.vercelProject !== policy.productionTarget.vercelProject
    || deployment.vercelProjectId !== policy.productionTarget.vercelProjectId
    || deployment.environment !== policy.productionTarget.githubEnvironment
  ) {
    fail("receipt_vercel_target_mismatch");
  }
  if (deployment.canonicalUrl.replace(/\/$/, "") !== policy.productionTarget.canonicalUrl.replace(/\/$/, "")) {
    fail("receipt_canonical_url_mismatch");
  }
  if (receipt.verification?.releaseGate?.result !== "success") fail("receipt_release_gate_failed");
  if (receipt.verification?.releaseGate?.headSha !== source.mergeCommit) {
    fail("receipt_release_gate_sha_mismatch");
  }
  if (receipt.verification?.postDeploy?.result !== "success") fail("receipt_post_deploy_failed");
  if (receipt.verification?.postDeploy?.headSha !== source.mergeCommit) {
    fail("receipt_post_deploy_sha_mismatch");
  }
  if (
    receipt.verification?.monitor?.status !== "passed"
    || receipt.verification?.monitor?.failed !== 0
  ) {
    fail("receipt_monitor_failed");
  }
  if (receipt.verification?.smoke?.failed !== 0 || receipt.verification?.smoke?.writeMode !== false) {
    fail("receipt_smoke_failed_or_mutating");
  }
  if (receipt.verification?.readiness?.status !== 200) fail("receipt_readiness_failed");
  requireInteger(receipt.changes?.migrationCount, "receipt_migration_count_invalid");
  requireInteger(receipt.changes?.environmentChangeCount, "receipt_environment_change_count_invalid");
  const externalMutations = requireObject(
    receipt.changes?.externalMutations,
    "receipt_external_mutations_missing",
  );
  if (Object.keys(externalMutations).sort().join(",") !== [...EXTERNAL_MUTATION_KEYS].sort().join(",")) {
    fail("receipt_external_mutation_keys_invalid");
  }
  for (const key of EXTERNAL_MUTATION_KEYS) {
    requireInteger(externalMutations[key], `receipt_external_mutation_invalid:${key}`);
  }
  if (externalMutationTotal(externalMutations) > policy.approvalPolicy.automaticExternalMutationMaximum) {
    fail("receipt_external_mutation_not_automatic");
  }
  if (!DEPLOYMENT_PATTERN.test(String(receipt.rollback?.deploymentId ?? ""))) {
    fail("receipt_rollback_invalid");
  }
  if (receipt.rollback.deploymentId === deployment.id) fail("receipt_rollback_matches_current");
  assertNoSensitiveReceiptData(receipt);
  validateReceiptIntegrity(receipt);
  return receipt;
}

export function receiptTag(receipt, policy) {
  validateProductionAcceptanceReceipt(receipt, policy);
  return `${policy.receiptStore.tagPrefix}${receipt.deployment.id}`;
}

export function assertIdempotentReceiptReplay(existing, candidate) {
  const existingCanonical = canonicalJson(existing);
  const candidateCanonical = canonicalJson(candidate);
  if (existingCanonical !== candidateCanonical) fail("receipt_replay_conflict");
  return true;
}

export function selectReceiptWithBootstrap(publishedReceipt, loadBootstrapReceipt) {
  if (publishedReceipt != null) return publishedReceipt;
  if (typeof loadBootstrapReceipt !== "function") fail("bootstrap_receipt_loader_missing");
  return loadBootstrapReceipt();
}

function commentValue(body, label) {
  const match = new RegExp(`^- ${label}: (.+)$`, "m").exec(body);
  if (!match) fail("bootstrap_receipt_field_missing", label);
  return match[1].trim();
}

function parseCountSummary(value, expectedLabels) {
  const counts = {};
  for (const [key, label] of Object.entries(expectedLabels)) {
    const match = new RegExp(`(\\d+) ${label}`, "i").exec(value);
    if (!match) fail("bootstrap_receipt_count_missing", key);
    counts[key] = Number(match[1]);
  }
  return counts;
}

export function buildBootstrapReceiptFromComment(comment, policy, authenticated) {
  validateReleaseAuthorityPolicy(policy);
  const body = requireString(comment.body, "bootstrap_receipt_body_missing");
  const bootstrap = policy.receiptStore.bootstrap;
  if (comment.id !== bootstrap.commentId) fail("bootstrap_receipt_comment_id_mismatch");
  const mergeCommit = commentValue(body, "Merge commit");
  const tree = commentValue(body, "Approved and merged tree");
  const reviewedHead = commentValue(body, "Reviewed head");
  const deploymentId = commentValue(body, "Vercel Production");
  const generatedUrl = commentValue(body, "Generated URL");
  const canonicalUrl = commentValue(body, "Canonical URL");
  const githubDeploymentId = Number(commentValue(body, "GitHub deployment receipt").split(/\s/)[0]);
  const releaseGateRunId = Number(commentValue(body, "Hosted Release Gate").match(/run (\d+)/)?.[1]);
  const postDeployRunId = Number(commentValue(body, "Production-only verifier").match(/run (\d+)/)?.[1]);
  const smoke = parseCountSummary(commentValue(body, "Read-only smoke"), {
    passed: "pass(?:ed)?",
    skipped: "intentional skips?",
    failed: "fail(?:ed)?",
  });
  const monitor = parseCountSummary(commentValue(body, "Production monitor"), {
    passed: "pass(?:ed)?",
    failed: "fail(?:ed)?",
  });
  const readinessStatus = Number(commentValue(body, "Liveness/readiness").match(/HTTP (\d+)/)?.[1]);
  const rollbackDeploymentId = commentValue(body, "Immediate rollback deployment");
  const migrationCount = Number(commentValue(body, "Database migrations"));
  const environmentChangeCount = Number(commentValue(body, "Environment changes"));
  const approval = commentValue(body, "Approval consumed once");
  if (!body.includes("mutations: 0")) fail("bootstrap_receipt_external_mutations_unverified");

  return buildProductionAcceptanceReceipt({
    repository: policy.repository,
    acceptedAt: comment.created_at,
    source: { pr: bootstrap.pr, reviewedHead, mergeCommit, tree },
    deployment: {
      id: deploymentId,
      githubDeploymentId,
      generatedUrl,
      canonicalUrl,
      state: "READY",
      target: "production",
      environment: policy.productionTarget.githubEnvironment,
      vercelTeam: policy.productionTarget.vercelTeam,
      vercelProject: policy.productionTarget.vercelProject,
      vercelProjectId: policy.productionTarget.vercelProjectId,
    },
    githubDeploymentSha: authenticated.githubDeploymentSha,
    vercelStatusSha: authenticated.vercelStatusSha,
    vercelStatusDeploymentId: authenticated.vercelStatusDeploymentId,
    pullRequestMergeCommit: authenticated.pullRequestMergeCommit,
    observedTree: authenticated.observedTree,
    canonicalReleaseCommit: authenticated.canonicalReleaseCommit,
    observedMigrationCount: migrationCount,
    verification: {
      releaseGate: { runId: releaseGateRunId, result: "success", headSha: mergeCommit },
      postDeploy: { runId: postDeployRunId, result: "success", headSha: mergeCommit },
      monitor: { status: "passed", passed: monitor.passed, failed: monitor.failed, attemptCount: 1 },
      smoke: { passed: smoke.passed, skipped: smoke.skipped, failed: smoke.failed, writeMode: false },
      readiness: { status: readinessStatus },
      runtime: { errorCount: null, fatalCount: null, availability: "not_collected" },
    },
    changes: {
      migrationCount,
      environmentChangeCount,
      externalMutations: Object.fromEntries(EXTERNAL_MUTATION_KEYS.map((key) => [key, 0])),
    },
    rollback: { deploymentId: rollbackDeploymentId },
    evidence: {
      acceptanceSource: { kind: "github_pr_comment", url: comment.html_url },
      approval: { phrase: approval, status: "consumed" },
    },
  }, policy);
}

export function evaluateResolvedAuthority(receipt, evidence, policy) {
  validateProductionAcceptanceReceipt(receipt, policy);
  const checks = [
    ["receipt.accepted", receipt.acceptanceStatus === "accepted"],
    ["github.commit_exists", evidence.github.commitExists === true],
    ["github.tree_matches", evidence.github.tree === receipt.source.tree],
    ["github.pr_matches", evidence.github.pr === receipt.source.pr],
    ["github.pr_merge_matches", evidence.github.pullRequestMergeCommit === receipt.source.mergeCommit],
    ["github.deployment_sha_matches", evidence.github.deploymentSha === receipt.source.mergeCommit],
    ["github.deployment_environment", evidence.github.deploymentEnvironment === policy.productionTarget.githubEnvironment],
    ["github.deployment_success", evidence.github.deploymentState === "success"],
    ["github.vercel_status", evidence.github.vercelStatusState === "success"
      && evidence.github.vercelStatusDeploymentId === receipt.deployment.id],
    ["github.release_gate_success", evidence.github.releaseGate?.conclusion === "success"],
    ["github.release_gate_sha", evidence.github.releaseGate?.headSha === receipt.source.mergeCommit],
    ["github.post_deploy_success", evidence.github.postDeploy?.conclusion === "success"],
    ["github.post_deploy_sha", evidence.github.postDeploy?.headSha === receipt.source.mergeCommit],
    ["vercel.id_matches", evidence.vercel.id === receipt.deployment.id],
    ["vercel.ready", evidence.vercel.readyState === "READY"],
    ["vercel.target", evidence.vercel.target === "production"],
    ["vercel.project", evidence.vercel.projectId === policy.productionTarget.vercelProjectId
      && evidence.vercel.name === policy.productionTarget.vercelProject],
    ["vercel.source_sha", evidence.vercel.githubCommitSha === receipt.source.mergeCommit],
    ["vercel.source_repository", evidence.vercel.githubCommitRepo === policy.repository.split("/")[1]
      && evidence.vercel.githubCommitOrg === policy.repository.split("/")[0]],
    ["vercel.generated_url", `https://${evidence.vercel.url}` === receipt.deployment.generatedUrl],
    ["vercel.canonical_alias", evidence.vercel.aliases.includes(new URL(policy.productionTarget.canonicalUrl).hostname)],
    ["rollback.available", evidence.rollback.id === receipt.rollback.deploymentId
      && evidence.rollback.readyState === "READY"
      && evidence.rollback.projectId === policy.productionTarget.vercelProjectId],
    ["health.live", evidence.health.liveStatus === 200],
    ["health.ready", evidence.health.readyStatus === 200],
    ["health.release_source", receipt.evidence?.acceptanceSource?.kind === "github_pr_comment"
      || evidence.health.releaseCommit === receipt.source.mergeCommit],
  ].map(([id, ok]) => ({ id, ok: Boolean(ok) }));
  const failures = checks.filter((check) => !check.ok);
  if (failures.length) {
    fail("production_authority_contradiction", failures.map(({ id }) => id).join(","));
  }
  return {
    schemaVersion: RESOLUTION_SCHEMA_VERSION,
    resolvedAt: evidence.resolvedAt,
    status: "accepted",
    receipt,
    checks,
  };
}

export const RELEASE_EXTERNAL_MUTATION_KEYS = [...EXTERNAL_MUTATION_KEYS];
