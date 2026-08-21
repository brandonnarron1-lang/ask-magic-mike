import QRCode from "qrcode";
import {
  resolveOwnedDemandCreative,
  type OwnedDemandCreativeDefinition,
} from "./owned-demand";

export const OWNED_DEMAND_ASSET_FORMATS = ["feed", "story", "qr_svg"] as const;
export type OwnedDemandAssetFormat = (typeof OWNED_DEMAND_ASSET_FORMATS)[number];

export const OWNED_DEMAND_IMAGE_SPECS = {
  feed: { width: 1080, height: 1350, label: "4:5 feed PNG" },
  story: { width: 1080, height: 1920, label: "9:16 story PNG" },
} as const;

export type OwnedDemandImageFormat = keyof typeof OWNED_DEMAND_IMAGE_SPECS;

export interface OwnedDemandAssetRequest {
  format: OwnedDemandAssetFormat;
  creative: OwnedDemandCreativeDefinition;
  filename: string;
}

const OWNED_DEMAND_CHANNEL_CODES = {
  ourtown_wordpress: "otp",
  google_business_profile: "gbp",
  facebook: "fb",
  instagram: "ig",
  linkedin: "li",
  email_signature: "email",
  qr_print: "qr",
} as const;

const OWNED_DEMAND_PLACEMENT_CODES = {
  general_question: "ask",
  seller_review: "seller",
  buyer_match: "buyer",
  renter_plan: "renter",
} as const;

export const OWNED_DEMAND_SHORTLINK_ORIGIN = "https://www.askmagicmike.com";

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isOwnedDemandAssetFormat(value: string | null): value is OwnedDemandAssetFormat {
  return Boolean(value && OWNED_DEMAND_ASSET_FORMATS.includes(value as OwnedDemandAssetFormat));
}

export function ownedDemandAssetFilename(
  creative: OwnedDemandCreativeDefinition,
  format: OwnedDemandAssetFormat,
) {
  const extension = format === "qr_svg" ? "svg" : "png";
  return [
    "ask-magic-mike",
    slug(creative.channelKey),
    slug(creative.placementKey),
    format.replace("_", "-"),
  ].join("-") + `.${extension}`;
}

export function resolveOwnedDemandAssetRequest(
  channelKey: string,
  placementKey: string,
  formatValue: string | null,
): OwnedDemandAssetRequest | null {
  if (!isOwnedDemandAssetFormat(formatValue)) return null;
  const creative = resolveOwnedDemandCreative(channelKey, placementKey);
  if (!creative) return null;
  return {
    format: formatValue,
    creative,
    filename: ownedDemandAssetFilename(creative, formatValue),
  };
}

export function ownedDemandAssetHref(
  channelKey: string,
  placementKey: string,
  format: OwnedDemandAssetFormat,
) {
  return `/api/admin/distribution/assets/${encodeURIComponent(channelKey)}/${encodeURIComponent(placementKey)}?format=${format}`;
}

export function ownedDemandShortCode(channelKey: string, placementKey: string) {
  const channelCode = OWNED_DEMAND_CHANNEL_CODES[channelKey as keyof typeof OWNED_DEMAND_CHANNEL_CODES];
  const placementCode = OWNED_DEMAND_PLACEMENT_CODES[placementKey as keyof typeof OWNED_DEMAND_PLACEMENT_CODES];
  if (!channelCode || !placementCode || !resolveOwnedDemandCreative(channelKey, placementKey)) return null;
  return `${channelCode}-${placementCode}`;
}

export function resolveOwnedDemandShortCode(code: string) {
  if (!/^[a-z0-9-]{4,32}$/.test(code)) return null;
  const channel = Object.entries(OWNED_DEMAND_CHANNEL_CODES).find(([, value]) => code.startsWith(`${value}-`));
  if (!channel) return null;
  const placementCode = code.slice(channel[1].length + 1);
  const placement = Object.entries(OWNED_DEMAND_PLACEMENT_CODES).find(([, value]) => value === placementCode);
  if (!placement) return null;
  return resolveOwnedDemandCreative(channel[0], placement[0]);
}

export function ownedDemandShortUrl(creative: OwnedDemandCreativeDefinition) {
  const code = ownedDemandShortCode(creative.channelKey, creative.placementKey);
  if (!code) throw new Error("Owned-demand creative does not have an approved short code");
  return `${OWNED_DEMAND_SHORTLINK_ORIGIN}/go/${code}`;
}

export async function buildOwnedDemandQrSvg(trackedUrl: string) {
  return QRCode.toString(trackedUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 4,
    color: { dark: "#080808", light: "#ffffff" },
  });
}

export async function buildOwnedDemandQrDataUrl(trackedUrl: string) {
  return QRCode.toDataURL(trackedUrl, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 448,
    color: { dark: "#080808", light: "#ffffff" },
  });
}
