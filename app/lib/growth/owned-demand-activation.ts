import type {
  OwnedDemandCommand,
  OwnedDemandPlacementKey,
} from "./owned-demand";
import type {
  OwnedDemandPublicationProofLedger,
  OwnedDemandPublicationProofRow,
} from "../persistence/neonOwnedDemandPublicationProofs";

export type OwnedDemandActivationState =
  | "evidence_unavailable"
  | "measurement_unavailable"
  | "proof_attribution_mismatch"
  | "prepared_not_observed"
  | "native_pending"
  | "native_inactive"
  | "observed_unmeasured"
  | "signal_without_active_proof"
  | "measured_signal";

export interface OwnedDemandActivationPlacement {
  channelKey: string;
  channelLabel: string;
  placementKey: OwnedDemandPlacementKey;
  placementLabel: string;
  trackedUrl: string;
  attributedLeads: number;
  state: OwnedDemandActivationState;
  stateLabel: string;
  nextAction: string;
  latestProof: OwnedDemandPublicationProofRow | null;
  selectionBlocked: boolean;
  readinessStatus: string | null;
  readinessDetail: string | null;
}

export interface OwnedDemandPlacementReadiness {
  channelKey: string;
  placementKey: OwnedDemandPlacementKey;
  activationEligible: boolean;
  status: string;
  detail: string;
  nextAction?: string;
}

export interface OwnedDemandActivationLoop {
  generatedAt: string;
  evidenceAvailable: boolean;
  measurementAvailable: boolean;
  totalPlacements: number;
  activeProofPlacements: number;
  pendingProofPlacements: number;
  inactiveProofPlacements: number;
  measuredPlacements: number;
  identityReviewPlacements: number;
  signalReviewPlacements: number;
  unobservedPlacements: number;
  readinessBlockedPlacements: number;
  attributedLeads: number;
  nextPlacement: OwnedDemandActivationPlacement | null;
  placements: OwnedDemandActivationPlacement[];
  authorityBoundary: string;
}

type PlacementInput = Pick<
  OwnedDemandActivationPlacement,
  "channelKey" | "channelLabel" | "placementKey" | "placementLabel" | "trackedUrl" | "attributedLeads"
> & {
  source: string;
  medium: string;
  campaign: string;
  content: string;
};

const CHANNEL_PRIORITY = [
  "ourtown_wordpress",
  "google_business_profile",
  "facebook",
  "instagram",
  "linkedin",
  "email_signature",
  "qr_print",
] as const;

const PLACEMENT_PRIORITY: readonly OwnedDemandPlacementKey[] = [
  "wordpress_homepage_ask_mike",
  "wordpress_home_value",
  "wordpress_we_buy_homes",
  "wordpress_mike_agent",
  "wordpress_listing_buyer",
  "wordpress_rental_to_homeownership",
  "wordpress_ask_magic_mike_embed",
  "general_question",
  "seller_review",
  "buyer_match",
  "renter_plan",
];

const STATE_PRIORITY: Record<OwnedDemandActivationState, number> = {
  proof_attribution_mismatch: 0,
  signal_without_active_proof: 1,
  native_pending: 2,
  native_inactive: 3,
  observed_unmeasured: 4,
  prepared_not_observed: 5,
  measured_signal: 6,
  measurement_unavailable: 7,
  evidence_unavailable: 8,
};

const STATE_LABELS: Record<OwnedDemandActivationState, string> = {
  evidence_unavailable: "Evidence unavailable",
  measurement_unavailable: "Measurement unavailable",
  proof_attribution_mismatch: "Proof · attribution mismatch",
  prepared_not_observed: "Prepared · no proof",
  native_pending: "Pending native review",
  native_inactive: "Not active",
  observed_unmeasured: "Observed · no lead signal",
  signal_without_active_proof: "Signal · proof review",
  measured_signal: "Measured signal",
};

function time(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isNewerProof(
  candidate: OwnedDemandPublicationProofRow,
  current: OwnedDemandPublicationProofRow,
) {
  const observedDifference = time(candidate.observedAt) - time(current.observedAt);
  if (observedDifference !== 0) return observedDifference > 0;
  const createdDifference = time(candidate.createdAt) - time(current.createdAt);
  if (createdDifference !== 0) return createdDifference > 0;
  return candidate.id.localeCompare(current.id) > 0;
}

function latestProofs(
  proofs: readonly OwnedDemandPublicationProofRow[],
) {
  const latest = new Map<string, OwnedDemandPublicationProofRow>();
  for (const proof of proofs) {
    const key = `${proof.channelKey}:${proof.placementKey}`;
    const current = latest.get(key);
    if (!current || isNewerProof(proof, current)) latest.set(key, proof);
  }
  return latest;
}

function isActiveProof(proof: OwnedDemandPublicationProofRow) {
  if (proof.platformState === "live") return true;
  if (proof.channelKey === "email_signature" && proof.platformState === "configured") return true;
  return proof.channelKey === "qr_print" && proof.platformState === "distributed";
}

function isPendingProof(proof: OwnedDemandPublicationProofRow) {
  return proof.platformState === "scheduled"
    || proof.platformState === "pending_review"
    || proof.platformState === "configured";
}

function stateForPlacement(
  evidenceAvailable: boolean,
  measurementAvailable: boolean,
  attributedLeads: number,
  proof: OwnedDemandPublicationProofRow | null,
  proofMatchesAttribution: boolean,
): OwnedDemandActivationState {
  if (!evidenceAvailable) return "evidence_unavailable";
  if (!measurementAvailable) return "measurement_unavailable";
  if (proof && !proofMatchesAttribution) return "proof_attribution_mismatch";
  if (attributedLeads > 0 && (!proof || !isActiveProof(proof))) {
    return "signal_without_active_proof";
  }
  if (proof && isActiveProof(proof)) {
    return attributedLeads > 0 ? "measured_signal" : "observed_unmeasured";
  }
  if (proof && isPendingProof(proof)) return "native_pending";
  if (proof) return "native_inactive";
  return "prepared_not_observed";
}

function nextActionForState(state: OwnedDemandActivationState) {
  switch (state) {
    case "evidence_unavailable":
      return "Restore the canonical proof-ledger read path before inferring a placement lifecycle state.";
    case "measurement_unavailable":
      return "Restore measurement before selecting a first channel. Prepared sequence · measurement unavailable.";
    case "proof_attribution_mismatch":
      return "Reconcile the proof row with the current canonical source, campaign, content, and tracked URL before using either evidence stream.";
    case "signal_without_active_proof":
      return "Reconcile the exact UTM with native-platform history, then record the current observed state. Do not infer publication from attribution.";
    case "native_pending":
      return "Inspect the native platform and append the next observed state. Do not report this placement as live yet.";
    case "native_inactive":
      return "Review the rejection or removal evidence. Correct or retire the placement only through the approved native workflow.";
    case "observed_unmeasured":
      return "Verify the tracked destination in the native placement, then monitor exact attribution before adding effort or spend.";
    case "prepared_not_observed":
      return "After exact publication approval, complete the native action and record evidence. Preparation alone is not publication.";
    case "measured_signal":
      return "Preserve the measured placement and compare qualification, appointments, outcomes, and response SLA before scaling.";
  }
}

function flattenPlacements(command: OwnedDemandCommand): PlacementInput[] {
  return command.channels.flatMap((channel) => {
    const general: PlacementInput = {
      channelKey: channel.key,
      channelLabel: channel.label,
      placementKey: "general_question",
      placementLabel: "General question",
      trackedUrl: channel.trackedUrl,
      source: channel.source,
      medium: channel.medium,
      campaign: channel.campaign,
      content: channel.content,
      attributedLeads: channel.attributedLeads
        - channel.offers.reduce((sum, offer) => sum + offer.attributedLeads, 0)
        - channel.namedPlacements.reduce((sum, placement) => sum + placement.attributedLeads, 0),
    };
    const offers: PlacementInput[] = channel.offers.map((offer) => ({
      channelKey: channel.key,
      channelLabel: channel.label,
      placementKey: offer.key,
      placementLabel: offer.shortLabel,
      trackedUrl: offer.trackedUrl,
      source: channel.source,
      medium: channel.medium,
      campaign: channel.campaign,
      content: offer.content,
      attributedLeads: offer.attributedLeads,
    }));
    const named: PlacementInput[] = channel.namedPlacements.map((placement) => ({
      channelKey: channel.key,
      channelLabel: channel.label,
      placementKey: placement.placementKey,
      placementLabel: placement.placementLabel,
      trackedUrl: placement.trackedUrl,
      source: placement.source,
      medium: placement.medium,
      campaign: placement.campaign,
      content: placement.content,
      attributedLeads: placement.attributedLeads,
    }));
    return channel.key === "ourtown_wordpress"
      ? [...named, general, ...offers]
      : [general, ...offers];
  });
}

function priorityIndex(values: readonly string[], value: string) {
  const index = values.indexOf(value);
  return index === -1 ? values.length : index;
}

export function buildOwnedDemandActivationLoop(
  command: OwnedDemandCommand,
  ledger: Pick<OwnedDemandPublicationProofLedger, "configured" | "schemaReady" | "proofs" | "error">,
  measurementAvailable = true,
  readiness: readonly OwnedDemandPlacementReadiness[] = [],
): OwnedDemandActivationLoop {
  const evidenceAvailable = ledger.configured && ledger.schemaReady && !ledger.error;
  const proofByPlacement = latestProofs(ledger.proofs);
  const readinessByPlacement = new Map(
    readiness.map((row) => [`${row.channelKey}:${row.placementKey}`, row] as const),
  );
  const placements = flattenPlacements(command).map((placement): OwnedDemandActivationPlacement => {
    const latestProof = proofByPlacement.get(`${placement.channelKey}:${placement.placementKey}`) || null;
    const placementReadiness = readinessByPlacement.get(
      `${placement.channelKey}:${placement.placementKey}`,
    ) || null;
    const proofMatchesAttribution = !latestProof || (
      latestProof.campaignKey === placement.campaign
      && latestProof.source === placement.source
      && latestProof.medium === placement.medium
      && latestProof.content === placement.content
      && latestProof.trackedUrl === placement.trackedUrl
    );
    const state = stateForPlacement(
      evidenceAvailable,
      measurementAvailable,
      placement.attributedLeads,
      latestProof,
      proofMatchesAttribution,
    );
    const {
      source: _source,
      medium: _medium,
      campaign: _campaign,
      content: _content,
      ...activationPlacement
    } = placement;
    const selectionBlocked = Boolean(
      placementReadiness && !placementReadiness.activationEligible,
    );
    const defaultNextAction = nextActionForState(state);
    const nextAction = state === "prepared_not_observed" && placementReadiness
      ? placementReadiness.activationEligible
        ? placementReadiness.nextAction || defaultNextAction
        : `Do not activate this placement yet. ${placementReadiness.detail}`
      : defaultNextAction;
    return {
      ...activationPlacement,
      state,
      stateLabel: STATE_LABELS[state],
      nextAction,
      latestProof,
      selectionBlocked,
      readinessStatus: placementReadiness?.status || null,
      readinessDetail: placementReadiness?.detail || null,
    };
  }).sort((left, right) => (
    STATE_PRIORITY[left.state] - STATE_PRIORITY[right.state]
    || priorityIndex(CHANNEL_PRIORITY, left.channelKey) - priorityIndex(CHANNEL_PRIORITY, right.channelKey)
    || priorityIndex(PLACEMENT_PRIORITY, left.placementKey) - priorityIndex(PLACEMENT_PRIORITY, right.placementKey)
    || left.placementKey.localeCompare(right.placementKey)
  ));

  const proofPlacements = evidenceAvailable
    ? placements.filter((placement) => placement.latestProof)
    : [];
  const applicableProofPlacements = proofPlacements.filter((placement) => placement.state !== "proof_attribution_mismatch");
  const activeProofPlacements = applicableProofPlacements.filter((placement) => placement.latestProof && isActiveProof(placement.latestProof)).length;
  const pendingProofPlacements = applicableProofPlacements.filter((placement) => placement.latestProof && isPendingProof(placement.latestProof) && !isActiveProof(placement.latestProof)).length;
  const inactiveProofPlacements = applicableProofPlacements.length - activeProofPlacements - pendingProofPlacements;

  return {
    generatedAt: command.generatedAt,
    evidenceAvailable,
    measurementAvailable,
    totalPlacements: placements.length,
    activeProofPlacements,
    pendingProofPlacements,
    inactiveProofPlacements,
    measuredPlacements: placements.filter((placement) => placement.state === "measured_signal").length,
    identityReviewPlacements: placements.filter((placement) => placement.state === "proof_attribution_mismatch").length,
    signalReviewPlacements: placements.filter((placement) => placement.state === "signal_without_active_proof").length,
    unobservedPlacements: placements.filter((placement) => placement.state === "prepared_not_observed").length,
    readinessBlockedPlacements: placements.filter(
      (placement) => placement.state === "prepared_not_observed" && placement.selectionBlocked,
    ).length,
    attributedLeads: placements.reduce((sum, placement) => sum + placement.attributedLeads, 0),
    nextPlacement: evidenceAvailable && measurementAvailable
      ? placements.find((placement) => (
          placement.state !== "measured_signal"
          && !(placement.state === "prepared_not_observed" && placement.selectionBlocked)
        )) || placements.find((placement) => placement.state === "measured_signal") || null
      : null,
    placements,
    authorityBoundary: "This loop joins append-only native observation evidence to exact first-party attribution. It cannot publish, send, spend, contact a consumer, or turn either evidence stream into a claim the other stream does not prove.",
  };
}
