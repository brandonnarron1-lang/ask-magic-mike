import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WORDPRESS_PAGE3631_CURRENT_SHORTCODE,
  WORDPRESS_PAGE3631_CUTOVER_CONTRACT,
  WORDPRESS_PAGE3631_PROPOSED_SHORTCODE,
  WORDPRESS_PAGE3631_PUBLICATION_GATE,
  prepareWordPressPage3631Cutover,
} from "../../scripts/amm/wordpress-page3631-cutover-readiness.mjs";
import { prepareWordPressPageSourceCutover } from "../../scripts/amm/wordpress-page-source-cutover-lib.mjs";
import { canonicalDecisionArtifactJson } from "../../scripts/amm/wordpress-seller-intent-decision-artifact-lib.mjs";

const GENERATED_AT = "2026-09-01T20:30:00.000Z";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function fixtureSource() {
  return `<!-- preserved seller copy -->\n${WORDPRESS_PAGE3631_CURRENT_SHORTCODE}\n<!-- preserved page body -->`;
}

function fixtureContract(source = fixtureSource()) {
  const proposed = source.replace(
    WORDPRESS_PAGE3631_CURRENT_SHORTCODE,
    WORDPRESS_PAGE3631_PROPOSED_SHORTCODE,
  );
  return {
    ...WORDPRESS_PAGE3631_CUTOVER_CONTRACT,
    sourceLength: Buffer.byteLength(source),
    sourceSha256: sha256(source),
    proposedSourceLength: Buffer.byteLength(proposed),
    proposedSourceSha256: sha256(proposed),
  };
}

function approvedSellerIntentDecision() {
  const evidence = sellerIntentEvidencePacket();
  return {
    schemaVersion: "amm.wordpress_seller_intent_approval.v1",
    decisionStatus: "approved",
    decisionId: "amm-seller-intent-20260901-001",
    approvedAt: GENERATED_AT,
    reviewedEvidenceSha256: evidence.evidenceSha256,
    reviewedEvidenceGeneratedAt: evidence.generatedAt,
    reviewedEvidencePacketSha256: createHash("sha256")
      .update(canonicalDecisionArtifactJson(evidence))
      .digest("hex"),
    canonicalSourcePage:
      "https://www.ourtownproperties.com/we-buy-homes/",
    canonicalPageId: 3631,
    captureOwner: "ask_magic_mike",
    duplicateSourcePage:
      "https://www.ourtownproperties.com/we-buy-houses/",
    duplicatePageId: 4364,
    duplicatePageDisposition: "redirect_to_canonical",
    placementKey: "wordpress_we_buy_homes",
    canonicalFunnel: "https://www.askmagicmike.com/sell",
    approvalReferences: {
      owner: "Owner decision record 2026-09-01",
      seo: "SEO review record 2026-09-01",
      bic: "BIC review record 2026-09-01",
    },
    reasonCodes: ["search_authority", "duplicate_capture_reduction"],
  };
}

function sellerIntentEvidencePacket() {
  const status = "decision_required";
  const surfaces = [
    {
      key: "we_buy_homes",
      sourcePage: "https://www.ourtownproperties.com/we-buy-homes/",
      expectedPageId: 3631,
      pageId: 3631,
      pageIdMatches: true,
      selfCanonical: true,
      metaNoindex: false,
      indexableCandidate: true,
      rejectedAskMagicMikeHrefOccurrences: 0,
    },
    {
      key: "we_buy_houses",
      sourcePage: "https://www.ourtownproperties.com/we-buy-houses/",
      expectedPageId: 4364,
      pageId: 4364,
      pageIdMatches: true,
      selfCanonical: true,
      metaNoindex: false,
      indexableCandidate: true,
      rejectedAskMagicMikeHrefOccurrences: 0,
    },
  ];
  return {
    schemaVersion: "amm.wordpress_seller_intent_decision.v1",
    manifestKey: "wordpress_seller_intent_decision",
    generatedAt: "2026-09-01T20:00:00.000Z",
    mode: "read_only_canonical_decision",
    status,
    publicationBlocked: true,
    publicationAuthorized: false,
    publicationGateIssued: false,
    mutationPerformed: false,
    wordpressMutationPerformed: false,
    databaseMutationPerformed: false,
    leadSubmitted: false,
    notificationSent: false,
    containsRawPageHtml: false,
    surfaces,
    evidenceSha256: createHash("sha256")
      .update(JSON.stringify({ status, surfaces }))
      .digest("hex"),
  };
}

describe("WordPress page 3631 exact-source cutover readiness", () => {
  it("pins the authenticated source and copy-preserving proposal", () => {
    const diskContract = JSON.parse(
      readFileSync("config/wordpress-page3631-cutover-contract.json", "utf8"),
    );
    expect(diskContract).toEqual(WORDPRESS_PAGE3631_CUTOVER_CONTRACT);
    expect(WORDPRESS_PAGE3631_CUTOVER_CONTRACT).toMatchObject({
      pageId: 3631,
      sourceLength: 2480,
      sourceSha256:
        "2c6c4a1b75afd133b92840d0f846f2a82f059b25f73aa0b2914d97d02ab1b8df",
      proposedSourceLength: 2624,
      proposedSourceSha256:
        "1919ec017662efd5dfa04e81bf789f72ec478c16cbae7d0c0e59e0f7899c08e2",
      requiredConnectorVersion: "1.1.0",
      approvalGate: WORDPRESS_PAGE3631_PUBLICATION_GATE,
      requiresSellerIntentDecision: true,
      requiredCanonicalSourcePage:
        "https://www.ourtownproperties.com/we-buy-homes/",
      requiredCaptureOwner: "ask_magic_mike",
      requiredPlacementKey: "wordpress_we_buy_homes",
      requiresBicCopyReview: true,
    });
    expect(WORDPRESS_PAGE3631_CURRENT_SHORTCODE).not.toContain("route=");
    expect(WORDPRESS_PAGE3631_PROPOSED_SHORTCODE).toContain('route="/sell"');
    for (const literal of WORDPRESS_PAGE3631_CUTOVER_CONTRACT.preservedLiterals) {
      expect(WORDPRESS_PAGE3631_CURRENT_SHORTCODE).toContain(literal);
      expect(WORDPRESS_PAGE3631_PROPOSED_SHORTCODE).toContain(literal);
    }
  });

  it("changes one token while preserving the CTA headline, text, and button", () => {
    const source = fixtureSource();
    const result = prepareWordPressPageSourceCutover(
      source,
      { generatedAt: GENERATED_AT, revisionId: 4338 },
      fixtureContract(source),
    );

    expect(result.manifest).toMatchObject({
      status: "blocked_prerequisites",
      changesExactlyOneShortcode: true,
      preservesReviewedLiterals: true,
      preservesCurrentPublicPhone: true,
      preservesGravityForms: true,
      preservesHtmlForms: true,
      approvalRequestable: false,
      publicationAuthorized: false,
      publicationBlocked: true,
      blockers: [
        "connector_version_unverified",
        "postmeta_backup_sha256_missing",
        "revision_source_sha256_unverified",
        "seller_intent_decision_artifact_missing",
        "bic_copy_review_sha256_missing",
      ],
    });
    expect(result.proposedSource).toBe(
      source.replace(
        WORDPRESS_PAGE3631_CURRENT_SHORTCODE,
        WORDPRESS_PAGE3631_PROPOSED_SHORTCODE,
      ),
    );
  });

  it("becomes requestable only with rollback, seller decision, and BIC evidence", () => {
    const source = fixtureSource();
    const contract = fixtureContract(source);
    const result = prepareWordPressPageSourceCutover(
      source,
      {
        generatedAt: GENERATED_AT,
        connectorVersion: "1.1.0",
        postmetaBackupSha256: "b".repeat(64),
        revisionId: 4338,
        revisionSourceSha256: contract.sourceSha256,
        sellerIntentDecisionArtifact: approvedSellerIntentDecision(),
        sellerIntentDecisionEvidenceManifest: sellerIntentEvidencePacket(),
        bicCopyReviewSha256: "d".repeat(64),
      },
      contract,
    );
    expect(result.manifest).toMatchObject({
      status: "ready_for_approval",
      blockers: [],
      approvalRequestable: true,
      publicationAuthorized: false,
      publicationBlocked: true,
      preservesReviewedLiterals: true,
      evidence: {
        sellerIntentDecisionReady: true,
        sellerIntentDecisionContainsRawApprovalReferences: false,
        sellerIntentDecisionEvidencePacketValidated: true,
        approvedSellerIntentDecisionSha256: expect.stringMatching(
          /^[a-f0-9]{64}$/,
        ),
      },
    });
  });

  it("does not accept a standalone digest or duplicated decision fields", () => {
    const source = fixtureSource();
    const contract = fixtureContract(source);
    const result = prepareWordPressPageSourceCutover(
      source,
      {
        connectorVersion: "1.1.0",
        postmetaBackupSha256: "b".repeat(64),
        revisionId: 4338,
        revisionSourceSha256: contract.sourceSha256,
        approvedSellerIntentDecisionSha256: "c".repeat(64),
        approvedCanonicalSourcePage:
          "https://www.ourtownproperties.com/we-buy-homes/",
        approvedCaptureOwner: "ask_magic_mike",
        approvedDuplicatePageDisposition: "redirect_to_canonical",
        approvedPlacementKey: "wordpress_we_buy_homes",
        bicCopyReviewSha256: "d".repeat(64),
      },
      contract,
    );
    expect(result.manifest).toMatchObject({
      status: "blocked_prerequisites",
      approvalRequestable: false,
      blockers: ["seller_intent_decision_artifact_missing"],
    });
  });

  it("fails closed on source, copy, duplicate, or output drift", () => {
    const source = fixtureSource();
    const contract = fixtureContract(source);
    expect(
      prepareWordPressPageSourceCutover(`${source}\n<!-- drift -->`, {}, contract)
        .manifest.status,
    ).toBe("source_hash_mismatch");

    const copyDrift = source.replace("Get Local Guidance", "Generic Button");
    expect(
      prepareWordPressPageSourceCutover(
        copyDrift,
        {},
        fixtureContract(copyDrift),
      ).manifest.status,
    ).toBe("precondition_mismatch");

    const duplicate = `${source}\n${WORDPRESS_PAGE3631_CURRENT_SHORTCODE}`;
    expect(
      prepareWordPressPageSourceCutover(
        duplicate,
        {},
        fixtureContract(duplicate),
      ).manifest.status,
    ).toBe("precondition_mismatch");

    expect(
      prepareWordPressPageSourceCutover(source, {}, {
        ...contract,
        proposedSourceSha256: "0".repeat(64),
      }).manifest.status,
    ).toBe("postcondition_mismatch");
  });

  it("recognizes the exact proposal and refuses a second application", () => {
    const source = fixtureSource();
    const contract = fixtureContract(source);
    const proposed = source.replace(
      WORDPRESS_PAGE3631_CURRENT_SHORTCODE,
      WORDPRESS_PAGE3631_PROPOSED_SHORTCODE,
    );
    const result = prepareWordPressPageSourceCutover(proposed, {}, contract);
    expect(result.manifest.status).toBe("already_cutover");
    expect(result.manifest.approvalRequestable).toBe(false);
    expect(result.manifest.publicationBlocked).toBe(true);
    expect(result.manifest.preservesReviewedLiterals).toBe(true);
    expect(result.proposedSource).toBeNull();
  });

  it("keeps the shared engine and wrapper read-only and provider-free", () => {
    const source = [
      readFileSync("scripts/amm/wordpress-page-source-cutover-lib.mjs", "utf8"),
      readFileSync("scripts/amm/wordpress-page3631-cutover-readiness.mjs", "utf8"),
      readFileSync(
        "scripts/amm/wordpress-seller-intent-decision-artifact-lib.mjs",
        "utf8",
      ),
    ].join("\n");
    expect(source).toContain("readFile");
    expect(source).not.toMatch(
      /writeFile|fetch\(|DATABASE_URL|nodemailer|send\(|\bPOST\b|\bPUT\b|\bPATCH\b|\bDELETE\b/,
    );
    expect(source).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });
});
