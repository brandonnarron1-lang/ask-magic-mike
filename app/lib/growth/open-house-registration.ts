import { sanitizeUtmValue } from "../../../src/lib/admin/utm-link-builder";
import {
  OWNED_DEMAND_CAMPAIGN_KEY,
  OWNED_DEMAND_OPEN_HOUSE_REGISTRATION_CONTENT,
} from "./owned-demand";

export const OPEN_HOUSE_REGISTRATION_SCHEMA =
  "amm.open_house_registration_packet.v1" as const;
export const OPEN_HOUSE_REGISTRATION_ORIGIN =
  "https://www.askmagicmike.com" as const;
export const OPEN_HOUSE_REGISTRATION_CONTENT =
  OWNED_DEMAND_OPEN_HOUSE_REGISTRATION_CONTENT;

const REFERENCE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{2,70}[a-z0-9])$/;
const RESERVED_REFERENCES = new Set([
  "admin",
  "api",
  "lead-center",
  "null",
  "undefined",
  "unknown",
]);

export interface OpenHouseRegistrationPacket {
  schemaVersion: typeof OPEN_HOUSE_REGISTRATION_SCHEMA;
  status: "operator_review_required";
  reference: string;
  displayLabel: string;
  registrationPath: string;
  destinationUrl: string;
  trackedUrl: string;
  shortPath: string;
  shortUrl: string;
  placementId: string;
  propertyId: string;
  attribution: {
    source: "qr";
    medium: "owned_media";
    campaign: typeof OWNED_DEMAND_CAMPAIGN_KEY;
    content: typeof OPEN_HOUSE_REGISTRATION_CONTENT;
  };
  requiresPropertyFactReview: true;
  requiresTwoDeviceScan: true;
  publicationAuthorized: false;
  mutationPerformed: false;
  leadSubmitted: false;
  notificationSent: false;
  reviewChecklist: readonly string[];
}

export const OPEN_HOUSE_REGISTRATION_REVIEW_CHECKLIST = Object.freeze([
  "Confirm the reference maps to the intended public event or listing without exposing consumer contact data.",
  "Verify the property, host, date, time, availability, and access instructions in the approved public source before printing.",
  "Scan the final QR on two independent devices and confirm the canonical Ask Magic Mike hostname, open-house reference, and UTMs.",
  "Obtain the exact publication or distribution approval before posting, printing, placing, or sending the asset.",
]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasControlCharacters(value: string) {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 31 || code === 127;
  });
}

/**
 * Convert an operator-entered, public-safe event label into the canonical path
 * reference. This is a convenience only; public routes still require the
 * already-canonical result and never accept an arbitrary destination.
 */
export function normalizeOpenHouseRegistrationReference(value: unknown) {
  const raw = text(value);
  if (
    raw.length < 4 ||
    raw.length > 96 ||
    hasControlCharacters(raw) ||
    /(?:@|:\/\/|[/?#\\%])/.test(raw)
  ) {
    return null;
  }

  const normalized = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return isCanonicalOpenHouseRegistrationReference(normalized)
    ? normalized
    : null;
}

export function isCanonicalOpenHouseRegistrationReference(
  value: unknown,
): value is string {
  const candidate = text(value);
  return (
    candidate.length <= 72 &&
    REFERENCE_PATTERN.test(candidate) &&
    !RESERVED_REFERENCES.has(candidate)
  );
}

function displayLabel(reference: string) {
  const uppercase = new Set(["id", "mls", "nc", "ne", "nw", "se", "sw"]);
  return reference
    .split("-")
    .map((part) =>
      uppercase.has(part)
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

export function buildOpenHouseRegistrationPacket(
  referenceValue: unknown,
): OpenHouseRegistrationPacket | null {
  if (!isCanonicalOpenHouseRegistrationReference(referenceValue)) return null;
  const reference = text(referenceValue);
  const registrationPath = `/open-house/${encodeURIComponent(reference)}`;
  const destinationUrl = `${OPEN_HOUSE_REGISTRATION_ORIGIN}${registrationPath}`;
  const placementId = `open-house:${reference}`;
  const attribution = {
    source: "qr" as const,
    medium: "owned_media" as const,
    campaign: OWNED_DEMAND_CAMPAIGN_KEY,
    content: OPEN_HOUSE_REGISTRATION_CONTENT,
  } as const;
  const params = new URLSearchParams({
    utm_source: sanitizeUtmValue(attribution.source),
    utm_medium: attribution.medium,
    utm_campaign: sanitizeUtmValue(attribution.campaign),
    utm_content: sanitizeUtmValue(attribution.content),
    placement_id: placementId,
    property_id: reference,
  });
  const shortPath = `/go/open-house/${encodeURIComponent(reference)}`;

  return {
    schemaVersion: OPEN_HOUSE_REGISTRATION_SCHEMA,
    status: "operator_review_required",
    reference,
    displayLabel: displayLabel(reference),
    registrationPath,
    destinationUrl,
    trackedUrl: `${destinationUrl}?${params.toString()}`,
    shortPath,
    shortUrl: `${OPEN_HOUSE_REGISTRATION_ORIGIN}${shortPath}`,
    placementId,
    propertyId: reference,
    attribution,
    requiresPropertyFactReview: true,
    requiresTwoDeviceScan: true,
    publicationAuthorized: false,
    mutationPerformed: false,
    leadSubmitted: false,
    notificationSent: false,
    reviewChecklist: OPEN_HOUSE_REGISTRATION_REVIEW_CHECKLIST,
  };
}

export function openHouseRegistrationAssetHref(
  reference: string,
  format: "packet_json" | "qr_svg",
) {
  if (!isCanonicalOpenHouseRegistrationReference(reference)) return null;
  return `/api/admin/distribution/open-house/${encodeURIComponent(reference)}?format=${format}`;
}
