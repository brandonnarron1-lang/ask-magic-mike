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
const implementationStatus = readDoc("IMPLEMENTATION_STATUS.md");
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
const homeValueCompletionDecision = readDoc(
  "phase9/HOME_VALUE_COMPLETION_INTEGRITY.md"
);
const homeValueCompletionEvidence = readDoc(
  "phase9/HOME_VALUE_COMPLETION_INTEGRITY_QA_EVIDENCE.md"
);
const funnelEventIdentityDecision = readDoc(
  "phase9/FUNNEL_EVENT_IDENTITY_INTEGRITY.md"
);
const funnelEventIdentityEvidence = readDoc(
  "phase9/FUNNEL_EVENT_IDENTITY_INTEGRITY_QA_EVIDENCE.md"
);
const vendorIngressDecision = readDoc(
  "phase9/VENDOR_INGRESS_CONTRACT_LAB.md"
);
const vendorIngressEvidence = readDoc(
  "phase9/VENDOR_INGRESS_CONTRACT_LAB_QA_EVIDENCE.md"
);
const marketingSpendIngressDecision = readDoc(
  "phase9/MARKETING_SPEND_INGRESS_RELEASE_GATE.md"
);
const marketingSpendIngressEvidence = readDoc(
  "phase9/MARKETING_SPEND_INGRESS_QA_EVIDENCE.md"
);
const organicSearchIngressDecision = readDoc(
  "phase9/ORGANIC_SEARCH_INGRESS_RELEASE_GATE.md"
);
const organicSearchIngressEvidence = readDoc(
  "phase9/ORGANIC_SEARCH_INGRESS_QA_EVIDENCE.md"
);
const localProfileIngressDecision = readDoc(
  "phase9/LOCAL_PROFILE_PERFORMANCE_INGRESS.md"
);
const localProfileIngressEvidence = readDoc(
  "phase9/LOCAL_PROFILE_PERFORMANCE_INGRESS_QA_EVIDENCE.md"
);
const crossDomainMeasurementDecision = readDoc(
  "phase9/CROSS_DOMAIN_MEASUREMENT_ACTIVATION.md"
);
const crossDomainMeasurementEvidence = readDoc(
  "phase9/CROSS_DOMAIN_MEASUREMENT_QA_EVIDENCE.md"
);
const durableRateLimitRehearsal = readDoc(
  "phase9/DURABLE_RATE_LIMIT_CUTOVER_REHEARSAL.md"
);
const durableRateLimitAcceptance = readDoc(
  "phase9/DURABLE_RATE_LIMIT_PRODUCTION_ACCEPTANCE_2026-08-28.md"
);
const durableRateLimitDecision = readDoc(
  "phase9/DURABLE_RATE_LIMIT_READINESS.md"
);
const atomicAuthorityDecision = readDoc(
  "phase9/ATOMIC_RELEASE_AUTHORITY_RECONCILIATION.md"
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
  "a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca";
const productionDeployment = "dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj";
const rollbackCommit = "b450b41c66c6740bd20571cdbe7d8caf82e92d5e";
const rollbackDeployment = "dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW";
const completedDurabilityGate =
  "APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT";
const pr209Head = "b28b380f2cc3f9b63b2c0048b398e97a88dfee4b";
const pr210SealedParent =
  "93af400494a94a8d8aedb09ece16bbff4dfd214b";
const pr211SealedParent =
  "c5700eda5e32ff6ead9a985c86b811a3c46e1e66";
const pr213SealedParent =
  "d2a1bf01d0962e07dd1e460acd4c295e145cf6a8";
const pr214SealedParent =
  "81a2c7544318d630437ed3e86cbea029c5c9b57d";
const pr215SealedParent =
  "c53cec6043525b593b254c457efdbbe5a29c0520";
const pr216SealedParent =
  "211485df28fc818ab783ed357df8486f1460d5e2";
const pr217SealedParent =
  "8a6b92039bb82c1158db514c2c2f064ceb9cbbcf";
const pr218SealedParent =
  "f065d8801bec295c99185d846ff4bc38de2a0a6f";
const pr219SealedParent =
  "b628fc00fc6b03d89871c65d884fe649db025968";
const pr220SealedParent =
  "19689e95d824d7d06e5f3b60cd18335f53018c93";
const canonicalAliasGate =
  "APPROVE PHASE 9 CANONICAL ALIAS CONSOLIDATION MERGE AND PRODUCTION DEPLOYMENT";
const askAccessibilityGate =
  "APPROVE PHASE 9 ASK CONVERSION ACCESSIBILITY MERGE AND PRODUCTION DEPLOYMENT";
const responsiveIdentityGate =
  "APPROVE PHASE 9 RESPONSIVE CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT";
const leadAlertIdentityGate =
  "APPROVE PHASE 9 LEAD-ALERT BRAND IDENTITY V3 MERGE AND PRODUCTION DEPLOYMENT";
const homeValueCompletionGate =
  "APPROVE PHASE 9 HOME-VALUE COMPLETION INTEGRITY MERGE AND PRODUCTION DEPLOYMENT";
const funnelEventIdentityGate =
  "APPROVE PHASE 9 FUNNEL EVENT IDENTITY INTEGRITY MERGE AND PRODUCTION DEPLOYMENT";
const vendorIngressGate =
  "APPROVE PHASE 9 VENDOR INGRESS CONTRACT LAB MERGE AND PRODUCTION DEPLOYMENT";
const marketingSpendIngressGate =
  "APPROVE PHASE 9 MARKETING SPEND INGRESS MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT";
const organicSearchIngressGate =
  "APPROVE PHASE 9 ORGANIC SEARCH INGRESS MIGRATION, PR 219 MERGE, AND PRODUCTION DEPLOYMENT";
const localProfileIngressGate =
  "APPROVE PHASE 9 LOCAL PROFILE PERFORMANCE INGRESS PRODUCTION MIGRATION, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT";
const localProfileImportGate =
  "APPROVE LOCAL PROFILE PERFORMANCE IMPORT GATE ENABLEMENT AND SAME-COMMIT PRODUCTION REDEPLOYMENT";
const crossDomainGate =
  "APPROVE PHASE 9 CROSS-DOMAIN MEASUREMENT CONFIGURATION, ENVIRONMENT ENTRY, MERGE, AND PRODUCTION DEPLOYMENT";
const pr210Rescue =
  "rescue/amm-pr210-pre-main-cutover-20260828-210054";
const pr211Rescue =
  "rescue/amm-pr211-pre-pr210-exact-seal-20260828-213129";
const pr213Rescue =
  "rescue/amm-pr213-pre-pr211-exact-seal-20260828-215231";
const pr214Rescue =
  "rescue/amm-pr214-pre-pr213-exact-seal-20260828-222353";
const pr215Rescue =
  "rescue/amm-pr215-pre-pr214-exact-seal-20260828-224229";
const pr216Rescue =
  "rescue/amm-pr216-pre-pr215-exact-seal-20260828-231335";
const pr217Rescue =
  "rescue/amm-pr217-pre-pr216-exact-seal-20260828-234940";
const pr218Rescue =
  "rescue/amm-pr218-pre-pr217-exact-seal-20260829-001928";
const pr219Rescue =
  "rescue/amm-pr219-pre-pr218-exact-seal-20260829-004949";
const pr220Rescue =
  "rescue/amm-pr220-pre-pr219-exact-seal-20260829-012049";
const pr221Rescue =
  "rescue/amm-pr221-pre-pr220-exact-seal-20260829-020318";

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
    merge: rollbackCommit,
    deployment: rollbackDeployment,
  },
  {
    pr: 209,
    head: pr209Head,
    merge: productionCommit,
    deployment: productionDeployment,
  },
] as const;

describe("current release-authority documentation", () => {
  it("identifies the accepted PR #209 Production commit and deployment", () => {
    for (const doc of [
      currentState,
      assetManifest,
      canonicalStack,
      consolidationPlan,
      ownerQueue,
      knownBlockers,
      knownLimitations,
      goLiveRunbook,
      canonicalAliasDecision,
      canonicalAliasEvidence,
      durableRateLimitAcceptance,
      durableRateLimitDecision,
      atomicAuthorityDecision,
      implementationStatus,
    ]) {
      expect(doc).toContain(productionCommit);
      expect(doc).toContain(productionDeployment);
    }
  });

  it("records every completed release as an exact head, merge, and deployment chain", () => {
    for (const release of completedReleaseLedger) {
      expect(ownerQueue).toContain(`PR [#${release.pr}]`);
      expect(ownerQueue).toContain(release.head);
      expect(ownerQueue).toContain(release.merge);
      expect(ownerQueue).toContain(release.deployment);
    }
  });

  it("marks the PR #209 durability gate consumed and non-reusable", () => {
    expect(durableRateLimitRehearsal).toContain(completedDurabilityGate);
    expect(durableRateLimitRehearsal).toContain(pr209Head);
    expect(durableRateLimitRehearsal).toContain(productionCommit);
    expect(durableRateLimitRehearsal).toContain(productionDeployment);
    expect(durableRateLimitRehearsal).toMatch(/consumed[\s\S]*exhausted/i);
    expect(durableRateLimitAcceptance).toMatch(
      /consumed PR #209 gate is exhausted/i
    );
    expect(ownerQueue).toMatch(/completed gates are exhausted/i);
    expect(goLiveRunbook).toMatch(/exact gate is exhausted/i);
  });

  it("identifies PR #210 as the next distinct application candidate", () => {
    for (const doc of [
      currentState,
      assetManifest,
      canonicalStack,
      consolidationPlan,
      ownerQueue,
      knownBlockers,
      knownLimitations,
    ]) {
      expect(doc).toMatch(/PR #210|PR \[#210\]/);
    }

    expect(consolidationPlan).toContain(canonicalAliasGate);
    expect(ownerQueue).toContain(canonicalAliasGate);
    expect(canonicalAliasDecision).toContain(canonicalAliasGate);
    expect(canonicalAliasEvidence).toContain(canonicalAliasGate);
    expect(canonicalAliasGate).not.toBe(completedDurabilityGate);
  });

  it("orders PR #210 and later candidates after completed PR #209", () => {
    const completedPr209 = ownerQueue.indexOf("PR [#209]");
    const pr210 = ownerQueue.indexOf("Draft PR [#210]");
    const pr211 = ownerQueue.indexOf("Draft PR [#211]");
    const pr213 = ownerQueue.indexOf("Draft PR [#213]");
    const pr214 = ownerQueue.indexOf("Draft PR [#214]");
    const pr215 = ownerQueue.indexOf("Draft PR [#215]");
    const pr216 = ownerQueue.indexOf("Draft PR [#216]");
    const laterTrain = ownerQueue.indexOf("Draft PRs #217 through #225");
    const pr217 = ownerQueue.indexOf("Draft PR [#217]");
    const pr218 = ownerQueue.indexOf("Draft PR [#218]");
    const pr219 = ownerQueue.indexOf("Draft PR [#219]");
    const pr220 = ownerQueue.indexOf("Draft PR [#220]");
    const pr221 = ownerQueue.indexOf("Draft PR [#221]", pr220 + 1);

    expect(completedPr209).toBeGreaterThanOrEqual(0);
    expect(pr210).toBeGreaterThan(completedPr209);
    expect(pr211).toBeGreaterThan(pr210);
    expect(pr213).toBeGreaterThan(pr211);
    expect(pr214).toBeGreaterThan(pr213);
    expect(pr215).toBeGreaterThan(pr214);
    expect(pr216).toBeGreaterThan(pr215);
    expect(laterTrain).toBeGreaterThan(pr216);
    expect(pr217).toBeGreaterThan(laterTrain);
    expect(pr218).toBeGreaterThan(pr217);
    expect(pr219).toBeGreaterThan(pr218);
    expect(pr220).toBeGreaterThan(pr219);
    expect(pr221).toBeGreaterThan(pr220);
    expect(ownerQueue).not.toContain("Draft PR [#212]");
    expect(ownerQueue).toMatch(/PR #221\s+is the sole cross-domain candidate/i);
    expect(ownerQueue).toContain(canonicalAliasGate);
    expect(ownerQueue).toContain(askAccessibilityGate);
    expect(ownerQueue).toContain(responsiveIdentityGate);
    expect(ownerQueue).toContain(leadAlertIdentityGate);
    expect(ownerQueue).toContain(homeValueCompletionGate);
    expect(ownerQueue).toContain(funnelEventIdentityGate);
    expect(ownerQueue).toContain(vendorIngressGate);
    expect(ownerQueue).toContain(marketingSpendIngressGate);
    expect(ownerQueue).toContain(organicSearchIngressGate);
    expect(ownerQueue).toContain(localProfileIngressGate);
    expect(ownerQueue).toContain(crossDomainGate);
  });

  it("keeps superseded PRs #187 and #212 as preserved evidence without parallel authority", () => {
    for (const doc of [currentState, assetManifest, ownerQueue]) {
      expect(doc).toMatch(/(?:PR )?#187[^\n]*(?:closed|superseded)/i);
      expect(doc).toMatch(/(?:PR )?#212[^\n]*(?:closed|superseded|preserved)/i);
    }
    expect(assetManifest).toContain("Closed PR #187");
    expect(assetManifest).toContain("Closed PR #212");
    expect(ownerQueue).not.toMatch(/PR \[#212\][\s\S]{0,200}separate HOLD candidate/i);
    expect(ownerQueue).toMatch(
      /branch, commits,[\s\S]{0,40}migration, tests, and evidence preserved/i
    );
    expect(ownerQueue).toMatch(
      /branch,[\s\S]{0,40}consent repair package, evidence, and rollback materials remain preserved/i
    );
  });

  it("binds PR #210 to accepted main and preserves its pre-refresh head", () => {
    for (const doc of [
      ownerQueue,
      canonicalAliasDecision,
      canonicalAliasEvidence,
    ]) {
      expect(doc).toContain(productionCommit);
    }
    expect(ownerQueue).toContain(pr210Rescue);
    expect(canonicalAliasEvidence).toContain(pr210Rescue);
    expect(canonicalAliasEvidence).toMatch(/without force push/i);
    expect(canonicalAliasEvidence).toMatch(
      /Fresh exact-head Node[\s\S]*mandatory/i
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
    expect(ownerQueue).toContain(pr211Rescue);
    expect(askAccessibilityEvidence).toContain(pr211Rescue);
  });

  it("binds PR #213's stacked authority to the current sealed PR #211 parent", () => {
    for (const doc of [
      ownerQueue,
      responsiveIdentityDecision,
      responsiveIdentityEvidence,
    ]) {
      expect(doc).toContain(pr211SealedParent);
    }
    expect(responsiveIdentityEvidence).toContain(pr213Rescue);
  });

  it("binds PR #214's stacked authority to the current sealed PR #213 parent", () => {
    for (const doc of [
      ownerQueue,
      leadAlertIdentityDecision,
      leadAlertIdentityEvidence,
    ]) {
      expect(doc).toContain(pr213SealedParent);
    }
    expect(leadAlertIdentityEvidence).toContain(pr214Rescue);
  });

  it("binds PR #215's stacked authority to the current sealed PR #214 parent", () => {
    for (const doc of [
      ownerQueue,
      homeValueCompletionDecision,
      homeValueCompletionEvidence,
    ]) {
      expect(doc).toContain(pr214SealedParent);
    }
    expect(homeValueCompletionEvidence).toContain(pr215Rescue);
  });

  it("binds PR #216's stacked authority to the current sealed PR #215 parent", () => {
    for (const doc of [
      ownerQueue,
      funnelEventIdentityDecision,
      funnelEventIdentityEvidence,
    ]) {
      expect(doc).toContain(pr215SealedParent);
    }
    expect(funnelEventIdentityEvidence).toContain(pr216Rescue);
  });

  it("binds PR #217's stacked authority to the current sealed PR #216 parent", () => {
    for (const doc of [
      ownerQueue,
      vendorIngressDecision,
      vendorIngressEvidence,
    ]) {
      expect(doc).toContain(pr216SealedParent);
      expect(doc).toContain(vendorIngressGate);
    }
    expect(ownerQueue).toContain(pr217Rescue);
    expect(vendorIngressEvidence).toContain(pr217Rescue);
  });

  it("binds PR #218's stacked authority to the current sealed PR #217 parent", () => {
    for (const doc of [
      ownerQueue,
      marketingSpendIngressDecision,
      marketingSpendIngressEvidence,
    ]) {
      expect(doc).toContain(pr217SealedParent);
      expect(doc).toContain(marketingSpendIngressGate);
    }
    expect(ownerQueue).toContain(pr218Rescue);
    expect(marketingSpendIngressEvidence).toContain(pr218Rescue);
  });

  it("binds PR #219's stacked authority to the current sealed PR #218 parent", () => {
    for (const doc of [
      ownerQueue,
      organicSearchIngressDecision,
      organicSearchIngressEvidence,
    ]) {
      expect(doc).toContain(pr218SealedParent);
      expect(doc).toContain(organicSearchIngressGate);
    }
    expect(ownerQueue).toContain(pr219Rescue);
    expect(organicSearchIngressEvidence).toContain(pr219Rescue);
    expect(organicSearchIngressDecision).toContain(canonicalAliasGate);
    expect(organicSearchIngressDecision).not.toContain(completedDurabilityGate);
  });

  it("binds PR #220's stacked authority to the current sealed PR #219 parent", () => {
    for (const doc of [
      ownerQueue,
      localProfileIngressDecision,
      localProfileIngressEvidence,
    ]) {
      expect(doc).toContain(pr219SealedParent);
      expect(doc).toContain(localProfileIngressGate);
      expect(doc).toContain(localProfileImportGate);
    }
    expect(localProfileIngressDecision).not.toContain(completedDurabilityGate);
    expect(localProfileIngressEvidence).not.toContain(completedDurabilityGate);
    expect(ownerQueue).toContain(pr220Rescue);
    expect(localProfileIngressEvidence).toContain(pr220Rescue);
  });

  it("binds PR #221's consolidated authority to the current sealed PR #220 parent", () => {
    for (const doc of [
      ownerQueue,
      crossDomainMeasurementDecision,
      crossDomainMeasurementEvidence,
    ]) {
      expect(doc).toContain(pr220SealedParent);
      expect(doc).toContain(crossDomainGate);
    }
    expect(ownerQueue).toContain(pr221Rescue);
    expect(crossDomainMeasurementEvidence).toContain(pr221Rescue);
    expect(ownerQueue).toMatch(
      /PR #212 is closed as superseded[\s\S]*no independent release authority/i
    );
  });

  it("resolves the mutable PR head from GitHub instead of self-pinning it", () => {
    expect(ownerQueue).toMatch(/current GitHub PR head/i);
    expect(ownerQueue).toMatch(/If the head moves[\s\S]*proof must be repeated/i);
    expect(ownerQueue).not.toMatch(/Exact head\s+`[0-9a-f]{40}`\s+passes/i);
  });

  it("keeps the accepted rollback deployment immutable", () => {
    expect(rollbackPlan).toContain(rollbackDeployment);
    expect(rollbackPlan).toContain(productionDeployment);
    expect(durableRateLimitRehearsal).toContain(rollbackDeployment);
    expect(durableRateLimitAcceptance).toContain(rollbackCommit);
    expect(durableRateLimitAcceptance).toContain(rollbackDeployment);
  });

  it("does not retain superseded release authority in operating docs", () => {
    const staleAuthorityClaims = [
      "Draft PR #202 is the immediate durability correction",
      "Release stacked candidates in order",
      "PR #185 is the single consolidation vehicle",
      "The Production baseline is PR #184",
      "PR #183 is merged and live. PR #184",
      "#202` is the next isolated durability candidate",
      "sole current application release vehicle",
      "sole current application release candidate",
      "#209` is the sole next atomic application candidate",
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
