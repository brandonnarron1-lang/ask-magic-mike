import { createHmac, timingSafeEqual } from "node:crypto";
import {
  fingerprintVendorPayload,
  normalizeVendorLead,
  type NormalizedVendorLead,
  type SupportedGrowthVendor,
} from "./vendor-ingress";

export const VENDOR_INGRESS_TEST_PROFILES = [
  "zillow_tech_connect",
  "follow_up_boss_webhook",
  "meta_leadgen_webhook",
  "google_ads_lead_form",
] as const;

export type VendorIngressTestProfile = (typeof VENDOR_INGRESS_TEST_PROFILES)[number];

export type VendorContractStatus =
  | "provider_onboarding_required"
  | "envelope_contract_ready"
  | "direct_payload_contract_ready";

export type VendorSignatureMode =
  | "provider_contract_required"
  | "fub_hmac_sha256_base64_body"
  | "meta_x_hub_signature_256"
  | "google_key_constant_time_match";

export interface VendorIngressContractSummary {
  profile: VendorIngressTestProfile;
  vendor: SupportedGrowthVendor;
  label: string;
  category: "portal" | "crm" | "paid_social" | "paid_search";
  contractStatus: VendorContractStatus;
  payloadMode: "contract_only" | "event_envelope" | "direct_lead";
  signatureMode: VendorSignatureMode;
  officialReference: string;
  secureRequirements: string[];
  readinessNote: string;
}

export interface VendorIngressContractInspection {
  schemaVersion: "amm.vendor_ingress_contract_lab.v1";
  generatedAt: string;
  isTest: true;
  testMarker: "INTERNAL QA — DO NOT CONTACT";
  contract: VendorIngressContractSummary;
  verification: {
    syntheticVerificationPassed: boolean | null;
    providerFetchRequired: boolean | null;
    canonicalLeadReady: boolean;
    providerCallPerformed: false;
    databaseWritePerformed: false;
    rawPayloadRetained: false;
    liveActivationAuthorized: false;
  };
  envelope: Record<string, string | number | boolean | null>;
  normalizedLead: NormalizedVendorLead | null;
  payloadHash: string | null;
  reviewReasons: string[];
}

const CONTRACTS: readonly VendorIngressContractSummary[] = [
  {
    profile: "zillow_tech_connect",
    vendor: "zillow",
    label: "Zillow Tech Connect",
    category: "portal",
    contractStatus: "provider_onboarding_required",
    payloadMode: "contract_only",
    signatureMode: "provider_contract_required",
    officialReference: "https://www.zillow.com/pro/how-to-set-up-zillows-tech-connect/",
    secureRequirements: [
      "Approved Zillow product and Tech Connect relationship",
      "Authenticated provider field map and current onboarding guide",
      "Provider-approved authentication, retention, and permitted-use rules",
    ],
    readinessNote: "The public page confirms partner routing, but the exact lead contract is gated by provider onboarding. No payload shape is invented.",
  },
  {
    profile: "follow_up_boss_webhook",
    vendor: "follow_up_boss",
    label: "Follow Up Boss",
    category: "crm",
    contractStatus: "envelope_contract_ready",
    payloadMode: "event_envelope",
    signatureMode: "fub_hmac_sha256_base64_body",
    officialReference: "https://docs.followupboss.com/reference/webhooks-guide",
    secureRequirements: [
      "Account-owner webhook access",
      "Server-only X-System-Key for FUB-Signature verification",
      "Server-only scoped API credential for the event resource fetch",
    ],
    readinessNote: "The webhook carries event and resource identifiers. A verified, separately authorized resource fetch is required before lead normalization.",
  },
  {
    profile: "meta_leadgen_webhook",
    vendor: "meta",
    label: "Meta Lead Ads",
    category: "paid_social",
    contractStatus: "envelope_contract_ready",
    payloadMode: "event_envelope",
    signatureMode: "meta_x_hub_signature_256",
    officialReference: "https://github.com/fbsamples/lead-ads-webhook-sample",
    secureRequirements: [
      "Approved Meta app and Page leadgen subscription",
      "Server-only app secret for X-Hub-Signature-256 verification",
      "Server-only approved Page or system-user token for lead retrieval",
    ],
    readinessNote: "The notification carries a leadgen ID, not the consumer fields. Signature verification and an authorized Graph retrieval must precede normalization.",
  },
  {
    profile: "google_ads_lead_form",
    vendor: "google",
    label: "Google Ads lead form",
    category: "paid_search",
    contractStatus: "direct_payload_contract_ready",
    payloadMode: "direct_lead",
    signatureMode: "google_key_constant_time_match",
    officialReference: "https://developers.google.com/google-ads/webhook/docs/implementation",
    secureRequirements: [
      "Server-only advertiser-generated google_key",
      "Approved Google Ads lead-form asset and privacy policy",
      "Explicit field-to-consent review before any communication",
    ],
    readinessNote: "Google posts the lead fields directly. lead_id is the dedupe authority; google_key must match, and channel consent is never inferred.",
  },
] as const;

const SYNTHETIC_SIGNING_MATERIAL = "internal-qa-contract-check-not-a-live-credential";
const TEST_MARKER = "INTERNAL QA — DO NOT CONTACT" as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function constantTimeTextMatch(expected: string, supplied: string) {
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export function verifyFollowUpBossSignature(rawBody: string, suppliedSignature: string, systemKey: string) {
  if (!rawBody || !systemKey || !/^[a-f0-9]{64}$/i.test(suppliedSignature)) return false;
  const expected = createHmac("sha256", systemKey)
    .update(Buffer.from(rawBody).toString("base64"))
    .digest("hex");
  return constantTimeTextMatch(expected, suppliedSignature.toLowerCase());
}

export function verifyMetaWebhookSignature(rawBody: string, suppliedHeader: string, appSecret: string) {
  const match = /^sha256=([a-f0-9]{64})$/i.exec(suppliedHeader);
  if (!rawBody || !appSecret || !match) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return constantTimeTextMatch(expected, match[1].toLowerCase());
}

export function verifyGoogleWebhookKey(suppliedKey: string, expectedKey: string) {
  if (!suppliedKey || !expectedKey || suppliedKey.length > 256 || expectedKey.length > 256) return false;
  return constantTimeTextMatch(expectedKey, suppliedKey);
}

export function listVendorIngressContractSummaries(): VendorIngressContractSummary[] {
  return CONTRACTS.map((contract) => ({
    ...contract,
    secureRequirements: [...contract.secureRequirements],
  }));
}

export function isVendorIngressTestProfile(value: unknown): value is VendorIngressTestProfile {
  return typeof value === "string" && VENDOR_INGRESS_TEST_PROFILES.includes(value as VendorIngressTestProfile);
}

export function adaptGoogleLeadFormPayload(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) return {};
  const columns = Array.isArray(payload.user_column_data) ? payload.user_column_data : [];
  const values = new Map<string, string>();
  for (const column of columns) {
    if (!isRecord(column)) continue;
    const id = safeString(column.column_id).toUpperCase();
    const value = safeString(column.string_value);
    if (id && value && !values.has(id)) values.set(id, value);
  }

  const fullName = values.get("FULL_NAME") || "";
  const firstName = values.get("FIRST_NAME") || fullName.split(/\s+/).filter(Boolean)[0] || "";
  const lastName = values.get("LAST_NAME") || fullName.split(/\s+/).filter(Boolean).slice(1).join(" ");
  const helpGoal = values.get("REALTOR_HELP_GOAL") || values.get("SERVICE") || "";
  const timeline = values.get("PURCHASE_TIMELINE") || "";

  return {
    lead_id: payload.lead_id,
    event_id: payload.lead_id,
    occurred_at: payload.lead_submit_time,
    is_test: payload.is_test,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    email: values.get("EMAIL") || values.get("WORK_EMAIL"),
    phone: values.get("PHONE_NUMBER") || values.get("WORK_PHONE"),
    address: values.get("STREET_ADDRESS"),
    city: values.get("CITY"),
    state: values.get("REGION"),
    postal_code: values.get("POSTAL_CODE"),
    source: "google",
    utm_medium: "paid_search",
    campaign_id: payload.campaign_id,
    form_id: payload.form_id,
    gclid: payload.gcl_id,
    lead_type: helpGoal || "general",
    timeline: timeline || undefined,
    message: [TEST_MARKER, helpGoal].filter(Boolean).join(" · "),
  };
}

function contractFor(profile: VendorIngressTestProfile) {
  const contract = CONTRACTS.find((item) => item.profile === profile);
  if (!contract) throw new Error("Unsupported vendor ingress contract profile.");
  return { ...contract, secureRequirements: [...contract.secureRequirements] };
}

export function runVendorIngressContractInspection(
  profile: VendorIngressTestProfile,
  receivedAt = new Date(),
): VendorIngressContractInspection {
  const contract = contractFor(profile);
  const base = {
    schemaVersion: "amm.vendor_ingress_contract_lab.v1" as const,
    generatedAt: receivedAt.toISOString(),
    isTest: true as const,
    testMarker: TEST_MARKER,
    contract,
  };

  if (profile === "zillow_tech_connect") {
    return {
      ...base,
      verification: {
        syntheticVerificationPassed: null,
        providerFetchRequired: null,
        canonicalLeadReady: false,
        providerCallPerformed: false,
        databaseWritePerformed: false,
        rawPayloadRetained: false,
        liveActivationAuthorized: false,
      },
      envelope: { contract_only: true },
      normalizedLead: null,
      payloadHash: null,
      reviewReasons: ["provider_contract_required", "authenticated_field_map_required"],
    };
  }

  if (profile === "follow_up_boss_webhook") {
    const payload = {
      eventId: "00000000-0000-4000-8000-000000000101",
      eventCreated: "2026-08-24T12:00:00Z",
      event: "peopleCreated",
      resourceIds: [424242],
      uri: "https://api.followupboss.com/v1/people?id=424242",
    };
    const rawBody = JSON.stringify(payload);
    const signature = createHmac("sha256", SYNTHETIC_SIGNING_MATERIAL)
      .update(Buffer.from(rawBody).toString("base64"))
      .digest("hex");
    return {
      ...base,
      verification: {
        syntheticVerificationPassed: verifyFollowUpBossSignature(rawBody, signature, SYNTHETIC_SIGNING_MATERIAL),
        providerFetchRequired: true,
        canonicalLeadReady: false,
        providerCallPerformed: false,
        databaseWritePerformed: false,
        rawPayloadRetained: false,
        liveActivationAuthorized: false,
      },
      envelope: {
        external_event_id: payload.eventId,
        event_name: payload.event,
        resource_count: payload.resourceIds.length,
        resource_fetch_required: true,
      },
      normalizedLead: null,
      payloadHash: fingerprintVendorPayload(payload),
      reviewReasons: ["provider_resource_fetch_required", "provider_credentials_not_used"],
    };
  }

  if (profile === "meta_leadgen_webhook") {
    const payload = {
      object: "page",
      entry: [{
        id: "100000000000001",
        time: 1787572800,
        changes: [{
          field: "leadgen",
          value: {
            form_id: "200000000000001",
            leadgen_id: "300000000000001",
            created_time: 1787572800,
            page_id: "100000000000001",
          },
        }],
      }],
    };
    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", SYNTHETIC_SIGNING_MATERIAL).update(rawBody).digest("hex")}`;
    const value = payload.entry[0].changes[0].value;
    return {
      ...base,
      verification: {
        syntheticVerificationPassed: verifyMetaWebhookSignature(rawBody, signature, SYNTHETIC_SIGNING_MATERIAL),
        providerFetchRequired: true,
        canonicalLeadReady: false,
        providerCallPerformed: false,
        databaseWritePerformed: false,
        rawPayloadRetained: false,
        liveActivationAuthorized: false,
      },
      envelope: {
        object: payload.object,
        event_name: payload.entry[0].changes[0].field,
        external_lead_id: value.leadgen_id,
        form_id: value.form_id,
        page_id: value.page_id,
        graph_fetch_required: true,
      },
      normalizedLead: null,
      payloadHash: fingerprintVendorPayload(payload),
      reviewReasons: ["graph_lead_retrieval_required", "provider_credentials_not_used"],
    };
  }

  const payload = {
    lead_id: "INTERNAL-QA-GOOGLE-0001",
    api_version: "1.0",
    form_id: 100000000000001,
    campaign_id: 200000000000001,
    google_key: SYNTHETIC_SIGNING_MATERIAL,
    is_test: true,
    gcl_id: "INTERNAL_QA_GCLID",
    lead_submit_time: "2026-08-24T12:00:00Z",
    lead_source: "LEAD_FORM",
    user_column_data: [
      { column_id: "FULL_NAME", string_value: "INTERNAL QA VENDOR TEST" },
      { column_id: "EMAIL", string_value: "vendor-contract-qa@example.com" },
      { column_id: "PHONE_NUMBER", string_value: "+12025550100" },
      { column_id: "CITY", string_value: "Wilson" },
      { column_id: "REGION", string_value: "NC" },
      { column_id: "POSTAL_CODE", string_value: "27893" },
      { column_id: "REALTOR_HELP_GOAL", string_value: "seller" },
      { column_id: "PURCHASE_TIMELINE", string_value: "30-60 days" },
      { column_id: "UNRECOGNIZED_FUTURE_FIELD", string_value: "ignored safely" },
    ],
  };
  const rawPayloadHash = fingerprintVendorPayload(payload);
  const normalizedLead = {
    ...normalizeVendorLead({
      vendor: "google",
      payload: adaptGoogleLeadFormPayload(payload),
      receivedAt,
    }),
    payloadHash: rawPayloadHash,
  };
  return {
    ...base,
    verification: {
      syntheticVerificationPassed: verifyGoogleWebhookKey(payload.google_key, SYNTHETIC_SIGNING_MATERIAL),
      providerFetchRequired: false,
      canonicalLeadReady: !normalizedLead.requiresReview,
      providerCallPerformed: false,
      databaseWritePerformed: false,
      rawPayloadRetained: false,
      liveActivationAuthorized: false,
    },
    envelope: {
      external_lead_id: payload.lead_id,
      form_id: payload.form_id,
      campaign_id: payload.campaign_id,
      is_test: payload.is_test,
      direct_lead_payload: true,
    },
    normalizedLead,
    payloadHash: rawPayloadHash,
    reviewReasons: [...normalizedLead.reviewReasons],
  };
}
