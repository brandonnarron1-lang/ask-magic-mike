import { createHash } from "node:crypto";
import { normalizeGrowthKey, normalizeVendorSource } from "./intelligence";

export const SUPPORTED_GROWTH_VENDORS = [
  "zillow",
  "realtor_com",
  "homes_com",
  "redfin",
  "meta",
  "google",
  "tiktok",
  "follow_up_boss",
  "cinc",
  "boldtrail",
  "boomtown",
  "sierra_interactive",
  "ylopo",
  "lofty",
  "brivity",
  "real_geeks",
  "luxury_presence",
  "fello",
  "structurely",
  "smartzip",
  "offrs",
  "revaluate",
  "realscout",
  "generic",
] as const;

export type SupportedGrowthVendor = (typeof SUPPORTED_GROWTH_VENDORS)[number];

export interface NormalizedVendorLead {
  vendor: SupportedGrowthVendor;
  externalLeadId: string | null;
  externalEventId: string | null;
  receivedAt: string;
  occurredAt: string | null;
  contact: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  property: {
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    listingId: string | null;
    propertyId: string | null;
  };
  attribution: {
    source: string;
    medium: string;
    campaign: string | null;
    content: string | null;
    term: string | null;
    placementId: string | null;
    clickIds: Record<string, string>;
  };
  consent: {
    email: boolean | null;
    sms: boolean | null;
    call: boolean | null;
    source: string | null;
  };
  intent: {
    leadType: string;
    timeline: string | null;
    message: string | null;
  };
  safeMetadata: Record<string, string | number | boolean | null>;
  payloadHash: string;
  requiresReview: boolean;
  reviewReasons: string[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "1", "consented", "opted_in"].includes(normalized)) return true;
  if (["false", "no", "0", "declined", "opted_out"].includes(normalized)) return false;
  return null;
}

function getPath(record: UnknownRecord, path: string) {
  let cursor: unknown = record;
  for (const segment of path.split(".")) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function firstString(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = stringValue(getPath(record, path));
    if (value) return value;
  }
  return null;
}

function firstBoolean(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = booleanValue(getPath(record, path));
    if (value != null) return value;
  }
  return null;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

export function fingerprintVendorPayload(payload: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex");
}

function supportedVendor(value: unknown): SupportedGrowthVendor {
  const normalized = normalizeVendorSource(value);
  return SUPPORTED_GROWTH_VENDORS.includes(normalized as SupportedGrowthVendor)
    ? normalized as SupportedGrowthVendor
    : "generic";
}

function defaultMedium(vendor: SupportedGrowthVendor) {
  if (["zillow", "realtor_com", "homes_com", "redfin"].includes(vendor)) return "portal";
  if (["meta", "tiktok"].includes(vendor)) return "paid_social";
  if (vendor === "google") return "paid_search";
  if (["smartzip", "offrs", "revaluate"].includes(vendor)) return "predictive_data";
  if (["follow_up_boss", "cinc", "boldtrail", "boomtown", "sierra_interactive", "ylopo", "lofty", "brivity", "real_geeks", "luxury_presence", "fello", "structurely", "realscout"].includes(vendor)) {
    return "crm_partner";
  }
  return "partner";
}

function normalizedLeadType(value: unknown) {
  const normalized = normalizeGrowthKey(value, "unknown");
  const aliases: Record<string, string> = {
    buy: "buyer",
    buyer_lead: "buyer",
    sell: "seller",
    seller_lead: "seller",
    home_valuation: "home_value",
    valuation: "home_value",
    cash_offer: "seller_cash_offer",
    listing: "listing_inquiry",
    property_inquiry: "listing_inquiry",
    renter_lead: "renter",
  };
  return aliases[normalized] ?? normalized;
}

function safeMetadata(record: UnknownRecord) {
  const candidates: Array<[string, string[]]> = [
    ["form_id", ["form_id", "formId", "form.id"]],
    ["ad_id", ["ad_id", "adId", "ad.id"]],
    ["adset_id", ["adset_id", "adsetId", "adset.id"]],
    ["campaign_id", ["campaign_id", "campaignId", "campaign.id"]],
    ["listing_id", ["listing_id", "listingId", "property.listing_id"]],
    ["property_id", ["property_id", "propertyId", "property.id"]],
    ["event_name", ["event_name", "eventName", "type"]],
    ["lead_status", ["lead_status", "leadStatus", "status"]],
    ["is_live_transfer", ["is_live_transfer", "liveTransfer"]],
  ];
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, paths] of candidates) {
    for (const path of paths) {
      const value = getPath(record, path);
      if (typeof value === "boolean" || typeof value === "number") {
        result[key] = value;
        break;
      }
      const text = stringValue(value);
      if (text) {
        result[key] = text;
        break;
      }
    }
  }
  return result;
}

export function normalizeVendorLead(input: {
  vendor: unknown;
  payload: unknown;
  receivedAt?: Date;
}): NormalizedVendorLead {
  const vendor = supportedVendor(input.vendor);
  const payload = asRecord(input.payload);
  const receivedAt = input.receivedAt ?? new Date();
  const firstName = firstString(payload, [
    "first_name", "firstName", "contact.first_name", "contact.firstName", "lead.first_name",
  ]);
  const lastName = firstString(payload, [
    "last_name", "lastName", "contact.last_name", "contact.lastName", "lead.last_name",
  ]);
  const fullName = firstString(payload, ["name", "full_name", "fullName", "contact.name", "lead.name"]);
  const splitName = fullName?.split(/\s+/).filter(Boolean) ?? [];
  const email = firstString(payload, ["email", "contact.email", "lead.email", "person.email"]);
  const phone = firstString(payload, ["phone", "phone_number", "phoneNumber", "contact.phone", "lead.phone"]);
  const address = firstString(payload, [
    "address", "property_address", "propertyAddress", "property.address", "listing.address",
  ]);
  const source = normalizeVendorSource(
    firstString(payload, ["utm_source", "source", "attribution.source"]) ?? vendor,
  );
  const medium = normalizeGrowthKey(
    firstString(payload, ["utm_medium", "medium", "attribution.medium"]) ?? defaultMedium(vendor),
    defaultMedium(vendor),
  );
  const campaign = firstString(payload, [
    "utm_campaign", "campaign_name", "campaignName", "campaign.name", "attribution.campaign",
  ]);
  const externalLeadId = firstString(payload, [
    "lead_id", "leadId", "id", "contact.id", "lead.id", "person.id",
  ]);
  const externalEventId = firstString(payload, [
    "event_id", "eventId", "webhook_id", "webhookId", "event.id",
  ]);
  const clickIds: Record<string, string> = {};
  for (const [key, paths] of Object.entries({
    gclid: ["gclid", "click_ids.gclid", "attribution.gclid"],
    wbraid: ["wbraid", "click_ids.wbraid"],
    gbraid: ["gbraid", "click_ids.gbraid"],
    fbclid: ["fbclid", "click_ids.fbclid", "attribution.fbclid"],
    ttclid: ["ttclid", "click_ids.ttclid", "attribution.ttclid"],
    msclkid: ["msclkid", "click_ids.msclkid"],
  })) {
    const value = firstString(payload, paths);
    if (value) clickIds[key] = value;
  }

  const consentEmail = firstBoolean(payload, [
    "consent_email", "consent.email", "permissions.email", "opt_in.email",
  ]);
  const consentSms = firstBoolean(payload, [
    "consent_sms", "consent.sms", "permissions.sms", "opt_in.sms", "text_consent",
  ]);
  const consentCall = firstBoolean(payload, [
    "consent_call", "consent.call", "permissions.call", "opt_in.call", "call_consent",
  ]);
  const reviewReasons: string[] = [];
  if (!externalLeadId) reviewReasons.push("missing_external_lead_id");
  if (!email && !phone) reviewReasons.push("missing_contact_method");
  if (consentEmail == null && consentSms == null && consentCall == null) {
    reviewReasons.push("consent_not_explicit");
  }
  if (source === "unknown") reviewReasons.push("source_unknown");

  return {
    vendor,
    externalLeadId,
    externalEventId,
    receivedAt: receivedAt.toISOString(),
    occurredAt: firstString(payload, ["occurred_at", "occurredAt", "created_at", "createdAt", "timestamp"]),
    contact: {
      firstName: firstName ?? splitName[0] ?? null,
      lastName: lastName ?? (splitName.length > 1 ? splitName.slice(1).join(" ") : null),
      email,
      phone,
    },
    property: {
      address,
      city: firstString(payload, ["city", "property.city", "listing.city"]),
      state: firstString(payload, ["state", "property.state", "listing.state"]),
      postalCode: firstString(payload, ["postal_code", "postalCode", "zip", "property.postal_code"]),
      listingId: firstString(payload, ["listing_id", "listingId", "listing.id", "property.listing_id"]),
      propertyId: firstString(payload, ["property_id", "propertyId", "property.id"]),
    },
    attribution: {
      source,
      medium,
      campaign,
      content: firstString(payload, ["utm_content", "content", "attribution.content"]),
      term: firstString(payload, ["utm_term", "term", "attribution.term"]),
      placementId: firstString(payload, ["placement_id", "placementId", "ad_placement", "attribution.placement_id"]),
      clickIds,
    },
    consent: {
      email: consentEmail,
      sms: consentSms,
      call: consentCall,
      source: firstString(payload, ["consent_source", "consent.source", "permissions.source"]),
    },
    intent: {
      leadType: normalizedLeadType(firstString(payload, ["lead_type", "leadType", "intent", "type"])),
      timeline: firstString(payload, ["timeline", "timeframe", "intent.timeline"]),
      message: firstString(payload, ["message", "comments", "notes", "question", "lead.message"]),
    },
    safeMetadata: safeMetadata(payload),
    payloadHash: fingerprintVendorPayload(input.payload),
    requiresReview: reviewReasons.length > 0,
    reviewReasons,
  };
}
