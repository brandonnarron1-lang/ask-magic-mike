import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WORDPRESS_SELLER_INTENT_APPROVAL_SCHEMA,
  WORDPRESS_SELLER_INTENT_DECISION_OPTIONS,
  canonicalDecisionArtifactJson,
  validateWordPressSellerIntentDecisionArtifact,
} from "../../scripts/amm/wordpress-seller-intent-decision-artifact-lib.mjs";

const CONTRACT = {
  requiredCanonicalSourcePage:
    "https://www.ourtownproperties.com/we-buy-homes/",
  requiredCaptureOwner: "ask_magic_mike",
  requiredPlacementKey: "wordpress_we_buy_homes",
  allowedDuplicatePageDispositions: [
    "redirect_to_canonical",
    "canonicalize_to_canonical",
    "noindex_and_preserve",
    "preserve_both_single_capture_owner",
  ],
};

function evidencePacket(overrides: Record<string, unknown> = {}) {
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
    generatedAt: "2026-09-01T21:00:00.000Z",
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
    ...overrides,
  };
}

function approvedArtifact(overrides: Record<string, unknown> = {}) {
  const evidence = evidencePacket();
  return {
    schemaVersion: WORDPRESS_SELLER_INTENT_APPROVAL_SCHEMA,
    decisionStatus: "approved",
    decisionId: "amm-seller-intent-20260901-001",
    approvedAt: "2026-09-01T22:15:00.000Z",
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
    ...overrides,
  };
}

describe("WordPress seller-intent approval artifact", () => {
  it("keeps the checked-in template unmistakably draft and non-requestable", () => {
    const template = JSON.parse(
      readFileSync(
        "config/wordpress-seller-intent-decision-template.json",
        "utf8",
      ),
    );
    const result = validateWordPressSellerIntentDecisionArtifact(
      template,
      CONTRACT,
      evidencePacket(),
    );
    expect(template.decisionStatus).toBe("draft");
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("seller_intent_decision_not_approved");
    expect(result.blockers).toContain("canonical_source_page_unapproved");
  });

  it("accepts one exact approved decision and returns only hashed references", () => {
    const result = validateWordPressSellerIntentDecisionArtifact(
      approvedArtifact(),
      CONTRACT,
      evidencePacket(),
    );
    expect(result).toMatchObject({
      status: "ready",
      ready: true,
      blockers: [],
      containsRawApprovalReferences: false,
      evidencePacketValidated: true,
      decision: {
        decisionStatus: "approved",
        canonicalPageId: 3631,
        captureOwner: "ask_magic_mike",
        duplicatePageId: 4364,
        placementKey: "wordpress_we_buy_homes",
      },
    });
    expect(result.artifactSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.approvalReferenceSha256).toEqual({
      owner: expect.stringMatching(/^[a-f0-9]{64}$/),
      seo: expect.stringMatching(/^[a-f0-9]{64}$/),
      bic: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.stringify(result)).not.toContain("Owner decision record");
  });

  it("hashes semantic content deterministically regardless of object or reason order", () => {
    const first = validateWordPressSellerIntentDecisionArtifact(
      approvedArtifact(),
      CONTRACT,
      evidencePacket(),
    );
    const original = approvedArtifact();
    const reordered = {
      reasonCodes: [...(original.reasonCodes as string[])].reverse(),
      approvalReferences: {
        bic: (original.approvalReferences as Record<string, string>).bic,
        seo: (original.approvalReferences as Record<string, string>).seo,
        owner: (original.approvalReferences as Record<string, string>).owner,
      },
      canonicalFunnel: original.canonicalFunnel,
      placementKey: original.placementKey,
      duplicatePageDisposition: original.duplicatePageDisposition,
      duplicatePageId: original.duplicatePageId,
      duplicateSourcePage: original.duplicateSourcePage,
      captureOwner: original.captureOwner,
      canonicalPageId: original.canonicalPageId,
      canonicalSourcePage: original.canonicalSourcePage,
      reviewedEvidenceSha256: original.reviewedEvidenceSha256,
      reviewedEvidenceGeneratedAt: original.reviewedEvidenceGeneratedAt,
      reviewedEvidencePacketSha256: original.reviewedEvidencePacketSha256,
      approvedAt: original.approvedAt,
      decisionId: original.decisionId,
      decisionStatus: original.decisionStatus,
      schemaVersion: original.schemaVersion,
    };
    const second = validateWordPressSellerIntentDecisionArtifact(
      reordered,
      CONTRACT,
      evidencePacket(),
    );
    expect(second.ready).toBe(true);
    expect(second.artifactSha256).toBe(first.artifactSha256);
    expect(canonicalDecisionArtifactJson({ z: 1, a: 2 })).toBe(
      '{"a":2,"z":1}',
    );
  });

  it("rejects arbitrary digest evidence and unrecognized extra fields", () => {
    expect(
      validateWordPressSellerIntentDecisionArtifact(undefined, CONTRACT),
    ).toMatchObject({
      ready: false,
      blockers: ["seller_intent_decision_artifact_missing"],
      artifactSha256: null,
    });
    const result = validateWordPressSellerIntentDecisionArtifact(
      { ...approvedArtifact(), approvedSellerIntentDecisionSha256: "f".repeat(64) },
      CONTRACT,
      evidencePacket(),
    );
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain(
      "seller_intent_decision_artifact_shape_invalid",
    );
  });

  it("rejects a self-inconsistent canonical or duplicate-page choice", () => {
    const result = validateWordPressSellerIntentDecisionArtifact(
      approvedArtifact({
        canonicalPageId: 4364,
        duplicateSourcePage:
          "https://www.ourtownproperties.com/we-buy-homes/",
        duplicatePageId: 3631,
        placementKey: "wordpress_we_buy_houses",
      }),
      CONTRACT,
      evidencePacket(),
    );
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "seller_intent_decision_canonical_page_id_mismatch",
      "seller_intent_decision_duplicate_source_page_mismatch",
      "seller_intent_decision_duplicate_page_id_mismatch",
      "stable_placement_key_unapproved",
    ]));
  });

  it("rejects unsupported ownership, disposition, rationale, or secret-like references", () => {
    const result = validateWordPressSellerIntentDecisionArtifact(
      approvedArtifact({
        captureOwner: "parallel_wordpress_database",
        duplicatePageDisposition: "delete_immediately",
        reasonCodes: ["because_ai_said_so"],
        approvalReferences: {
          owner: "token=do-not-store-this",
          seo: "SEO review record 2026-09-01",
          bic: "BIC review record 2026-09-01",
        },
      }),
      CONTRACT,
      evidencePacket(),
    );
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "capture_owner_unapproved",
      "duplicate_page_disposition_unapproved",
      "seller_intent_decision_reason_codes_invalid",
      "seller_intent_decision_owner_reference_invalid",
    ]));
  });

  it("requires the exact fresh read-only evidence packet linked by digest", () => {
    const missing = validateWordPressSellerIntentDecisionArtifact(
      approvedArtifact(),
      CONTRACT,
    );
    expect(missing.ready).toBe(false);
    expect(missing.blockers).toContain(
      "seller_intent_decision_evidence_packet_missing",
    );

    const baselineEvidence = evidencePacket();
    const driftedSurfaces = baselineEvidence.surfaces.map((surface, index) =>
      index === 0
        ? { ...surface, pageModifiedGmt: "2026-09-01T21:05:00.000Z" }
        : surface,
    );
    const driftedEvidence = {
      ...baselineEvidence,
      surfaces: driftedSurfaces,
      evidenceSha256: createHash("sha256")
        .update(JSON.stringify({
          status: baselineEvidence.status,
          surfaces: driftedSurfaces,
        }))
        .digest("hex"),
    };
    const linkMismatch = validateWordPressSellerIntentDecisionArtifact(
      approvedArtifact(),
      CONTRACT,
      driftedEvidence,
    );
    expect(linkMismatch.ready).toBe(false);
    expect(linkMismatch.blockers).toContain(
      "seller_intent_decision_evidence_packet_link_mismatch",
    );

    const staleEvidence = evidencePacket({
      generatedAt: "2026-08-20T21:00:00.000Z",
    });
    const staleArtifact = approvedArtifact({
      reviewedEvidenceSha256: staleEvidence.evidenceSha256,
      reviewedEvidenceGeneratedAt: staleEvidence.generatedAt,
      reviewedEvidencePacketSha256: createHash("sha256")
        .update(canonicalDecisionArtifactJson(staleEvidence))
        .digest("hex"),
    });
    const stale = validateWordPressSellerIntentDecisionArtifact(
      staleArtifact,
      CONTRACT,
      staleEvidence,
    );
    expect(stale.ready).toBe(false);
    expect(stale.blockers).toContain(
      "seller_intent_decision_review_window_expired",
    );

    const timestampTamper = {
      ...evidencePacket(),
      generatedAt: "2026-09-01T20:30:00.000Z",
    };
    const tampered = validateWordPressSellerIntentDecisionArtifact(
      approvedArtifact(),
      CONTRACT,
      timestampTamper,
    );
    expect(tampered.ready).toBe(false);
    expect(tampered.blockers).toEqual(expect.arrayContaining([
      "seller_intent_decision_evidence_time_mismatch",
      "seller_intent_decision_evidence_packet_digest_mismatch",
    ]));
  });

  it("publishes the bounded option vocabulary without selecting a choice", () => {
    expect(WORDPRESS_SELLER_INTENT_DECISION_OPTIONS).toMatchObject({
      canonicalFunnel: "https://www.askmagicmike.com/sell",
      canonicalPages: [
        "https://www.ourtownproperties.com/we-buy-homes/",
        "https://www.ourtownproperties.com/we-buy-houses/",
      ],
    });
    expect(WORDPRESS_SELLER_INTENT_DECISION_OPTIONS.captureOwners).toContain(
      "ask_magic_mike",
    );
    expect(
      WORDPRESS_SELLER_INTENT_DECISION_OPTIONS.duplicatePageDispositions,
    ).toContain("redirect_to_canonical");
  });
});
