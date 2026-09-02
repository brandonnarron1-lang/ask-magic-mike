import { createHash } from "node:crypto";

export const WORDPRESS_SELLER_INTENT_APPROVAL_SCHEMA =
  "amm.wordpress_seller_intent_approval.v1";

const CANONICAL_FUNNEL = "https://www.askmagicmike.com/sell";
const SELLER_INTENT_EVIDENCE_SCHEMA =
  "amm.wordpress_seller_intent_decision.v1";
const SELLER_INTENT_EVIDENCE_KEY = "wordpress_seller_intent_decision";
const MAX_REVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_DECISIONS = Object.freeze({
  "https://www.ourtownproperties.com/we-buy-homes/": Object.freeze({
    pageId: 3631,
    placementKey: "wordpress_we_buy_homes",
    duplicateSourcePage: "https://www.ourtownproperties.com/we-buy-houses/",
    duplicatePageId: 4364,
  }),
  "https://www.ourtownproperties.com/we-buy-houses/": Object.freeze({
    pageId: 4364,
    placementKey: "wordpress_we_buy_houses",
    duplicateSourcePage: "https://www.ourtownproperties.com/we-buy-homes/",
    duplicatePageId: 3631,
  }),
});

const CAPTURE_OWNERS = new Set(["ask_magic_mike", "canonical_bridge"]);
const DUPLICATE_PAGE_DISPOSITIONS = new Set([
  "redirect_to_canonical",
  "canonicalize_to_canonical",
  "noindex_and_preserve",
  "preserve_both_single_capture_owner",
]);
const REASON_CODES = new Set([
  "conversion_path_clarity",
  "duplicate_capture_reduction",
  "inbound_links",
  "owner_operating_preference",
  "regency_content_ownership",
  "search_authority",
]);
const ROOT_KEYS = new Set([
  "schemaVersion",
  "decisionStatus",
  "decisionId",
  "approvedAt",
  "reviewedEvidenceSha256",
  "reviewedEvidenceGeneratedAt",
  "reviewedEvidencePacketSha256",
  "canonicalSourcePage",
  "canonicalPageId",
  "captureOwner",
  "duplicateSourcePage",
  "duplicatePageId",
  "duplicatePageDisposition",
  "placementKey",
  "canonicalFunnel",
  "approvalReferences",
  "reasonCodes",
]);
const APPROVAL_REFERENCE_KEYS = new Set(["owner", "seo", "bic"]);

function isPlainRecord(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, expected) {
  if (!isPlainRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(value);
}

function validReference(value) {
  return value.length >= 4 &&
    value.length <= 160 &&
    !/[\r\n]/.test(value) &&
    !/\b(?:password|secret|token|api[_ -]?key)\s*[:=]/i.test(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalDecisionArtifactJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeArtifact(input) {
  const approvalReferences = isPlainRecord(input?.approvalReferences)
    ? input.approvalReferences
    : {};
  const reasonCodes = Array.isArray(input?.reasonCodes)
    ? input.reasonCodes.map(text).filter(Boolean).sort()
    : [];
  const approvedAtInput = text(input?.approvedAt);
  const approvedAtDate = new Date(approvedAtInput);
  const approvedAt = Number.isNaN(approvedAtDate.getTime())
    ? approvedAtInput
    : approvedAtDate.toISOString();

  return {
    schemaVersion: text(input?.schemaVersion),
    decisionStatus: text(input?.decisionStatus),
    decisionId: text(input?.decisionId),
    approvedAt,
    reviewedEvidenceSha256: text(input?.reviewedEvidenceSha256).toLowerCase(),
    reviewedEvidenceGeneratedAt: text(input?.reviewedEvidenceGeneratedAt),
    reviewedEvidencePacketSha256: text(
      input?.reviewedEvidencePacketSha256,
    ).toLowerCase(),
    canonicalSourcePage: text(input?.canonicalSourcePage),
    canonicalPageId: Number(input?.canonicalPageId),
    captureOwner: text(input?.captureOwner),
    duplicateSourcePage: text(input?.duplicateSourcePage),
    duplicatePageId: Number(input?.duplicatePageId),
    duplicatePageDisposition: text(input?.duplicatePageDisposition),
    placementKey: text(input?.placementKey),
    canonicalFunnel: text(input?.canonicalFunnel),
    approvalReferences: {
      owner: text(approvalReferences.owner),
      seo: text(approvalReferences.seo),
      bic: text(approvalReferences.bic),
    },
    reasonCodes,
  };
}

function referenceDigests(references) {
  return Object.fromEntries(
    Object.entries(references).map(([key, value]) => [
      key,
      validReference(value) ? sha256(value) : null,
    ]),
  );
}

function validateEvidencePacket(input) {
  if (!isPlainRecord(input)) {
    return {
      ready: false,
      blockers: ["seller_intent_decision_evidence_packet_missing"],
      evidenceSha256: null,
      generatedAt: null,
      packetSha256: null,
    };
  }

  const blockers = [];
  const generatedAt = text(input.generatedAt);
  const generatedAtTime = new Date(generatedAt).getTime();
  const surfaces = Array.isArray(input.surfaces) ? input.surfaces : [];
  const expectedSurfaces = new Map([
    ["we_buy_homes", {
      sourcePage: "https://www.ourtownproperties.com/we-buy-homes/",
      pageId: 3631,
    }],
    ["we_buy_houses", {
      sourcePage: "https://www.ourtownproperties.com/we-buy-houses/",
      pageId: 4364,
    }],
  ]);

  if (
    text(input.schemaVersion) !== SELLER_INTENT_EVIDENCE_SCHEMA ||
    text(input.manifestKey) !== SELLER_INTENT_EVIDENCE_KEY
  ) {
    blockers.push("seller_intent_decision_evidence_packet_schema_invalid");
  }
  if (
    text(input.mode) !== "read_only_canonical_decision" ||
    input.publicationBlocked !== true ||
    input.publicationAuthorized !== false ||
    input.publicationGateIssued !== false ||
    input.mutationPerformed !== false ||
    input.wordpressMutationPerformed !== false ||
    input.databaseMutationPerformed !== false ||
    input.leadSubmitted !== false ||
    input.notificationSent !== false ||
    input.containsRawPageHtml !== false
  ) {
    blockers.push("seller_intent_decision_evidence_packet_not_read_only");
  }
  if (text(input.status) !== "decision_required") {
    blockers.push("seller_intent_decision_evidence_packet_status_invalid");
  }
  if (!Number.isFinite(generatedAtTime) || !generatedAt.endsWith("Z")) {
    blockers.push("seller_intent_decision_evidence_packet_time_invalid");
  }
  if (surfaces.length !== expectedSurfaces.size) {
    blockers.push("seller_intent_decision_evidence_packet_surfaces_invalid");
  } else {
    const observedKeys = new Set();
    for (const surface of surfaces) {
      if (!isPlainRecord(surface)) {
        blockers.push("seller_intent_decision_evidence_packet_surfaces_invalid");
        continue;
      }
      const key = text(surface.key);
      const expected = expectedSurfaces.get(key);
      if (
        !expected ||
        observedKeys.has(key) ||
        text(surface.sourcePage) !== expected.sourcePage ||
        Number(surface.expectedPageId) !== expected.pageId ||
        Number(surface.pageId) !== expected.pageId ||
        surface.pageIdMatches !== true ||
        surface.selfCanonical !== true ||
        surface.metaNoindex !== false ||
        surface.indexableCandidate !== true ||
        Number(surface.rejectedAskMagicMikeHrefOccurrences) !== 0
      ) {
        blockers.push("seller_intent_decision_evidence_packet_surfaces_invalid");
      }
      observedKeys.add(key);
    }
  }

  const evidenceSha256 = text(input.evidenceSha256).toLowerCase();
  const computedEvidenceSha256 = sha256(JSON.stringify({
    status: input.status,
    surfaces: input.surfaces,
  }));
  if (
    !isSha256(evidenceSha256) ||
    evidenceSha256 !== computedEvidenceSha256
  ) {
    blockers.push("seller_intent_decision_evidence_packet_digest_invalid");
  }

  return {
    ready: blockers.length === 0,
    blockers: [...new Set(blockers)],
    evidenceSha256: isSha256(evidenceSha256) ? evidenceSha256 : null,
    generatedAt: Number.isFinite(generatedAtTime)
      ? new Date(generatedAtTime).toISOString()
      : null,
    packetSha256: sha256(canonicalDecisionArtifactJson(input)),
  };
}

export function validateWordPressSellerIntentDecisionArtifact(
  input,
  contract = {},
  evidencePacket,
) {
  if (!isPlainRecord(input)) {
    return {
      status: "missing",
      ready: false,
      blockers: ["seller_intent_decision_artifact_missing"],
      artifactSha256: null,
      decision: null,
      approvalReferenceSha256: { owner: null, seo: null, bic: null },
      containsRawApprovalReferences: false,
      evidencePacketValidated: false,
    };
  }

  const normalized = normalizeArtifact(input);
  const evidence = validateEvidencePacket(evidencePacket);
  const blockers = [...evidence.blockers];
  if (!exactKeys(input, ROOT_KEYS)) {
    blockers.push("seller_intent_decision_artifact_shape_invalid");
  }
  if (!exactKeys(input.approvalReferences, APPROVAL_REFERENCE_KEYS)) {
    blockers.push("seller_intent_decision_approval_references_shape_invalid");
  }
  if (normalized.schemaVersion !== WORDPRESS_SELLER_INTENT_APPROVAL_SCHEMA) {
    blockers.push("seller_intent_decision_schema_invalid");
  }
  if (normalized.decisionStatus !== "approved") {
    blockers.push("seller_intent_decision_not_approved");
  }
  if (!/^[a-z0-9][a-z0-9._-]{7,79}$/.test(normalized.decisionId)) {
    blockers.push("seller_intent_decision_id_invalid");
  }
  if (
    !normalized.approvedAt ||
    Number.isNaN(new Date(normalized.approvedAt).getTime()) ||
    !normalized.approvedAt.endsWith("Z")
  ) {
    blockers.push("seller_intent_decision_approved_at_invalid");
  }
  if (!isSha256(normalized.reviewedEvidenceSha256)) {
    blockers.push("seller_intent_decision_evidence_sha256_invalid");
  }
  const reviewedEvidenceGeneratedAtTime = new Date(
    normalized.reviewedEvidenceGeneratedAt,
  ).getTime();
  if (!Number.isFinite(reviewedEvidenceGeneratedAtTime)) {
    blockers.push("seller_intent_decision_evidence_time_invalid");
  }
  if (!isSha256(normalized.reviewedEvidencePacketSha256)) {
    blockers.push("seller_intent_decision_evidence_packet_sha256_invalid");
  }
  if (
    evidence.evidenceSha256 &&
    normalized.reviewedEvidenceSha256 !== evidence.evidenceSha256
  ) {
    blockers.push("seller_intent_decision_evidence_packet_link_mismatch");
  }
  if (
    evidence.generatedAt &&
    Number.isFinite(reviewedEvidenceGeneratedAtTime) &&
    new Date(reviewedEvidenceGeneratedAtTime).toISOString() !==
      evidence.generatedAt
  ) {
    blockers.push("seller_intent_decision_evidence_time_mismatch");
  }
  if (
    evidence.packetSha256 &&
    normalized.reviewedEvidencePacketSha256 !== evidence.packetSha256
  ) {
    blockers.push("seller_intent_decision_evidence_packet_digest_mismatch");
  }
  const approvedAtTime = new Date(normalized.approvedAt).getTime();
  const evidenceGeneratedAtTime = evidence.generatedAt
    ? new Date(evidence.generatedAt).getTime()
    : Number.NaN;
  if (
    Number.isFinite(approvedAtTime) &&
    Number.isFinite(evidenceGeneratedAtTime)
  ) {
    if (approvedAtTime < evidenceGeneratedAtTime) {
      blockers.push("seller_intent_decision_approved_before_evidence");
    } else if (approvedAtTime - evidenceGeneratedAtTime > MAX_REVIEW_WINDOW_MS) {
      blockers.push("seller_intent_decision_review_window_expired");
    }
  }

  const pageDecision = PAGE_DECISIONS[normalized.canonicalSourcePage];
  if (!pageDecision) {
    blockers.push("canonical_source_page_unapproved");
  } else {
    if (normalized.canonicalPageId !== pageDecision.pageId) {
      blockers.push("seller_intent_decision_canonical_page_id_mismatch");
    }
    if (normalized.duplicateSourcePage !== pageDecision.duplicateSourcePage) {
      blockers.push("seller_intent_decision_duplicate_source_page_mismatch");
    }
    if (normalized.duplicatePageId !== pageDecision.duplicatePageId) {
      blockers.push("seller_intent_decision_duplicate_page_id_mismatch");
    }
    if (normalized.placementKey !== pageDecision.placementKey) {
      blockers.push("stable_placement_key_unapproved");
    }
  }
  if (!CAPTURE_OWNERS.has(normalized.captureOwner)) {
    blockers.push("capture_owner_unapproved");
  }
  if (!DUPLICATE_PAGE_DISPOSITIONS.has(normalized.duplicatePageDisposition)) {
    blockers.push("duplicate_page_disposition_unapproved");
  }
  if (normalized.canonicalFunnel !== CANONICAL_FUNNEL) {
    blockers.push("seller_intent_decision_canonical_funnel_mismatch");
  }
  for (const role of APPROVAL_REFERENCE_KEYS) {
    if (!validReference(normalized.approvalReferences[role])) {
      blockers.push(`seller_intent_decision_${role}_reference_invalid`);
    }
  }
  if (
    normalized.reasonCodes.length === 0 ||
    new Set(normalized.reasonCodes).size !== normalized.reasonCodes.length ||
    normalized.reasonCodes.some((code) => !REASON_CODES.has(code))
  ) {
    blockers.push("seller_intent_decision_reason_codes_invalid");
  }

  if (
    contract.requiredCanonicalSourcePage &&
    normalized.canonicalSourcePage !== contract.requiredCanonicalSourcePage
  ) {
    blockers.push("canonical_source_page_unapproved");
  }
  if (
    contract.requiredCaptureOwner &&
    normalized.captureOwner !== contract.requiredCaptureOwner
  ) {
    blockers.push("capture_owner_unapproved");
  }
  if (
    contract.requiredPlacementKey &&
    normalized.placementKey !== contract.requiredPlacementKey
  ) {
    blockers.push("stable_placement_key_unapproved");
  }
  if (
    Array.isArray(contract.allowedDuplicatePageDispositions) &&
    !contract.allowedDuplicatePageDispositions.includes(
      normalized.duplicatePageDisposition,
    )
  ) {
    blockers.push("duplicate_page_disposition_unapproved");
  }

  const uniqueBlockers = [...new Set(blockers)];
  const artifactSha256 = sha256(canonicalDecisionArtifactJson(normalized));
  return {
    status: uniqueBlockers.length ? "blocked" : "ready",
    ready: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    artifactSha256,
    decision: {
      schemaVersion: normalized.schemaVersion,
      decisionStatus: normalized.decisionStatus,
      decisionId: normalized.decisionId,
      approvedAt: normalized.approvedAt,
      reviewedEvidenceSha256: normalized.reviewedEvidenceSha256,
      reviewedEvidenceGeneratedAt: normalized.reviewedEvidenceGeneratedAt,
      reviewedEvidencePacketSha256:
        normalized.reviewedEvidencePacketSha256,
      canonicalSourcePage: normalized.canonicalSourcePage,
      canonicalPageId: normalized.canonicalPageId,
      captureOwner: normalized.captureOwner,
      duplicateSourcePage: normalized.duplicateSourcePage,
      duplicatePageId: normalized.duplicatePageId,
      duplicatePageDisposition: normalized.duplicatePageDisposition,
      placementKey: normalized.placementKey,
      canonicalFunnel: normalized.canonicalFunnel,
      reasonCodes: normalized.reasonCodes,
    },
    approvalReferenceSha256: referenceDigests(normalized.approvalReferences),
    containsRawApprovalReferences: false,
    evidencePacketValidated: evidence.ready,
  };
}

export const WORDPRESS_SELLER_INTENT_DECISION_OPTIONS = Object.freeze({
  canonicalFunnel: CANONICAL_FUNNEL,
  canonicalPages: Object.freeze(Object.keys(PAGE_DECISIONS)),
  captureOwners: Object.freeze([...CAPTURE_OWNERS]),
  duplicatePageDispositions: Object.freeze([...DUPLICATE_PAGE_DISPOSITIONS]),
  reasonCodes: Object.freeze([...REASON_CODES]),
});
