import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CURRENT_APPLICATION_RELEASE_GATE,
  CURRENT_RELEASE_AUTHORITY,
} from "../../app/lib/growth/current-release-authority";

const readRepoFile = (name: string) =>
  readFileSync(resolve(process.cwd(), name), "utf8");

const productionCommit = "75c6955c9b8eb3a7cb08fa10dc92b3a8bf2c4df1";
const productionDeployment = "dpl_aepoH5pzDwPMkerbrp9YekzVrdKD";
const productionRollback = "dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U";
const runtimeRedeployDeployment = "dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe";
const runtimeRedeploySource = "dpl_E3Pob3TjWdxN9u4VK9xHZC61667g";
const productionTree = "5775ba6a315abde9bbe55f770ccda2a64f897362";
const reviewedHead = "65a09dc0137b97bda407ee24b0914e8f9bffd9c0";
const consumedApplicationGate =
  "APPROVE PHASE 9 BATCH A RELEASE TRUTH AND PUBLIC INGRESS MERGE AND SAME-TREE PRODUCTION DEPLOYMENT";
const reviewImplementationHead = "7baff2dcafd65e666c7846165be8c2d6ab3d9ab0";
const reviewImplementationTree = "69b76a5f8ced4261d57facc201fc0cb45e467e71";
const currentApplicationGate =
  "APPROVE PHASE 9 BATCH D WORDPRESS, OPEN-HOUSE, AND RENTAL PLACEMENT READINESS MERGE AND SAME-TREE PRODUCTION DEPLOYMENT";
const consumedCutoverGate =
  "APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT";

describe("current application release authority", () => {
  it("binds accepted Production to the released PR 278 source and deployment", () => {
    expect(CURRENT_RELEASE_AUTHORITY.schemaVersion).toBe(7);
    expect(CURRENT_RELEASE_AUTHORITY.production).toMatchObject({
      pr: 278,
      reviewedHead,
      mergeCommit: productionCommit,
      tree: productionTree,
      deploymentId: productionDeployment,
      canonicalUrl: "https://www.askmagicmike.com",
      status: "accepted",
      rollbackDeploymentId: productionRollback,
      approval: {
        phrase: consumedApplicationGate,
        status: "consumed",
      },
      releaseGate: { runId: 36646434774, status: "success" },
      postDeployVerification: { runId: 36646574413, status: "success" },
      acceptanceVerification: {
        monitorPassed: 11,
        monitorFailed: 0,
        smokePassed: 19,
        smokeSkipped: 2,
        smokeFailed: 0,
        runtimeErrorCount: 0,
        readinessStatus: 200,
      },
    });
    expect(CURRENT_RELEASE_AUTHORITY.production.productionMonitorRuns).toEqual([]);
    expect(CURRENT_RELEASE_AUTHORITY.production.runtimeRedeploy).toMatchObject({
      approval: {
        phrase: "APPROVE SECURE ASK MAGIC MIKE DATABASE_URL REPLACEMENT AND PRODUCTION REDEPLOYMENT",
        status: "consumed",
      },
      sourceDeploymentId: runtimeRedeploySource,
      deploymentId: runtimeRedeployDeployment,
      reason: "production_database_url_replacement",
      target: {
        provider: "neon",
        project: "bitter-star-20214385",
        branch: "br-round-base-auh6h2wd",
        database: "neondb",
        role: "service_role",
        connectionPooling: true,
      },
      migrationCount: 0,
      databaseWriteCount: 0,
      verification: {
        monitorStatus: "passed",
        monitorPassed: 11,
        monitorFailed: 0,
        smokePassed: 19,
        smokeSkipped: 2,
        smokeFailed: 0,
        runtimeErrorCount: 0,
        readinessStatus: 200,
      },
    });
  });

  it("seals reconciled PR 280 as the only application candidate", () => {
    expect(CURRENT_RELEASE_AUTHORITY.candidate).toEqual({
      pr: 280,
      url: "https://github.com/brandonnarron1-lang/ask-magic-mike/pull/280",
      branch: "codex/batch-d-wordpress-placements-20260928",
      reviewedHead: reviewImplementationHead,
      tree: reviewImplementationTree,
      state: "ready_for_owner_approval",
      approvalGate: currentApplicationGate,
    });
    expect(CURRENT_RELEASE_AUTHORITY.reviewVehicle).toEqual({
      pr: 280,
      url: "https://github.com/brandonnarron1-lang/ask-magic-mike/pull/280",
      branch: "codex/batch-d-wordpress-placements-20260928",
      baseCommit: productionCommit,
      implementationHead: reviewImplementationHead,
      state: "sealed_for_owner_approval",
      migrationCount: 0,
      externalMutationCount: 0,
    });
    expect(CURRENT_APPLICATION_RELEASE_GATE).toBe(currentApplicationGate);
    expect(CURRENT_RELEASE_AUTHORITY.production.approval).toMatchObject({
      phrase: consumedApplicationGate,
      status: "consumed",
    });
  });

  it("retains the PR 238 database cutover as a consumed, hash-verified receipt", () => {
    const cutover = CURRENT_RELEASE_AUTHORITY.releasedCutover;
    expect(cutover).toMatchObject({
      pr: 238,
      status: "applied_and_verified",
      approval: {
        phrase: consumedCutoverGate,
        status: "consumed",
      },
      productionTarget: {
        provider: "neon",
        project: "bitter-star-20214385",
        branch: "br-round-base-auh6h2wd",
        database: "neondb",
      },
      importGates: {
        marketingSpend: false,
        organicSearch: false,
        localProfilePerformance: false,
      },
      postflight: {
        migrationLedgerRowsPerVersion: 1,
        receiptRows: 0,
        existingCountsUnchanged: true,
        privilegeChecksPassed: true,
        healthChecksPassed: true,
      },
    });
    expect(cutover.migrations).toHaveLength(5);
    expect(new Set(cutover.migrations.map(({ version }) => version)).size).toBe(5);
    for (const migration of cutover.migrations) {
      const bytes = readFileSync(resolve(process.cwd(), migration.file));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        migration.sha256,
      );
    }
  });

  it("keeps protected runtime copy fail-closed with no replayable PR 238 gate", () => {
    const adapter = readRepoFile("app/lib/growth/current-release-authority.ts");
    const ledger = readRepoFile("app/lib/growth/capability-ledger.ts");
    expect(adapter).toContain("CURRENT_APPLICATION_RELEASE_GATE");
    expect(adapter).toContain("candidate?.approvalGate ?? null");
    expect(ledger).toContain("CURRENT_APPLICATION_RELEASE_GATE");
    expect(ledger).not.toContain(consumedCutoverGate);
    expect(ledger).not.toContain(consumedApplicationGate);
  });

  it("places current truth ahead of the preserved chronological ledger", () => {
    const currentAuthority = readRepoFile("docs/CURRENT_RELEASE_AUTHORITY.md");
    for (const name of [
      "README.md",
      "docs/CANONICAL_PRODUCTION_STACK.md",
      "docs/IMPLEMENTATION_STATUS.md",
      "docs/KNOWN_BLOCKERS.md",
      "docs/OWNER_APPROVAL_QUEUE.md",
      "docs/ROLLBACK_PLAN.md",
    ]) {
      const currentSection = readRepoFile(name).slice(0, 2_500);
      expect(currentSection).toContain(productionCommit);
      expect(currentSection).toContain(productionDeployment);
      expect(currentSection).toMatch(/PR #?278|PR \[#278\]/);
      expect(currentSection).not.toMatch(/PR #238[^\n]{0,180}(?:single|current|active)[^\n]{0,80}candidate/i);
    }
    expect(currentAuthority).toContain(reviewedHead);
    expect(currentAuthority).toContain(productionTree);
    expect(currentAuthority).toContain(consumedApplicationGate);
    expect(currentAuthority).toContain(reviewImplementationHead);
    expect(currentAuthority).toContain(currentApplicationGate);
    expect(currentAuthority).toMatch(/PR \[#248\][\s\S]*previous application gate[\s\S]*invalid/i);
    expect(currentAuthority).toMatch(/PR (?:\[#278\]|#278)[\s\S]*consumed/i);
    expect(currentAuthority).toMatch(/PR #238[\s\S]*consumed/i);
  });
});
