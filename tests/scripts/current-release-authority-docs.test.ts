import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CURRENT_APPLICATION_RELEASE_GATE,
  RELEASE_AUTHORITY_POLICY,
} from "../../app/lib/growth/release-authority-policy";
import { validateReleaseAuthorityPolicy } from "../../scripts/lib/release-authority-receipt.mjs";

const readRepoFile = (name: string) =>
  readFileSync(resolve(process.cwd(), name), "utf8");

describe("release authority policy", () => {
  it("separates source policy from accepted Production evidence", () => {
    expect(validateReleaseAuthorityPolicy(RELEASE_AUTHORITY_POLICY)).toBe(
      RELEASE_AUTHORITY_POLICY,
    );
    expect(RELEASE_AUTHORITY_POLICY.schemaVersion).toBe(1);
    expect(RELEASE_AUTHORITY_POLICY.authorityModel).toEqual({
      policy: "source_authored",
      candidate: "review_time_only",
      acceptedProduction: "deployment_generated_receipt",
      resolver: "authenticated_fail_closed",
    });
    expect(RELEASE_AUTHORITY_POLICY).not.toHaveProperty("production");
    expect(RELEASE_AUTHORITY_POLICY.candidate).toBeNull();
    expect(RELEASE_AUTHORITY_POLICY.reviewVehicle).toBeNull();
    expect(CURRENT_APPLICATION_RELEASE_GATE).toBeNull();
  });

  it("keeps consumed approvals historical and non-replayable", () => {
    expect(
      RELEASE_AUTHORITY_POLICY.approvalPolicy.historicalApprovalReplayAllowed,
    ).toBe(false);
    expect(RELEASE_AUTHORITY_POLICY.consumedApprovals.map(({ pr }) => pr)).toEqual([
      282,
      281,
      280,
      238,
    ]);
    expect(
      new Set(
        RELEASE_AUTHORITY_POLICY.consumedApprovals.map(({ phrase }) => phrase),
      ).size,
    ).toBe(RELEASE_AUTHORITY_POLICY.consumedApprovals.length);
  });

  it("preserves PR 282 as receipt bootstrap and older releases as history", () => {
    expect(RELEASE_AUTHORITY_POLICY.receiptStore.bootstrap).toMatchObject({
      kind: "github_pr_comment",
      pr: 282,
      commentId: 5952265961,
      status: "accepted_historical_bootstrap",
    });
    expect(RELEASE_AUTHORITY_POLICY.historicalApplicationReleases).toMatchObject([
      { pr: 282, status: "bootstrap_receipt_source" },
      { pr: 281, status: "superseded_by_pr282" },
      { pr: 280, status: "superseded_by_pr281" },
    ]);
  });

  it("retains the PR 238 migration receipt and exact migration hashes", () => {
    const cutover = RELEASE_AUTHORITY_POLICY.releasedCutover;
    expect(cutover.pr).toBe(238);
    expect(cutover.status).toBe("applied_and_verified");
    expect(cutover.migrations).toHaveLength(5);
    for (const migration of cutover.migrations) {
      const bytes = readFileSync(resolve(process.cwd(), migration.file));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        migration.sha256,
      );
    }
  });

  it("keeps runtime release gating source-local and network-free", () => {
    const adapter = readRepoFile("app/lib/growth/release-authority-policy.ts");
    const ledger = readRepoFile("app/lib/growth/capability-ledger.ts");
    expect(adapter).toContain("candidate?.approvalGate ?? null");
    expect(adapter).not.toContain("fetch(");
    expect(adapter).not.toContain("CURRENT_RELEASE_AUTHORITY");
    expect(ledger).toContain("CURRENT_APPLICATION_RELEASE_GATE");
    expect(ledger).toContain("pnpm release:authority:resolve");
    for (const { phrase } of RELEASE_AUTHORITY_POLICY.consumedApprovals) {
      expect(ledger).not.toContain(phrase);
    }
  });

  it("makes operational docs resolve current Production instead of predicting it", () => {
    for (const name of [
      "README.md",
      "docs/CURRENT_RELEASE_AUTHORITY.md",
      "docs/CURRENT_STATE_RECONCILIATION.md",
      "docs/CANONICAL_PRODUCTION_STACK.md",
      "docs/IMPLEMENTATION_STATUS.md",
      "docs/OWNER_APPROVAL_QUEUE.md",
      "docs/KNOWN_BLOCKERS.md",
      "docs/ROLLBACK_PLAN.md",
      "docs/PRODUCTION_RELEASE_LOG.md",
    ]) {
      const currentSection = readRepoFile(name).slice(0, 3_500);
      expect(currentSection).toContain("config/release-authority-policy.json");
      expect(currentSection).toContain("pnpm release:authority:resolve");
    }
    expect(readRepoFile("docs/CURRENT_RELEASE_AUTHORITY.md")).toMatch(
      /historical[\s\S]*PR #282/i,
    );
  });
});
