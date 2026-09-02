import { createHash } from "node:crypto";

function sha256Text(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function byteLength(value) {
  return Buffer.byteLength(String(value ?? ""), "utf8");
}

function countExact(source, needle) {
  return needle ? source.split(needle).length - 1 : 0;
}

function countMatches(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function reviewedLiteralsPreserved(source, proposedSource, contract) {
  return (contract.preservedLiterals ?? []).every((literal) => {
    const currentCount = countExact(source, literal);
    return currentCount > 0 && countExact(proposedSource, literal) === currentCount;
  });
}

function sourceFacts(source, contract) {
  return {
    byteLength: byteLength(source),
    sha256: sha256Text(source),
    currentShortcodeOccurrences: countExact(source, contract.currentShortcode),
    proposedShortcodeOccurrences: countExact(source, contract.proposedShortcode),
    shortcodeOccurrences: countMatches(source, /\[[a-z][^\]\r\n]*\]/gi),
    phoneOccurrences: countMatches(
      source,
      /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    ),
    gravityFormOccurrences: countMatches(source, /gravityform|gform_/gi),
    htmlFormOccurrences: countMatches(source, /<form\b/gi),
  };
}

function sourcePreconditionsReady(source, facts, contract) {
  return (
    facts.byteLength === contract.sourceLength &&
    facts.sha256 === contract.sourceSha256 &&
    facts.currentShortcodeOccurrences === 1 &&
    facts.proposedShortcodeOccurrences === 0 &&
    facts.shortcodeOccurrences === 1 &&
    reviewedLiteralsPreserved(source, source, contract)
  );
}

function proposedPostconditionsReady(
  source,
  proposedSource,
  sourceFactsBefore,
  proposedFacts,
  contract,
) {
  return (
    proposedFacts.byteLength === contract.proposedSourceLength &&
    proposedFacts.sha256 === contract.proposedSourceSha256 &&
    proposedFacts.currentShortcodeOccurrences === 0 &&
    proposedFacts.proposedShortcodeOccurrences === 1 &&
    proposedFacts.shortcodeOccurrences === 1 &&
    proposedFacts.phoneOccurrences === sourceFactsBefore.phoneOccurrences &&
    proposedFacts.gravityFormOccurrences === sourceFactsBefore.gravityFormOccurrences &&
    proposedFacts.htmlFormOccurrences === sourceFactsBefore.htmlFormOccurrences &&
    reviewedLiteralsPreserved(source, proposedSource, contract)
  );
}

function normalizeEvidence(options, contract) {
  const connectorVersion = String(options.connectorVersion ?? "").trim();
  const postmetaBackupSha256 = String(options.postmetaBackupSha256 ?? "")
    .trim()
    .toLowerCase();
  const revisionId = Number(options.revisionId);
  const revisionSourceSha256 = String(options.revisionSourceSha256 ?? "")
    .trim()
    .toLowerCase();
  const revisionIdReady = Number.isSafeInteger(revisionId) && revisionId > 0;
  const revisionSourceReady = revisionSourceSha256 === contract.sourceSha256;
  const approvedSellerIntentDecisionSha256 = String(
    options.approvedSellerIntentDecisionSha256 ?? "",
  ).trim().toLowerCase();
  const approvedCanonicalSourcePage = String(
    options.approvedCanonicalSourcePage ?? "",
  ).trim();
  const approvedCaptureOwner = String(
    options.approvedCaptureOwner ?? "",
  ).trim();
  const approvedDuplicatePageDisposition = String(
    options.approvedDuplicatePageDisposition ?? "",
  ).trim();
  const approvedPlacementKey = String(
    options.approvedPlacementKey ?? "",
  ).trim();
  const bicCopyReviewSha256 = String(options.bicCopyReviewSha256 ?? "")
    .trim()
    .toLowerCase();
  return {
    connectorVersion,
    connectorVersionReady: connectorVersion === contract.requiredConnectorVersion,
    postmetaBackupSha256,
    postmetaBackupReady: /^[a-f0-9]{64}$/.test(postmetaBackupSha256),
    revisionId: revisionIdReady ? revisionId : null,
    revisionSourceSha256,
    revisionSourceReady,
    revisionReady: revisionIdReady && revisionSourceReady,
    approvedSellerIntentDecisionSha256,
    sellerIntentDecisionReady:
      /^[a-f0-9]{64}$/.test(approvedSellerIntentDecisionSha256),
    approvedCanonicalSourcePage,
    canonicalSourcePageReady:
      approvedCanonicalSourcePage === contract.requiredCanonicalSourcePage,
    approvedCaptureOwner,
    captureOwnerReady: approvedCaptureOwner === contract.requiredCaptureOwner,
    approvedDuplicatePageDisposition,
    duplicatePageDispositionReady:
      /^[a-z][a-z0-9_]{2,80}$/.test(approvedDuplicatePageDisposition),
    approvedPlacementKey,
    placementKeyReady: approvedPlacementKey === contract.requiredPlacementKey,
    bicCopyReviewSha256,
    bicCopyReviewReady: /^[a-f0-9]{64}$/.test(bicCopyReviewSha256),
  };
}

function prerequisiteBlockers(evidence, contract) {
  const blockers = [];
  if (!evidence.connectorVersionReady) {
    blockers.push("connector_version_unverified");
  }
  if (!evidence.postmetaBackupReady) {
    blockers.push("postmeta_backup_sha256_missing");
  }
  if (evidence.revisionId === null) {
    blockers.push("revision_id_missing");
  } else if (!evidence.revisionSourceReady) {
    blockers.push("revision_source_sha256_unverified");
  }
  if (contract.requiresSellerIntentDecision) {
    if (!evidence.sellerIntentDecisionReady) {
      blockers.push("approved_seller_intent_decision_sha256_missing");
    }
    if (!evidence.canonicalSourcePageReady) {
      blockers.push("canonical_source_page_unapproved");
    }
    if (!evidence.captureOwnerReady) {
      blockers.push("capture_owner_unapproved");
    }
    if (!evidence.duplicatePageDispositionReady) {
      blockers.push("duplicate_page_disposition_missing");
    }
    if (!evidence.placementKeyReady) {
      blockers.push("stable_placement_key_unapproved");
    }
  }
  if (contract.requiresBicCopyReview && !evidence.bicCopyReviewReady) {
    blockers.push("bic_copy_review_sha256_missing");
  }
  return blockers;
}

function manifestBase({
  contract,
  generatedAt,
  status,
  blockers,
  sourceFactsBefore,
  proposedFacts,
  evidence,
  preservesReviewedLiterals,
}) {
  return {
    schemaVersion: contract.schemaVersion,
    generatedAt,
    mode: "offline_exact_page_source_precondition",
    status,
    placementKey: contract.placementKey,
    pageId: contract.pageId,
    sourceUrl: contract.sourceUrl,
    sourceFacts: sourceFactsBefore,
    proposedFacts,
    requiredConnectorVersion: contract.requiredConnectorVersion,
    evidence,
    sellerIntentDecisionRequired: contract.requiresSellerIntentDecision === true,
    bicCopyReviewRequired: contract.requiresBicCopyReview === true,
    blockers,
    approvalGate: contract.approvalGate,
    approvalRequired: true,
    approvalRequestable: status === "ready_for_approval",
    publicationAuthorized: false,
    publicationBlocked: true,
    wordpressMutationPerformed: false,
    cachePurgePerformed: false,
    pageMutationPerformed: false,
    formMutationPerformed: false,
    notificationMutationPerformed: false,
    databaseMutationPerformed: false,
    changesExactlyOneShortcode:
      proposedFacts?.currentShortcodeOccurrences === 0 &&
      proposedFacts?.proposedShortcodeOccurrences === 1,
    preservesReviewedLiterals,
    preservesCurrentPublicPhone:
      proposedFacts?.phoneOccurrences === sourceFactsBefore.phoneOccurrences,
    preservesGravityForms:
      proposedFacts?.gravityFormOccurrences ===
      sourceFactsBefore.gravityFormOccurrences,
    preservesHtmlForms:
      proposedFacts?.htmlFormOccurrences === sourceFactsBefore.htmlFormOccurrences,
    containsPageSource: false,
  };
}

export function prepareWordPressPageSourceCutover(
  source,
  options = {},
  contract,
) {
  if (!contract) {
    throw new Error("wordpress_page_source_cutover_contract_required");
  }
  const normalizedSource = String(source ?? "");
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const evidence = normalizeEvidence(options, contract);
  const facts = sourceFacts(normalizedSource, contract);
  const currentLiteralsReady = reviewedLiteralsPreserved(
    normalizedSource,
    normalizedSource,
    contract,
  );

  if (
    facts.sha256 === contract.proposedSourceSha256 &&
    facts.byteLength === contract.proposedSourceLength &&
    facts.currentShortcodeOccurrences === 0 &&
    facts.proposedShortcodeOccurrences === 1 &&
    facts.shortcodeOccurrences === 1 &&
    currentLiteralsReady
  ) {
    return {
      manifest: manifestBase({
        contract,
        generatedAt,
        status: "already_cutover",
        blockers: ["reviewed_shortcode_already_present_do_not_apply_twice"],
        sourceFactsBefore: facts,
        proposedFacts: facts,
        evidence,
        preservesReviewedLiterals: true,
      }),
      proposedSource: null,
    };
  }

  if (
    facts.sha256 !== contract.sourceSha256 ||
    facts.byteLength !== contract.sourceLength
  ) {
    return {
      manifest: manifestBase({
        contract,
        generatedAt,
        status: "source_hash_mismatch",
        blockers: ["page_source_changed_after_authenticated_review"],
        sourceFactsBefore: facts,
        proposedFacts: null,
        evidence,
        preservesReviewedLiterals: currentLiteralsReady,
      }),
      proposedSource: null,
    };
  }

  if (!sourcePreconditionsReady(normalizedSource, facts, contract)) {
    return {
      manifest: manifestBase({
        contract,
        generatedAt,
        status: "precondition_mismatch",
        blockers: ["reviewed_shortcode_or_copy_is_missing_or_ambiguous"],
        sourceFactsBefore: facts,
        proposedFacts: null,
        evidence,
        preservesReviewedLiterals: currentLiteralsReady,
      }),
      proposedSource: null,
    };
  }

  const shortcodeIndex = normalizedSource.indexOf(contract.currentShortcode);
  const proposedSource = `${normalizedSource.slice(0, shortcodeIndex)}${
    contract.proposedShortcode
  }${normalizedSource.slice(shortcodeIndex + contract.currentShortcode.length)}`;
  const proposedFacts = sourceFacts(proposedSource, contract);
  const preservesReviewedLiterals = reviewedLiteralsPreserved(
    normalizedSource,
    proposedSource,
    contract,
  );

  if (!proposedPostconditionsReady(
    normalizedSource,
    proposedSource,
    facts,
    proposedFacts,
    contract,
  )) {
    return {
      manifest: manifestBase({
        contract,
        generatedAt,
        status: "postcondition_mismatch",
        blockers: ["proposed_page_source_does_not_match_reviewed_bytes"],
        sourceFactsBefore: facts,
        proposedFacts,
        evidence,
        preservesReviewedLiterals,
      }),
      proposedSource: null,
    };
  }

  const blockers = prerequisiteBlockers(evidence, contract);
  const status = blockers.length === 0
    ? "ready_for_approval"
    : "blocked_prerequisites";

  return {
    manifest: manifestBase({
      contract,
      generatedAt,
      status,
      blockers,
      sourceFactsBefore: facts,
      proposedFacts,
      evidence,
      preservesReviewedLiterals,
    }),
    proposedSource,
  };
}
