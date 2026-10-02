import { describe, expect, it } from "vitest";

import policyJson from "../../config/release-authority-policy.json";
import {
  assertIdempotentReceiptReplay,
  assertNoSensitiveReceiptData,
  buildReceiptFileChecksum,
  buildProductionAcceptanceReceipt,
  canonicalJson,
  evaluateResolvedAuthority,
  parseReleaseIntent,
  selectReceiptWithBootstrap,
  serializeReceiptDocument,
  sha256,
  validateReceiptFileChecksum,
  validateProductionAcceptanceReceipt,
  validateReleaseAuthorityPolicy,
  withReceiptIntegrity,
} from "../../scripts/lib/release-authority-receipt.mjs";

const policy = validateReleaseAuthorityPolicy(policyJson);
const mergeCommit = "1".repeat(40);
const tree = "2".repeat(40);

function receiptEvidence() {
  return {
    repository: policy.repository,
    acceptedAt: "2026-10-02T12:00:00.000Z",
    source: { pr: 300, reviewedHead: "3".repeat(40), mergeCommit, tree },
    deployment: {
      id: "dpl_Current123",
      githubDeploymentId: 123456,
      generatedUrl: "https://ask-magic-mike-example.vercel.app",
      canonicalUrl: policy.productionTarget.canonicalUrl,
      state: "READY",
      target: "production",
      environment: "Production",
      vercelTeam: policy.productionTarget.vercelTeam,
      vercelProject: policy.productionTarget.vercelProject,
      vercelProjectId: policy.productionTarget.vercelProjectId,
    },
    githubDeploymentSha: mergeCommit,
    vercelStatusSha: mergeCommit,
    vercelStatusDeploymentId: "dpl_Current123",
    pullRequestMergeCommit: mergeCommit,
    observedTree: tree,
    canonicalReleaseCommit: mergeCommit,
    observedMigrationCount: 0,
    verification: {
      releaseGate: { runId: 100, result: "success", headSha: mergeCommit },
      postDeploy: { runId: 101, result: "success", headSha: mergeCommit },
      monitor: { status: "passed", passed: 11, failed: 0, attemptCount: 1 },
      smoke: { passed: 19, skipped: 2, failed: 0, writeMode: false },
      readiness: { status: 200 },
      runtime: { errorCount: 0, fatalCount: 0, availability: "collected" },
    },
    changes: {
      migrationCount: 0,
      environmentChangeCount: 0,
      externalMutations: {
        wordpress: 0,
        productionDataWrites: 0,
        leadSubmissions: 0,
        notifications: 0,
        dns: 0,
        billing: 0,
        nellySelly: 0,
      },
    },
    rollback: { deploymentId: "dpl_Rollback123" },
    evidence: { acceptanceSource: { kind: "fixture" } },
  };
}

function validReceipt() {
  return buildProductionAcceptanceReceipt(receiptEvidence(), policy);
}

function resolverEvidence() {
  return {
    resolvedAt: "2026-10-02T12:01:00.000Z",
    github: {
      commitExists: true,
      tree,
      pr: 300,
      pullRequestMergeCommit: mergeCommit,
      deploymentSha: mergeCommit,
      deploymentEnvironment: "Production",
      deploymentState: "success",
      vercelStatusState: "success",
      vercelStatusDeploymentId: "dpl_Current123",
      releaseGate: { conclusion: "success", headSha: mergeCommit },
      postDeploy: { conclusion: "success", headSha: mergeCommit },
    },
    vercel: {
      id: "dpl_Current123",
      readyState: "READY",
      target: "production",
      projectId: policy.productionTarget.vercelProjectId,
      name: policy.productionTarget.vercelProject,
      githubCommitSha: mergeCommit,
      githubCommitRepo: "ask-magic-mike",
      githubCommitOrg: "brandonnarron1-lang",
      url: "ask-magic-mike-example.vercel.app",
      aliases: ["www.askmagicmike.com", "askmagicmike.com"],
    },
    rollback: {
      id: "dpl_Rollback123",
      readyState: "READY",
      projectId: policy.productionTarget.vercelProjectId,
    },
    health: { liveStatus: 200, readyStatus: 200, releaseCommit: mergeCommit },
  };
}

describe("Production acceptance receipts", () => {
  it("canonicalizes and hashes deterministically", () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      '{"a":{"c":3,"d":4},"b":2}',
    );
    expect(sha256(canonicalJson({ b: 2, a: 1 }))).toBe(
      sha256(canonicalJson({ a: 1, b: 2 })),
    );
    expect(validReceipt()).toEqual(validReceipt());
  });

  it("creates a checksum for the exact published receipt bytes", () => {
    const document = serializeReceiptDocument(validReceipt());
    const checksum = buildReceiptFileChecksum(document, policy.receiptStore.assetName);
    expect(checksum).toBe(`${sha256(document)}  ${policy.receiptStore.assetName}\n`);
    expect(
      validateReceiptFileChecksum(document, checksum, policy.receiptStore.assetName),
    ).toBe(true);
    expect(() =>
      validateReceiptFileChecksum(
        `${document} `,
        checksum,
        policy.receiptStore.assetName,
      ),
    ).toThrow("receipt_file_checksum_mismatch");
    expect(() =>
      validateReceiptFileChecksum(document, checksum, "different.json"),
    ).toThrow("receipt_checksum_asset_name_mismatch");
  });

  it("validates a complete accepted receipt and exact replay", () => {
    const receipt = validReceipt();
    expect(validateProductionAcceptanceReceipt(receipt, policy)).toBe(receipt);
    expect(assertIdempotentReceiptReplay(receipt, structuredClone(receipt))).toBe(true);
  });

  it("never lets the historical bootstrap override a published receipt", () => {
    const published = validReceipt();
    let bootstrapCalled = false;
    expect(
      selectReceiptWithBootstrap(published, () => {
        bootstrapCalled = true;
        return { stale: true };
      }),
    ).toBe(published);
    expect(bootstrapCalled).toBe(false);
  });

  it("rejects missing verifier evidence and contradictory source evidence", () => {
    const missingVerifier = receiptEvidence();
    missingVerifier.verification.releaseGate.result = "failure";
    expect(() => buildProductionAcceptanceReceipt(missingVerifier, policy)).toThrow(
      "receipt_release_gate_failed",
    );

    const wrongAliasSource = receiptEvidence();
    wrongAliasSource.canonicalReleaseCommit = "9".repeat(40);
    expect(() => buildProductionAcceptanceReceipt(wrongAliasSource, policy)).toThrow(
      "receipt_alias_source_mismatch",
    );
  });

  it("rejects an unaccepted receipt and the wrong Production environment", () => {
    const receipt = validReceipt();
    const unaccepted = withReceiptIntegrity({
      ...receipt,
      acceptanceStatus: "pending",
      integrity: undefined,
    });
    expect(() => validateProductionAcceptanceReceipt(unaccepted, policy)).toThrow(
      "receipt_not_accepted",
    );

    const wrongEnvironment = withReceiptIntegrity({
      ...receipt,
      deployment: { ...receipt.deployment, environment: "Preview" },
      integrity: undefined,
    });
    expect(() =>
      validateProductionAcceptanceReceipt(wrongEnvironment, policy),
    ).toThrow("receipt_vercel_target_mismatch");
  });

  it("rejects conflicting replay and sensitive fields or PII", () => {
    const receipt = validReceipt();
    const conflict = withReceiptIntegrity({
      ...receipt,
      acceptedAt: "2026-10-02T12:02:00.000Z",
      integrity: undefined,
    });
    expect(() => assertIdempotentReceiptReplay(receipt, conflict)).toThrow(
      "receipt_replay_conflict",
    );
    expect(() => assertNoSensitiveReceiptData({ apiToken: "redacted" })).toThrow(
      "receipt_sensitive_field",
    );
    expect(() => assertNoSensitiveReceiptData({ note: "operator@example.com" })).toThrow(
      "receipt_sensitive_value",
    );
  });

  it("resolves accepted authority and fails closed on project, source, and alias mismatch", () => {
    const receipt = validReceipt();
    expect(evaluateResolvedAuthority(receipt, resolverEvidence(), policy)).toMatchObject({
      status: "accepted",
      receipt,
    });
    for (const mutate of [
      (evidence: ReturnType<typeof resolverEvidence>) => {
        evidence.vercel.githubCommitSha = "8".repeat(40);
      },
      (evidence: ReturnType<typeof resolverEvidence>) => {
        evidence.vercel.projectId = "prj_Wrong";
      },
      (evidence: ReturnType<typeof resolverEvidence>) => {
        evidence.vercel.aliases = ["preview.example.test"];
      },
    ]) {
      const evidence = resolverEvidence();
      mutate(evidence);
      expect(() => evaluateResolvedAuthority(receipt, evidence, policy)).toThrow(
        "production_authority_contradiction",
      );
    }
  });

  it("parses a complete release intent and rejects an incomplete mutation declaration", () => {
    const intent = {
      schemaVersion: 1,
      migrationCount: 0,
      environmentChangeCount: 0,
      externalMutations: receiptEvidence().changes.externalMutations,
      ownerGate: "APPROVE EXACT RELEASE",
    };
    expect(
      parseReleaseIntent(`<!-- amm-release-intent:v1\n${JSON.stringify(intent)}\n-->`),
    ).toEqual(intent);
    expect(() =>
      parseReleaseIntent(
        `<!-- amm-release-intent:v1\n${JSON.stringify({ ...intent, externalMutations: {} })}\n-->`,
      ),
    ).toThrow("release_intent_external_mutation_keys_invalid");
  });
});
