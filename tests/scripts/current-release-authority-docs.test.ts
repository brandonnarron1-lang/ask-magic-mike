import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { CURRENT_RELEASE_AUTHORITY } from "../../app/lib/growth/current-release-authority";

const readDoc = (name: string) =>
  readFileSync(resolve(process.cwd(), "docs", name), "utf8");
const readRepoFile = (name: string) =>
  readFileSync(resolve(process.cwd(), name), "utf8");

const readme = readRepoFile("README.md");
const currentReleaseAuthority = readDoc("CURRENT_RELEASE_AUTHORITY.md");
const capabilityLedgerSource = readRepoFile(
  "app/lib/growth/capability-ledger.ts"
);
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
const cumulativeProductionAcceptance = readDoc(
  "phase9/CUMULATIVE_GROWTH_PRODUCTION_ACCEPTANCE_2026-08-30.md"
);
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
const notificationOperationsDecision = readDoc(
  "phase9/NOTIFICATION_OPERATIONS_TRUTH.md"
);
const neonAdminPersistenceEvidence = readDoc(
  "phase9/NEON_ADMIN_API_PERSISTENCE_QA_EVIDENCE.md"
);

const operatingDocs = [
  currentState,
  currentReleaseAuthority,
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
  "cef0f366380e2e8aa95a70cf45a70830d7997d45";
const productionDeployment = "dpl_EU6Bx2Fj76HtBmNotCEKcfDk5uwe";
const priorProductionCommit =
  "a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca";
const priorProductionDeployment = "dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj";
const rollbackCommit = "b450b41c66c6740bd20571cdbe7d8caf82e92d5e";
const rollbackDeployment = "dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW";
const completedDurabilityGate =
  "APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT";
const cumulativeReleaseGate =
  "APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT";
const cumulativeReleaseHead =
  "9232641329acb8a02ce4cf2419cb12768ce33d17";
const cumulativeReleaseTree =
  "e6f388311fd07fc84ed0e580b77b190f7c56f458";
const cumulativeReleaseGateRun = 33313337535;
const cumulativePreviewDeployment = "dpl_5LPXmh9LJdGqmzGCFonRTQJvUU1X";
const cumulativePreviewQaRun = 33297711504;
const controlledMutationApplicationCommit =
  "382ebe32d41a23eeb0e4a969c733be78930ba87a";
const controlledMutationSurfaceSha256 =
  "823997fb72aed87a9c73e313c682361055a8622bc8d79c16dfbd62e7184c67d4";
const controlledMutationMigrationSha256 =
  "f50ffe91740fdd0690a87d673daf9e5753f122e19279ef84d729d9435d7adc35";
const currentWordPressGate =
  "APPROVE PHASE 9 OUR TOWN BASIC CONSENT BRIDGE 1.2.0 INSTALLATION, LEGACY GTM REMOVAL, AND CONTROLLED RUNTIME QA";
const staleWordPressHomepageGate =
  "APPROVE PHASE 9 OUR TOWN HOME PAGE ASK MAGIC MIKE CTA AND WIDGET PUBLICATION";
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
const pr221SealedParent =
  "61e152cb7ce03fd1904a06f30435dbe7ef36c4e1";
const pr222SealedParent =
  "c6ff9157e66705128a283b98096f74ca8247cdab";
const pr223SealedParent =
  "1d893f4c23ca53a1b852a1953b953b40e6f997f3";
const pr224SealedParent =
  "2effb45e2a324c25875dcf7d24019eae8dfdad38";
const pr225SealedParent =
  "f33c87f27bfcbbcad3b5566aefd80909d25303bb";
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
const localDemandGate =
  "APPROVE PHASE 9 LOCAL-DEMAND METRIC TRUTH GUARD MIGRATION, PR 222 MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT";
const channelEconomicsGate =
  "APPROVE PHASE 9 CHANNEL ECONOMICS TRUTH MERGE AND PRODUCTION DEPLOYMENT";
const leadIntentGate =
  "APPROVE PHASE 9 LEAD INTENT DEFAULT TRUTH MERGE AND PRODUCTION DEPLOYMENT";
const baselineReadinessGate =
  "APPROVE PHASE 9 BASELINE AND TARGET READINESS MERGE AND PRODUCTION DEPLOYMENT";
const releaseAuthorityGate =
  "APPROVE PHASE 9 RELEASE AUTHORITY DEDUPLICATION MERGE";
const gbpSquareAssetGate =
  "APPROVE PHASE 9 GOOGLE BUSINESS PROFILE SQUARE ASSETS MERGE AND PRODUCTION DEPLOYMENT";
const plannerSocialIdentityGate =
  "APPROVE PHASE 9 REVIEW PLANNER SOCIAL IDENTITY MERGE AND PRODUCTION DEPLOYMENT";
const notificationOperationsGate =
  "APPROVE PHASE 9 NOTIFICATION OPERATIONS TRUTH MERGE AND PRODUCTION DEPLOYMENT";
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
const pr223Rescue =
  "rescue/amm-pr223-pre-pr222-exact-seal-20260829-040442";
const pr224Rescue =
  "rescue/amm-pr224-pre-pr223-accessibility-seal-20260829-1210";
const pr225Rescue =
  "rescue/amm-pr225-pre-pr224-parent-refresh-20260829-1224";
const pr226Rescue =
  "rescue/amm-pr226-pre-pr225-parent-refresh-20260829-1249";

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
    merge: priorProductionCommit,
    deployment: priorProductionDeployment,
  },
  {
    pr: 238,
    head: cumulativeReleaseHead,
    merge: productionCommit,
    deployment: productionDeployment,
  },
] as const;

describe("current release-authority documentation", () => {
  it("identifies the accepted PR #238 Production commit and deployment", () => {
    for (const doc of [
      currentState,
      assetManifest,
      canonicalStack,
      consolidationPlan,
      ownerQueue,
      knownBlockers,
      knownLimitations,
      goLiveRunbook,
      implementationStatus,
      currentReleaseAuthority,
      cumulativeProductionAcceptance,
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
    expect(durableRateLimitRehearsal).toContain(priorProductionCommit);
    expect(durableRateLimitRehearsal).toContain(priorProductionDeployment);
    expect(durableRateLimitRehearsal).toMatch(/consumed[\s\S]*exhausted/i);
    expect(durableRateLimitAcceptance).toMatch(
      /consumed PR #209 gate is exhausted/i
    );
    expect(ownerQueue).toMatch(/completed gates are exhausted/i);
    expect(goLiveRunbook).toMatch(/exact gate is exhausted/i);
  });

  it("keeps the capability ledger aligned with the current release authority", () => {
    expect(readme).toContain(productionCommit);
    expect(readme).toMatch(/NO ACTIVE APPLICATION CANDIDATE/i);
    expect(readme).not.toMatch(/PR #210[\s\S]{0,120}first pending/i);
    expect(readme).not.toContain(
      "PR #209 is the sole atomic application candidate"
    );

    expect(capabilityLedgerSource).toContain("CURRENT_APPLICATION_RELEASE_GATE");
    expect(capabilityLedgerSource).toContain(currentWordPressGate);
    expect(capabilityLedgerSource).not.toContain(completedDurabilityGate);
    expect(capabilityLedgerSource).not.toContain(staleWordPressHomepageGate);
    expect(CURRENT_RELEASE_AUTHORITY.candidate).toBeNull();
    expect(capabilityLedgerSource).not.toContain(cumulativeReleaseGate);
  });

  it("identifies PR #238 as accepted and leaves no active application candidate", () => {
    for (const doc of [
      currentState,
      assetManifest,
      canonicalStack,
      consolidationPlan,
      ownerQueue,
      knownBlockers,
      knownLimitations,
    ]) {
      expect(doc).toMatch(/PR #238|PR \[#238\]/);
      expect(doc).not.toMatch(/PR #210[\s\S]{0,120}(?:next|first pending)[\s\S]{0,80}(?:candidate|vehicle)/i);
    }

    expect(currentReleaseAuthority).toContain(cumulativeReleaseHead);
    expect(currentReleaseAuthority).toContain(cumulativeReleaseTree);
    expect(currentReleaseAuthority).toContain(cumulativeReleaseGate);
    expect(currentReleaseAuthority).toMatch(/candidate: null/i);
    expect(currentReleaseAuthority).toMatch(/approval[\s\S]*consumed/i);
    expect(consolidationPlan).toMatch(/no active application[\s\S]*candidate/i);
    expect(ownerQueue).toMatch(/no active candidate/i);
    expect(knownBlockers).toMatch(/no active application candidate/i);
    expect(canonicalAliasDecision).toContain(canonicalAliasGate);
    expect(canonicalAliasEvidence).toContain(canonicalAliasGate);
    expect(cumulativeReleaseGate).not.toBe(completedDurabilityGate);
  });

  it("preserves the component lineage after PR #209 without parallel current authority", () => {
    const completedPr209 = ownerQueue.indexOf("PR [#209]");
    const pr210 = ownerQueue.indexOf("Draft PR [#210]");
    const pr211 = ownerQueue.indexOf("Draft PR [#211]");
    const pr213 = ownerQueue.indexOf("Draft PR [#213]");
    const pr214 = ownerQueue.indexOf("Draft PR [#214]");
    const pr215 = ownerQueue.indexOf("Draft PR [#215]");
    const pr216 = ownerQueue.indexOf("Draft PR [#216]");
    const laterTrain = ownerQueue.indexOf("Draft PRs #217 through #226");
    const pr217 = ownerQueue.indexOf("Draft PR [#217]");
    const pr218 = ownerQueue.indexOf("Draft PR [#218]");
    const pr219 = ownerQueue.indexOf("Draft PR [#219]");
    const pr220 = ownerQueue.indexOf("Draft PR [#220]");
    const pr221 = ownerQueue.indexOf("Draft PR [#221]", pr220 + 1);
    const pr222 = ownerQueue.indexOf("Draft PR [#222]", pr221 + 1);
    const pr223 = ownerQueue.indexOf("Draft PR [#223]", pr222 + 1);
    const pr224 = ownerQueue.indexOf("Draft PR [#224]", pr223 + 1);
    const pr225 = ownerQueue.indexOf("Draft PR [#225]", pr224 + 1);
    const pr226 = ownerQueue.indexOf("Draft PR [#226]", pr225 + 1);
    const pr227 = ownerQueue.indexOf("Draft PR [#227]", pr226 + 1);
    const pr228 = ownerQueue.indexOf("Draft PR [#228]", pr227 + 1);
    const pr229 = ownerQueue.indexOf("Draft PR [#229]", pr228 + 1);
    const pr230 = ownerQueue.indexOf("Draft PR [#230]", pr229 + 1);
    const pr231 = ownerQueue.indexOf("Draft PR [#231]", pr230 + 1);
    const pr232 = ownerQueue.indexOf("Draft PR [#232]", pr231 + 1);
    const pr233 = ownerQueue.indexOf("Draft PR [#233]", pr232 + 1);
    const pr234 = ownerQueue.indexOf("Draft PR [#234]", pr233 + 1);

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
    expect(pr222).toBeGreaterThan(pr221);
    expect(pr223).toBeGreaterThan(pr222);
    expect(pr224).toBeGreaterThan(pr223);
    expect(pr225).toBeGreaterThan(pr224);
    expect(pr226).toBeGreaterThan(pr225);
    expect(pr227).toBeGreaterThan(pr226);
    expect(pr228).toBeGreaterThan(pr227);
    expect(pr229).toBeGreaterThan(pr228);
    expect(pr230).toBeGreaterThan(pr229);
    expect(pr231).toBeGreaterThan(pr230);
    expect(pr232).toBeGreaterThan(pr231);
    expect(pr233).toBeGreaterThan(pr232);
    expect(pr234).toBeGreaterThan(pr233);
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
    expect(ownerQueue).toContain(localDemandGate);
    expect(ownerQueue).toContain(channelEconomicsGate);
    expect(ownerQueue).toContain(leadIntentGate);
    expect(ownerQueue).toContain(baselineReadinessGate);
    expect(ownerQueue).toContain(releaseAuthorityGate);
    expect(ownerQueue).toContain(gbpSquareAssetGate);
    expect(ownerQueue).toContain(plannerSocialIdentityGate);
    expect(ownerQueue).toContain(notificationOperationsGate);
    expect(notificationOperationsDecision).toContain(notificationOperationsGate);
    expect(assetManifest).toContain("PRs #232–#243");
    expect(currentState).toContain("#227 through #234");
    expect(ownerQueue).toMatch(/Preserved component train[\s\S]*historical evidence[\s\S]*(?:not|none is) currently requestable/i);
    expect(currentState).toMatch(/#210 through #243[\s\S]*No independent current merge\/deploy authority/i);
  });

  it("binds the machine-readable authority to the reviewed migration bytes", () => {
    expect(CURRENT_RELEASE_AUTHORITY.schemaVersion).toBe(4);
    expect(CURRENT_RELEASE_AUTHORITY.production).toMatchObject({
      pr: 238,
      reviewedHead: cumulativeReleaseHead,
      mergeCommit: productionCommit,
      tree: cumulativeReleaseTree,
      deploymentId: productionDeployment,
      status: "accepted",
      rollbackDeploymentId: priorProductionDeployment,
      releaseGate: {
        runId: cumulativeReleaseGateRun,
        status: "success",
      },
    });
    expect(CURRENT_RELEASE_AUTHORITY.candidate).toBeNull();
    expect(CURRENT_RELEASE_AUTHORITY.releasedCutover).toMatchObject({
      pr: 238,
      branch: "codex/phase9-cumulative-release-20260829",
      reviewedHead: cumulativeReleaseHead,
      tree: cumulativeReleaseTree,
      mergeCommit: productionCommit,
      deploymentId: productionDeployment,
      status: "applied_and_verified",
      approval: {
        phrase: cumulativeReleaseGate,
        status: "consumed",
      },
      cutoverCommand: "pnpm run phase9:cumulative-growth:cutover -- --execute",
      releaseGate: {
        runId: cumulativeReleaseGateRun,
        status: "success",
      },
      preview: {
        deploymentId: cumulativePreviewDeployment,
        target: "preview",
        status: "ready",
      },
      previewQa: {
        runId: cumulativePreviewQaRun,
        safeDbWrite: false,
        previewIdentityConfirmed: true,
        productionEndpointRejected: true,
        providerDeliveryDisabled: true,
        status: "success",
      },
      controlledMutationProof: {
        status: "verified_reused_unchanged_surface",
        applicationCommit: controlledMutationApplicationCommit,
        surfaceSha256: controlledMutationSurfaceSha256,
        migrationVersion: "20260830190000",
        migrationSha256: controlledMutationMigrationSha256,
        previewIdentityConfirmed: true,
        providerDeliveryDisabled: true,
        durableReadback: true,
        idempotencyVerified: true,
        terminalTestCloseoutVerified: true,
      },
      importGates: {
        marketingSpend: false,
        organicSearch: false,
        localProfilePerformance: false,
      },
      backupReceipt: {
        sha256: "30fdeca85a7f883db9b812ed676a19f7ec141495fe1e1683bfb8b0e6282f8c49",
        sizeBytes: 380265,
        restoreEntries: 659,
        retention: "retained_mode_600",
      },
      postflight: {
        migrationLedgerRowsPerVersion: 1,
        receiptRows: 0,
        existingCountsUnchanged: true,
        privilegeChecksPassed: true,
        healthChecksPassed: true,
      },
    });
    expect(CURRENT_RELEASE_AUTHORITY.releasedCutover.migrations).toHaveLength(5);
    expect(new Set(CURRENT_RELEASE_AUTHORITY.releasedCutover.migrations.map(({ version }) => version)).size).toBe(5);
    expect(CURRENT_RELEASE_AUTHORITY.consolidatedComponentTrain.lastPr).toBe(243);
    expect(CURRENT_RELEASE_AUTHORITY.dependentReviewArtifacts).toEqual([]);

    for (const migration of CURRENT_RELEASE_AUTHORITY.releasedCutover.migrations) {
      const bytes = readFileSync(resolve(process.cwd(), migration.file));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        migration.sha256
      );
    }
  });

  it("binds reused controlled-mutation proof to the unchanged current surface", () => {
    const proof = CURRENT_RELEASE_AUTHORITY.releasedCutover.controlledMutationProof;
    expect(proof.surfaceFiles).toHaveLength(36);
    expect(new Set(proof.surfaceFiles).size).toBe(proof.surfaceFiles.length);
    expect([...proof.surfaceFiles].sort()).toEqual(proof.surfaceFiles);

    const surfaceHash = createHash("sha256");
    for (const file of proof.surfaceFiles) {
      surfaceHash.update(file);
      surfaceHash.update("\0");
      surfaceHash.update(readFileSync(resolve(process.cwd(), file)));
      surfaceHash.update("\0");
    }
    expect(surfaceHash.digest("hex")).toBe(controlledMutationSurfaceSha256);

    const candidateMigration = CURRENT_RELEASE_AUTHORITY.releasedCutover.migrations.find(
      ({ version }) => version === proof.migrationVersion
    );
    expect(candidateMigration?.sha256).toBe(controlledMutationMigrationSha256);
    expect(proof.evidencePath).toBe(
      "docs/phase9/NEON_ADMIN_API_PERSISTENCE_QA_EVIDENCE.md"
    );
    expect(neonAdminPersistenceEvidence).toContain(
      controlledMutationApplicationCommit
    );
    expect(neonAdminPersistenceEvidence).toContain(
      controlledMutationMigrationSha256
    );
    expect(currentReleaseAuthority).toContain(controlledMutationSurfaceSha256);
    expect(implementationStatus).toContain(controlledMutationSurfaceSha256);
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
      expect(doc).toContain(priorProductionCommit);
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

  it("keeps PRs #222 through #226 in one exact-parent release train", () => {
    expect(ownerQueue).toContain(pr221SealedParent);
    expect(ownerQueue).toContain(pr222SealedParent);
    expect(ownerQueue).toContain(pr223SealedParent);
    expect(ownerQueue).toContain(pr224SealedParent);
    expect(ownerQueue).toContain(pr225SealedParent);
    expect(ownerQueue).toContain(pr223Rescue);
    expect(ownerQueue).toContain(pr224Rescue);
    expect(ownerQueue).toContain(pr225Rescue);
    expect(ownerQueue).toContain(pr226Rescue);
    expect(ownerQueue).toContain(localDemandGate);
    expect(ownerQueue).toContain(channelEconomicsGate);
    expect(ownerQueue).toContain(leadIntentGate);
    expect(ownerQueue).toContain(baselineReadinessGate);
    expect(ownerQueue).toContain(releaseAuthorityGate);
    expect(currentState).toMatch(/#226 release-authority deduplication/i);
    expect(assetManifest).toMatch(/PR #226[\s\S]*documentation\/test-only/i);
  });

  it("pins the accepted cumulative head and closes its authority", () => {
    expect(ownerQueue).toContain(cumulativeReleaseHead);
    expect(currentReleaseAuthority).toContain(cumulativeReleaseHead);
    expect(currentReleaseAuthority).toMatch(/candidate: null/i);
    expect(currentReleaseAuthority).toMatch(/consumed[\s\S]*cannot authorize/i);
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
      "PR #210 is the first pending application candidate",
      "Draft PR #210 is the next ordered application release candidate",
      "Draft PR #210 is the next ordered application release vehicle",
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
      /PRs #202[–-]#208[\s\S]*superseded for release by PR #209/
    );
    expect(ownerQueue).toMatch(
      /PRs #202 through #208[\s\S]*no independent release authority/
    );
  });
});
