import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readDoc = (name: string) =>
  readFileSync(resolve(process.cwd(), "docs", name), "utf8");

const currentState = readDoc("CURRENT_STATE_RECONCILIATION.md");
const assetManifest = readDoc("CANONICAL_ASSET_MANIFEST.md");
const canonicalStack = readDoc("CANONICAL_PRODUCTION_STACK.md");
const consolidationPlan = readDoc("CONSOLIDATION_PLAN.md");
const ownerQueue = readDoc("OWNER_APPROVAL_QUEUE.md");
const knownBlockers = readDoc("KNOWN_BLOCKERS.md");
const knownLimitations = readDoc("KNOWN_LIMITATIONS.md");

const operatingDocs = [
  currentState,
  assetManifest,
  canonicalStack,
  consolidationPlan,
  ownerQueue,
  knownBlockers,
  knownLimitations,
].join("\n");

const productionCommit =
  "b450b41c66c6740bd20571cdbe7d8caf82e92d5e";
const productionDeployment = "dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW";
const productionGate =
  "APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT";
const previewMutationGate =
  "APPROVE PHASE 9 NEON-ATTESTED CONTROLLED PREVIEW MUTATION QA";

describe("current release-authority documentation", () => {
  it("identifies the accepted Production commit and deployment", () => {
    for (const doc of [
      currentState,
      assetManifest,
      canonicalStack,
      consolidationPlan,
    ]) {
      expect(doc).toContain(productionCommit);
      expect(doc).toContain(productionDeployment);
    }
  });

  it("identifies PR #209 as the sole atomic application candidate", () => {
    for (const doc of [
      currentState,
      assetManifest,
      canonicalStack,
      consolidationPlan,
      ownerQueue,
      knownBlockers,
      knownLimitations,
    ]) {
      expect(doc).toMatch(/PR #209|PR \[#209\]/);
    }

    expect(consolidationPlan).toMatch(
      /sole\s+current application release vehicle/i
    );
    expect(ownerQueue).toMatch(/sole\s+current application release vehicle/i);
    expect(knownBlockers).toMatch(
      /sole\s+current application release candidate/i
    );
  });

  it("keeps Preview mutation and Production release as distinct exact gates", () => {
    for (const doc of [consolidationPlan, ownerQueue, knownBlockers]) {
      expect(doc).toContain(previewMutationGate);
      expect(doc).toContain(productionGate);
    }
    expect(previewMutationGate).not.toBe(productionGate);
  });

  it("does not retain superseded stacked-release authority in operating docs", () => {
    const staleAuthorityClaims = [
      "Draft PR #202 is the immediate durability correction",
      "Release stacked candidates in order",
      "PR #185 is the single consolidation vehicle",
      "The Production baseline is PR #184",
      "PR #183 is merged and live. PR #184",
    ];

    for (const staleClaim of staleAuthorityClaims) {
      expect(operatingDocs).not.toContain(staleClaim);
    }
  });

  it("preserves incremental PRs as evidence without independent authority", () => {
    expect(currentState).toMatch(
      /#202 through #208[\s\S]*No independent merge or Production authority/
    );
    expect(consolidationPlan).toMatch(
      /PRs #202 through #208[\s\S]*superseded for release by PR #209/
    );
    expect(ownerQueue).toMatch(
      /PRs #202 through #208[\s\S]*no independent release authority/
    );
  });
});
