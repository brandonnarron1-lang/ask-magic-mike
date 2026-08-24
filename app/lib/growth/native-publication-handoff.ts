import {
  ownedDemandAssetHref,
  resolveOwnedDemandAssetRequest,
  type OwnedDemandImageFormat,
} from "./owned-demand-assets";
import { resolveOwnedDemandCreative } from "./owned-demand";

const NATIVE_SHARE_FORMAT_BY_CHANNEL = {
  google_business_profile: "feed",
  facebook: "feed",
  instagram: "story",
  linkedin: "feed",
} as const satisfies Readonly<Record<string, OwnedDemandImageFormat>>;

export interface NativePublicationHandoffDefinition {
  assetHref: string;
  channelLabel: string;
  filename: string;
  proofHref: string;
  shareText: string;
  shareTitle: string;
  trackedUrl: string;
}

export interface NativePublicationProofFocus {
  channelKey: string;
  channelLabel: string;
  placementKey: string;
  placementLabel: string;
  proofHref: string;
}

function nativePublicationProofHref(channelKey: string, placementKey: string) {
  const params = new URLSearchParams({
    proof_channel: channelKey,
    proof_placement: placementKey,
  });
  return `/admin/distribution?${params.toString()}#publication-proof-${channelKey}`;
}

export function resolveNativePublicationHandoff(
  channelKey: string,
  placementKey: string,
): NativePublicationHandoffDefinition | null {
  const format = NATIVE_SHARE_FORMAT_BY_CHANNEL[
    channelKey as keyof typeof NATIVE_SHARE_FORMAT_BY_CHANNEL
  ];
  if (!format) return null;

  const creative = resolveOwnedDemandCreative(channelKey, placementKey);
  const asset = resolveOwnedDemandAssetRequest(channelKey, placementKey, format);
  if (!creative || !asset) return null;

  return {
    assetHref: ownedDemandAssetHref(channelKey, placementKey, format),
    channelLabel: creative.channelLabel,
    filename: asset.filename,
    proofHref: nativePublicationProofHref(channelKey, placementKey),
    shareText: `${creative.creativeBody}\n\n${creative.trackedUrl}`,
    shareTitle: creative.creativeHeadline,
    trackedUrl: creative.trackedUrl,
  };
}

/**
 * Resolve only a canonical native channel + placement pair into a read-only
 * publication-proof focus. Query-string input is untrusted and fails closed.
 */
export function resolveNativePublicationProofFocus(
  channelKey: unknown,
  placementKey: unknown,
): NativePublicationProofFocus | null {
  if (typeof channelKey !== "string" || typeof placementKey !== "string") return null;

  const handoff = resolveNativePublicationHandoff(channelKey, placementKey);
  const creative = resolveOwnedDemandCreative(channelKey, placementKey);
  if (!handoff || !creative) return null;

  return {
    channelKey: creative.channelKey,
    channelLabel: creative.channelLabel,
    placementKey: creative.placementKey,
    placementLabel: creative.placementLabel,
    proofHref: handoff.proofHref,
  };
}
