import { createHash } from "node:crypto";
import { scanForFairHousingIssues } from "../../../src/lib/compliance/fair-housing";
import {
  resolveOwnedDemandPlacement,
  type OwnedDemandPlacementDefinition,
  type OwnedDemandPlacementKey,
} from "./owned-demand";

export const OWNED_DEMAND_PLATFORM_STATES = [
  "live",
  "scheduled",
  "pending_review",
  "not_approved",
  "configured",
  "distributed",
  "removed",
] as const;

export type OwnedDemandPlatformState = (typeof OWNED_DEMAND_PLATFORM_STATES)[number];

export const OWNED_DEMAND_PROOF_TYPES = [
  "public_url",
  "platform_reference",
  "screenshot_reference",
  "configuration_reference",
  "scan_test_reference",
  "removal_reference",
] as const;

export type OwnedDemandProofType = (typeof OWNED_DEMAND_PROOF_TYPES)[number];

export interface OwnedDemandPublicationProofInput {
  channelKey: string;
  placementKey: string;
  platformState: string;
  proofType: string;
  evidenceUrl?: string | null;
  evidenceReference?: string | null;
  finalCopy: string;
  creativeAssetKey?: string | null;
  approvalReference: string;
  actor: string;
  isTest?: boolean;
}

export interface ValidatedOwnedDemandPublicationProof {
  placement: OwnedDemandPlacementDefinition;
  platformState: OwnedDemandPlatformState;
  proofType: OwnedDemandProofType;
  evidenceUrl: string | null;
  evidenceReference: string | null;
  finalCopySha256: string;
  creativeAssetKey: string | null;
  approvalReference: string;
  actor: string;
  observedAt: string;
  idempotencyKey: string;
  isTest: boolean;
}

export type OwnedDemandPublicationProofValidation =
  | { ok: true; value: ValidatedOwnedDemandPublicationProof }
  | { ok: false; error: string };

type ChannelPolicy = {
  states: readonly OwnedDemandPlatformState[];
  proofTypes: readonly OwnedDemandProofType[];
  publicHosts?: readonly string[];
};

const CHANNEL_POLICIES: Record<string, ChannelPolicy> = {
  google_business_profile: {
    states: ["live", "scheduled", "pending_review", "not_approved", "removed"],
    proofTypes: ["public_url", "platform_reference", "removal_reference"],
    publicHosts: ["google.com", "goo.gl"],
  },
  facebook: {
    states: ["live", "scheduled", "removed"],
    proofTypes: ["public_url", "platform_reference", "removal_reference"],
    publicHosts: ["facebook.com", "fb.com", "fb.watch"],
  },
  instagram: {
    states: ["live", "scheduled", "removed"],
    proofTypes: ["public_url", "platform_reference", "screenshot_reference", "removal_reference"],
    publicHosts: ["instagram.com"],
  },
  linkedin: {
    states: ["live", "scheduled", "removed"],
    proofTypes: ["public_url", "platform_reference", "removal_reference"],
    publicHosts: ["linkedin.com"],
  },
  email_signature: {
    states: ["configured", "removed"],
    proofTypes: ["configuration_reference", "removal_reference"],
  },
  qr_print: {
    states: ["distributed", "removed"],
    proofTypes: ["scan_test_reference", "removal_reference"],
  },
};

const STATE_PROOF_TYPES: Record<OwnedDemandPlatformState, readonly OwnedDemandProofType[]> = {
  live: ["public_url", "screenshot_reference"],
  scheduled: ["platform_reference"],
  pending_review: ["platform_reference"],
  not_approved: ["platform_reference"],
  configured: ["configuration_reference"],
  distributed: ["scan_test_reference"],
  removed: ["removal_reference"],
};

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/;
const SECRET = /(?:postgres(?:ql)?:\/\/|(?:api[_-]?key|password|secret|token)\s*[:=]|\bsk-[a-z0-9_-]{12,})/i;
const SENSITIVE_QUERY_PARAMETER = /^(?:access[_-]?token|api[_-]?key|authorization|code|credential|key|password|secret|signature|token)$/i;
const PLACEHOLDER = /\[(?:placeholder|mlsid|address|date|time|name|insert[^\]]*)\]/i;
const UNSUPPORTED_PUBLIC_CLAIM = /\b(?:guaranteed (?:home )?(?:value|offer|sale|closing)|instant (?:offer|valuation|home value)|automated appraisal|best schools?|safest? neighborhood|buyers? (?:are )?waiting|sell (?:your home )?in \d+ days?)\b/i;

function text(value: string | null | undefined) {
  return (value || "").trim();
}

function isPlatformState(value: string): value is OwnedDemandPlatformState {
  return (OWNED_DEMAND_PLATFORM_STATES as readonly string[]).includes(value);
}

function isProofType(value: string): value is OwnedDemandProofType {
  return (OWNED_DEMAND_PROOF_TYPES as readonly string[]).includes(value);
}

function hostMatches(hostname: string, allowed: string) {
  return hostname === allowed || hostname.endsWith(`.${allowed}`);
}

export function normalizeOwnedDemandPublicEvidenceUrl(
  channelKey: string,
  value: string | null | undefined,
) {
  const policy = CHANNEL_POLICIES[channelKey];
  const candidate = text(value);
  if (!candidate || !policy?.publicHosts?.length) return null;
  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      !policy.publicHosts.some((host) => hostMatches(parsed.hostname.toLowerCase(), host))
    ) return null;
    for (const [key, parameterValue] of parsed.searchParams) {
      if (
        SENSITIVE_QUERY_PARAMETER.test(key) ||
        EMAIL.test(parameterValue) ||
        PHONE.test(parameterValue) ||
        SECRET.test(parameterValue)
      ) return null;
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function cleanReference(value: string | null | undefined, maxLength: number) {
  const cleaned = text(value).replace(/\s+/g, " ");
  return cleaned && cleaned.length <= maxLength ? cleaned : null;
}

function normalizeCopy(value: string) {
  return value.trim().replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "");
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function validateOwnedDemandPublicationProof(
  input: OwnedDemandPublicationProofInput,
  now = new Date(),
): OwnedDemandPublicationProofValidation {
  const placement = resolveOwnedDemandPlacement(input.channelKey, input.placementKey);
  if (!placement) return { ok: false, error: "invalid_owned_demand_placement" };

  const policy = CHANNEL_POLICIES[placement.channelKey];
  if (!policy) return { ok: false, error: "unsupported_owned_demand_channel" };
  if (!isPlatformState(input.platformState) || !policy.states.includes(input.platformState)) {
    return { ok: false, error: "invalid_platform_state" };
  }
  if (!isProofType(input.proofType) || !policy.proofTypes.includes(input.proofType)) {
    return { ok: false, error: "invalid_proof_type" };
  }
  if (!STATE_PROOF_TYPES[input.platformState].includes(input.proofType)) {
    return { ok: false, error: "proof_type_state_mismatch" };
  }

  const evidenceUrlText = text(input.evidenceUrl);
  let evidenceUrl: string | null = null;
  if (input.proofType === "public_url") {
    if (!evidenceUrlText || !policy.publicHosts?.length) {
      return { ok: false, error: "public_evidence_url_required" };
    }
    evidenceUrl = normalizeOwnedDemandPublicEvidenceUrl(placement.channelKey, evidenceUrlText);
    if (!evidenceUrl) {
      return { ok: false, error: "invalid_public_evidence_url" };
    }
  } else if (evidenceUrlText) {
    return { ok: false, error: "evidence_url_not_allowed" };
  }

  const evidenceReference = cleanReference(input.evidenceReference, 180);
  if (input.proofType !== "public_url") {
    if (!evidenceReference || evidenceReference.length < 4) {
      return { ok: false, error: "evidence_reference_required" };
    }
    if (EMAIL.test(evidenceReference) || PHONE.test(evidenceReference) || SECRET.test(evidenceReference)) {
      return { ok: false, error: "unsafe_evidence_reference" };
    }
  } else if (evidenceReference) {
    return { ok: false, error: "evidence_reference_not_allowed" };
  }

  const approvalReference = cleanReference(input.approvalReference, 160);
  if (!approvalReference || approvalReference.length < 4) {
    return { ok: false, error: "approval_reference_required" };
  }
  if (EMAIL.test(approvalReference) || PHONE.test(approvalReference) || SECRET.test(approvalReference)) {
    return { ok: false, error: "unsafe_approval_reference" };
  }

  const actor = cleanReference(input.actor, 180);
  if (!actor || SECRET.test(actor)) return { ok: false, error: "invalid_publication_actor" };

  const finalCopy = normalizeCopy(input.finalCopy);
  if (finalCopy.length < 20 || finalCopy.length > 5000) {
    return { ok: false, error: "invalid_final_copy" };
  }
  if (EMAIL.test(finalCopy) || PHONE.test(finalCopy) || SECRET.test(finalCopy)) {
    return { ok: false, error: "unsafe_final_copy_contact_or_secret" };
  }
  if (PLACEHOLDER.test(finalCopy)) return { ok: false, error: "unresolved_final_copy_placeholder" };
  if (UNSUPPORTED_PUBLIC_CLAIM.test(finalCopy)) return { ok: false, error: "unsupported_public_claim" };
  if (!scanForFairHousingIssues(finalCopy).passes) {
    return { ok: false, error: "fair_housing_review_required" };
  }

  const creativeAssetKey = cleanReference(input.creativeAssetKey, 240);
  if (creativeAssetKey && (EMAIL.test(creativeAssetKey) || PHONE.test(creativeAssetKey) || SECRET.test(creativeAssetKey))) {
    return { ok: false, error: "unsafe_creative_asset_key" };
  }

  const observedAt = now.toISOString();
  const finalCopySha256 = sha256(finalCopy);
  const idempotencyKey = sha256(JSON.stringify({
    channelKey: placement.channelKey,
    placementKey: placement.placementKey,
    platformState: input.platformState,
    proofType: input.proofType,
    evidenceUrl,
    evidenceReference,
    finalCopySha256,
    creativeAssetKey,
    approvalReference,
    isTest: Boolean(input.isTest),
  }));

  return {
    ok: true,
    value: {
      placement,
      platformState: input.platformState,
      proofType: input.proofType,
      evidenceUrl,
      evidenceReference,
      finalCopySha256,
      creativeAssetKey,
      approvalReference,
      actor,
      observedAt,
      idempotencyKey,
      isTest: Boolean(input.isTest),
    },
  };
}

export const OWNED_DEMAND_PLACEMENT_KEYS: readonly OwnedDemandPlacementKey[] = [
  "general_question",
  "seller_review",
  "buyer_match",
  "renter_plan",
];

export function publicationPolicyForChannel(channelKey: string): ChannelPolicy | null {
  return CHANNEL_POLICIES[channelKey] || null;
}
