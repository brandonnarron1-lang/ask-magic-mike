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

const productionCommit = "a2f3de834830f600df106dbf5836ae4bbde4eb4a";
const productionDeployment = "dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U";
const productionRollback = "dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe";
const runtimeRedeploySource = "dpl_E3Pob3TjWdxN9u4VK9xHZC61667g";
const productionTree = "0065f829fc94f87ab5e0faf596c8e56733be3972";
const reviewedHead = "a9d1c1c2779337ab38c1276be8893309ecee39d2";
const consumedApplicationGate =
  "APPROVE PHASE 9 WORDPRESS PLACEMENT READINESS PR 247 MERGE AND SAME-TREE PRODUCTION DEPLOYMENT";
const consumedCutoverGate =
  "APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT";

describe("current application release authority", () => {
  it("binds accepted Production to the released PR 247 source and deployment", () => {
    expect(CURRENT_RELEASE_AUTHORITY.schemaVersion).toBe(7);
    expect(CURRENT_RELEASE_AUTHORITY.production).toMatchObject({
      pr: 247,
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
      releaseGate: { runId: 33522215178, status: "success" },
      postDeployVerification: { runId: 33522383308, status: "success" },
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
      deploymentId: productionRollback,
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

  it("exposes no replayable application gate after PR 247 acceptance", () => {
    expect(CURRENT_RELEASE_AUTHORITY.candidate).toBeNull();
    expect(CURRENT_RELEASE_AUTHORITY.reviewVehicle).toBeNull();
    expect(CURRENT_APPLICATION_RELEASE_GATE).toBeNull();
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
      expect(currentSection).toMatch(/PR #?247|PR \[#247\]/);
      expect(currentSection).not.toMatch(/PR #238[^\n]{0,180}(?:single|current|active)[^\n]{0,80}candidate/i);
    }
    expect(currentAuthority).toContain(reviewedHead);
    expect(currentAuthority).toContain(productionTree);
    expect(currentAuthority).toContain(consumedApplicationGate);
    expect(currentAuthority).toMatch(/no active application candidate/i);
    expect(currentAuthority).toMatch(/PR (?:\[#247\]|#247)[\s\S]*consumed/i);
    expect(currentAuthority).toMatch(/PR #238[\s\S]*consumed/i);
  });
});
