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
const goLiveRunbook = readDoc("GO_LIVE_RUNBOOK.md");
const rollbackPlan = readDoc("ROLLBACK_PLAN.md");
const canonicalAliasDecision = readDoc(
  "phase9/CANONICAL_ALIAS_CONSOLIDATION.md"
);
const canonicalAliasEvidence = readDoc(
  "phase9/CANONICAL_ALIAS_CONSOLIDATION_QA_EVIDENCE.md"
);
const askAccessibilityDecision = readDoc(
  "phase9/ASK_CONVERSION_ACCESSIBILITY_CLARITY.md"
);
const askAccessibilityEvidence = readDoc(
  "phase9/ASK_CONVERSION_ACCESSIBILITY_CLARITY_QA_EVIDENCE.md"
);
const responsiveIdentityDecision = readDoc(
  "phase9/RESPONSIVE_CONVERSION_IDENTITY_POLISH.md"
);
const responsiveIdentityEvidence = readDoc(
  "phase9/RESPONSIVE_CONVERSION_IDENTITY_POLISH_QA_EVIDENCE.md"
);
const leadAlertIdentityDecision = readDoc(
  "phase9/LEAD_ALERT_BRAND_IDENTITY.md"
);
const leadAlertIdentityEvidence = readDoc(
  "phase9/LEAD_ALERT_BRAND_IDENTITY_QA_EVIDENCE.md"
);
const durableRateLimitRehearsal = readDoc(
  "phase9/DURABLE_RATE_LIMIT_CUTOVER_REHEARSAL.md"
);

const operatingDocs = [
  currentState,
  assetManifest,
  canonicalStack,
  consolidationPlan,
  ownerQueue,
  knownBlockers,
  knownLimitations,
  goLiveRunbook,
  rollbackPlan,
].join("\n");

const productionCommit =
  "b450b41c66c6740bd20571cdbe7d8caf82e92d5e";
const productionDeployment = "dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW";
const productionGate =
  "APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT";
const previewMutationGate =
  "APPROVE PHASE 9 NEON-ATTESTED CONTROLLED PREVIEW MUTATION QA";
const pr209SealedParent =
  "b28b380f2cc3f9b63b2c0048b398e97a88dfee4b";
const pr210SealedParent =
  "3ed8d050edd386aa0cd4a83d230ff3170d24a306";
const pr211SealedParent =
  "5d566a4a14d4a7cb67175683fdf099e8d62747b7";
const pr213SealedParent =
  "3c5ecdec2941a3ef01fa26bd2810a3ffa3156eea";
const canonicalAliasGate =
  "APPROVE PHASE 9 CANONICAL ALIAS CONSOLIDATION MERGE AND PRODUCTION DEPLOYMENT";
const askAccessibilityGate =
  "APPROVE PHASE 9 ASK CONVERSION ACCESSIBILITY MERGE AND PRODUCTION DEPLOYMENT";
const responsiveIdentityGate =
  "APPROVE PHASE 9 RESPONSIVE CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT";
const leadAlertIdentityGate =
  "APPROVE PHASE 9 LEAD-ALERT BRAND IDENTITY V3 MERGE AND PRODUCTION DEPLOYMENT";
const crossDomainGate =
  "APPROVE PHASE 9 CROSS-DOMAIN MEASUREMENT CONFIGURATION, ENVIRONMENT ENTRY, MERGE, AND PRODUCTION DEPLOYMENT";
const completedReleaseLedger = [
  {
    pr: 183,
    head: "95a4f210eed4f8991e96e2eee595da5907112ba9",
    merge: "b8b31fb20223ad0f0ad311fee1ee3de20d0f7ae9",
    deployment: "dpl_HwVDyckyCRB1NoaNb1E82xSpr75z",
  },
  {
    pr: 184,
    head: "ed5da234ee34d06eb121084e01c97d79b08a815e",
    merge: "f5f82f1bfaadea0ed20da50738ebc1f83e8dab97",
    deployment: "dpl_ANYodUJ7VcceRRDAfpX6APkSKUcW",
  },
  {
    pr: 185,
    head: "2877fab35591c7f43c8def2ee920a12654b37a22",
    merge: "44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8",
    deployment: "dpl_41AZkLvufuAC92h6QJeqhiyjkBcM",
  },
  {
    pr: 193,
    head: "21fdb5b3490cdc0517518578878a8db5d1b683a7",
    merge: "9b82afb609674bb0209b73f8ac9622ab02733e2a",
    deployment: "dpl_HkKHY5nF8DeF5azY1CuHAbHGNp3a",
  },
  {
    pr: 196,
    head: "c8e19c8e822e585bc4b27c7abc47adf3a88fc8ad",
    merge: "c08abe1168840b99ccba07866bbec8cf7a6752fb",
    deployment: "dpl_sew1CoF13dtfJTsvasDJf6vyndj8",
  },
  {
    pr: 194,
    head: "851ebe530ac6a91a4e410f26538d29c1bf43f1c6",
    merge: "5a3c5c7f2463ea399c21b616ff249f6c67e156b6",
    deployment: "dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J",
  },
  {
    pr: 195,
    head: "db13953fc5f6d24a684f66c9a1c10c6b929b72b3",
    merge: productionCommit,
    deployment: productionDeployment,
  },
] as const;

describe("current release-authority documentation", () => {
  it("identifies the accepted Production commit and deployment", () => {
    for (const doc of [
      currentState,
      assetManifest,
      canonicalStack,
      consolidationPlan,
      ownerQueue,
      rollbackPlan,
    ]) {
      expect(doc).toContain(productionCommit);
      expect(doc).toContain(productionDeployment);
    }
  });

  it("records each completed release as an exact head, merge, and Production deployment chain", () => {
    for (const release of completedReleaseLedger) {
      expect(ownerQueue).toContain(`PR [#${release.pr}]`);
      expect(ownerQueue).toContain(release.head);
      expect(ownerQueue).toContain(release.merge);
      expect(ownerQueue).toContain(release.deployment);
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

  it("orders later candidates behind the sole immediate PR #209 gate", () => {
    const pr209 = ownerQueue.indexOf("Draft PR [#209]");
    const pr210 = ownerQueue.indexOf("Draft PR [#210]");
    const pr211 = ownerQueue.indexOf("Draft PR [#211]");
    const pr213 = ownerQueue.indexOf("Draft PR [#213]");
    const pr214 = ownerQueue.indexOf("Draft PR [#214]");
    const pr212 = ownerQueue.indexOf("Draft PR [#212]");

    expect(pr209).toBeGreaterThanOrEqual(0);
    expect(pr210).toBeGreaterThan(pr209);
    expect(pr211).toBeGreaterThan(pr210);
    expect(pr213).toBeGreaterThan(pr211);
    expect(pr214).toBeGreaterThan(pr213);
    expect(pr212).toBeGreaterThan(pr214);
    expect(ownerQueue).toContain(canonicalAliasGate);
    expect(ownerQueue).toContain(askAccessibilityGate);
    expect(ownerQueue).toContain(responsiveIdentityGate);
    expect(ownerQueue).toContain(leadAlertIdentityGate);
    expect(ownerQueue).toContain(crossDomainGate);
  });

  it("binds PR #210's stacked authority to the current sealed PR #209 parent", () => {
    for (const doc of [
      ownerQueue,
      canonicalAliasDecision,
      canonicalAliasEvidence,
    ]) {
      expect(doc).toContain(pr209SealedParent);
    }
    expect(canonicalAliasEvidence).toContain(
      "rescue/amm-pr210-pre-final-pr209-cutover-hygiene-20260824-162615"
    );
  });

  it("binds PR #211's stacked authority to the current sealed PR #210 parent", () => {
    for (const doc of [
      ownerQueue,
      askAccessibilityDecision,
      askAccessibilityEvidence,
    ]) {
      expect(doc).toContain(pr210SealedParent);
    }
    expect(askAccessibilityEvidence).toContain(
      "rescue/amm-pr211-pre-final-pr210-cutover-hygiene-20260824-164445"
    );
  });

  it("binds PR #213's stacked authority to the current sealed PR #211 parent", () => {
    for (const doc of [
      ownerQueue,
      responsiveIdentityDecision,
      responsiveIdentityEvidence,
    ]) {
      expect(doc).toContain(pr211SealedParent);
    }
    expect(responsiveIdentityEvidence).toContain(
      "rescue/amm-pr213-pre-final-pr211-cutover-hygiene-20260824-170330"
    );
  });

  it("binds PR #214's stacked authority to the current sealed PR #213 parent", () => {
    for (const doc of [
      ownerQueue,
      leadAlertIdentityDecision,
      leadAlertIdentityEvidence,
    ]) {
      expect(doc).toContain(pr213SealedParent);
    }
    expect(leadAlertIdentityEvidence).toContain(
      "rescue/amm-pr214-pre-final-pr213-cutover-hygiene-20260824-172407"
    );
  });

  it("resolves the mutable PR head from GitHub instead of self-pinning it", () => {
    expect(ownerQueue).toMatch(/current GitHub PR head/i);
    expect(ownerQueue).toMatch(/If the head moves[\s\S]*proof must be repeated/i);
    expect(ownerQueue).not.toMatch(/Exact head\s+`[0-9a-f]{40}`\s+passes/i);
  });

  it("does not retain superseded stacked-release authority in operating docs", () => {
    const staleAuthorityClaims = [
      "Draft PR #202 is the immediate durability correction",
      "Release stacked candidates in order",
      "PR #185 is the single consolidation vehicle",
      "The Production baseline is PR #184",
      "PR #183 is merged and live. PR #184",
      "For PR #202, add only the dedicated",
      "PR #202 has no migration. Before release",
      "#202` is the next isolated durability candidate",
    ];

    for (const staleClaim of staleAuthorityClaims) {
      expect(operatingDocs).not.toContain(staleClaim);
    }
  });

  it("binds the go-live and rollback runbooks to the atomic PR #209 candidate", () => {
    expect(goLiveRunbook).toContain("For PR #209, add only the dedicated");
    expect(goLiveRunbook).toMatch(/`#209` is the sole next atomic application candidate/);
    expect(goLiveRunbook).toContain("phase9:durable-rate-limit:readiness");
    expect(rollbackPlan).toContain("PR #209 has no migration. Before release");
    expect(rollbackPlan).toContain("phase9:durable-rate-limit:readiness");
    expect(durableRateLimitRehearsal).toContain(productionGate);
    expect(durableRateLimitRehearsal).toContain(productionDeployment);
    expect(durableRateLimitRehearsal).toMatch(/writes nothing/i);
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
