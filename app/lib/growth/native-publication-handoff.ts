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
  shareText: string;
  shareTitle: string;
  trackedUrl: string;
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
    shareText: `${creative.creativeBody}\n\n${creative.trackedUrl}`,
    shareTitle: creative.creativeHeadline,
    trackedUrl: creative.trackedUrl,
  };
}
