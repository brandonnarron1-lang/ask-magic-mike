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

const productionCommit = "98a91f752c4c53dc0ae300dfc320f47b53e32820";
const productionDeployment = "dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe";
const runtimeRedeploySource = "dpl_E3Pob3TjWdxN9u4VK9xHZC61667g";
const productionTree = "d32187a46244e5fa0240119f973371fbb0c9f063";
const reviewedHead = "720de14f8d5ae0d3a137cf3944d9a0f09abdba9e";
const implementationHead = "6eb2d37f7dc2c116e92ba7ee7e7c2ea4f2482e99";
const consumedCutoverGate =
  "APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT";

describe("current application release authority", () => {
  it("binds accepted Production to the recovered PR 246 source and deployment", () => {
    expect(CURRENT_RELEASE_AUTHORITY.schemaVersion).toBe(6);
    expect(CURRENT_RELEASE_AUTHORITY.production).toMatchObject({
      pr: 246,
      reviewedHead,
      mergeCommit: productionCommit,
      tree: productionTree,
      deploymentId: productionDeployment,
      canonicalUrl: "https://www.askmagicmike.com",
      status: "accepted",
      rollbackDeploymentId: runtimeRedeploySource,
      releaseGate: { runId: 33504917995, status: "success" },
      postDeployVerification: { runId: 33505043074, status: "success" },
    });
    expect(CURRENT_RELEASE_AUTHORITY.production.productionMonitorRuns.map(
      ({ runId }) => runId,
    )).toEqual([33505253029, 33505284828, 33508066082]);
    expect(CURRENT_RELEASE_AUTHORITY.production.runtimeRedeploy).toMatchObject({
      approval: {
        phrase: "APPROVE SECURE ASK MAGIC MIKE DATABASE_URL REPLACEMENT AND PRODUCTION REDEPLOYMENT",
        status: "consumed",
      },
      sourceDeploymentId: runtimeRedeploySource,
      deploymentId: productionDeployment,
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

  it("keeps Draft PR 247 review-only until a fresh exact-head gate is sealed", () => {
    expect(CURRENT_RELEASE_AUTHORITY.candidate).toBeNull();
    expect(CURRENT_APPLICATION_RELEASE_GATE).toBeNull();
    expect(CURRENT_RELEASE_AUTHORITY.reviewVehicle).toEqual({
      pr: 247,
      url: "https://github.com/brandonnarron1-lang/ask-magic-mike/pull/247",
      branch: "codex/owned-demand-readiness-main-20260901",
      baseCommit: productionCommit,
      implementationHead,
      state: "draft_unsealed",
      migrationCount: 0,
      externalMutationCount: 0,
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
      expect(currentSection).toMatch(/PR #?246|PR \[#246\]/);
      expect(currentSection).not.toMatch(/PR #238[^\n]{0,180}(?:single|current|active)[^\n]{0,80}candidate/i);
    }
    expect(currentAuthority).toContain(implementationHead);
    expect(currentAuthority).toMatch(/PR (?:\[#247\]|#247)[\s\S]*draft/i);
    expect(currentAuthority).toMatch(/no active application candidate/i);
    expect(currentAuthority).toMatch(/PR #238[\s\S]*consumed/i);
  });
});
