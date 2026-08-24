import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  adaptGoogleLeadFormPayload,
  listVendorIngressContractSummaries,
  runVendorIngressContractInspection,
  verifyFollowUpBossSignature,
  verifyGoogleWebhookKey,
  verifyMetaWebhookSignature,
} from "../../app/lib/growth/vendor-ingress-contracts";
import { normalizeVendorLead } from "../../app/lib/growth/vendor-ingress";

const NOW = new Date("2026-08-24T16:00:00.000Z");

describe("vendor ingress contract lab", () => {
  it("publishes one explicit portal, CRM, Meta, and Google contract without claiming live activation", () => {
    const contracts = listVendorIngressContractSummaries();
    expect(contracts.map((contract) => contract.profile)).toEqual([
      "zillow_tech_connect",
      "follow_up_boss_webhook",
      "meta_leadgen_webhook",
      "google_ads_lead_form",
    ]);
    expect(contracts.map((contract) => contract.category)).toEqual([
      "portal",
      "crm",
      "paid_social",
      "paid_search",
    ]);
    expect(contracts.every((contract) => contract.officialReference.startsWith("https://"))).toBe(true);
  });

  it("fails closed on Zillow until the authenticated provider contract is available", () => {
    const result = runVendorIngressContractInspection("zillow_tech_connect", NOW);
    expect(result.contract.contractStatus).toBe("provider_onboarding_required");
    expect(result.normalizedLead).toBeNull();
    expect(result.payloadHash).toBeNull();
    expect(result.reviewReasons).toEqual([
      "provider_contract_required",
      "authenticated_field_map_required",
    ]);
  });

  it("verifies the Follow Up Boss raw-body signature contract and rejects tampering", () => {
    const key = "synthetic-fub-key";
    const rawBody = JSON.stringify({ eventId: "qa-event", event: "peopleCreated" });
    const signature = createHmac("sha256", key)
      .update(Buffer.from(rawBody).toString("base64"))
      .digest("hex");
    expect(verifyFollowUpBossSignature(rawBody, signature, key)).toBe(true);
    expect(verifyFollowUpBossSignature(`${rawBody} `, signature, key)).toBe(false);
    expect(verifyFollowUpBossSignature(rawBody, "not-a-signature", key)).toBe(false);
  });

  it("verifies the Meta SHA-256 header contract and rejects tampering", () => {
    const key = "synthetic-meta-key";
    const rawBody = JSON.stringify({ object: "page", entry: [] });
    const signature = `sha256=${createHmac("sha256", key).update(rawBody).digest("hex")}`;
    expect(verifyMetaWebhookSignature(rawBody, signature, key)).toBe(true);
    expect(verifyMetaWebhookSignature(`${rawBody}\n`, signature, key)).toBe(false);
    expect(verifyMetaWebhookSignature(rawBody, signature.replace("sha256=", "sha1="), key)).toBe(false);
  });

  it("maps the documented Google column structure while refusing to infer consent", () => {
    const payload = {
      lead_id: "INTERNAL-QA-GOOGLE-CUSTOM",
      google_key: "synthetic-google-key",
      is_test: true,
      gcl_id: "INTERNAL_QA_GCLID",
      lead_submit_time: "2026-08-24T15:59:00Z",
      form_id: 101,
      campaign_id: 202,
      user_column_data: [
        { column_id: "FULL_NAME", string_value: "INTERNAL QA VENDOR TEST" },
        { column_id: "EMAIL", string_value: "contract@example.com" },
        { column_id: "PHONE_NUMBER", string_value: "+12025550100" },
        { column_id: "CITY", string_value: "Wilson" },
        { column_id: "REGION", string_value: "NC" },
        { column_id: "REALTOR_HELP_GOAL", string_value: "seller" },
        { column_id: "UNRECOGNIZED_FUTURE_FIELD", string_value: "ignored" },
      ],
    };
    const normalized = normalizeVendorLead({
      vendor: "google",
      payload: adaptGoogleLeadFormPayload(payload),
      receivedAt: NOW,
    });

    expect(verifyGoogleWebhookKey(payload.google_key, "synthetic-google-key")).toBe(true);
    expect(verifyGoogleWebhookKey(payload.google_key, "wrong-key")).toBe(false);
    expect(normalized).toMatchObject({
      vendor: "google",
      isTest: true,
      externalLeadId: "INTERNAL-QA-GOOGLE-CUSTOM",
      contact: {
        firstName: "INTERNAL",
        lastName: "QA VENDOR TEST",
        email: "contract@example.com",
        phone: "+12025550100",
      },
      property: { city: "Wilson", state: "NC" },
      attribution: { source: "google", medium: "paid_search" },
      consent: { email: null, sms: null, call: null },
      intent: { leadType: "seller" },
      requiresReview: true,
    });
    expect(normalized.reviewReasons).toContain("consent_not_explicit");
    expect(normalized.safeMetadata).not.toHaveProperty("UNRECOGNIZED_FUTURE_FIELD");
  });

  it("keeps every built-in inspection synthetic, no-write, no-call, and non-authoritative", () => {
    for (const contract of listVendorIngressContractSummaries()) {
      const result = runVendorIngressContractInspection(contract.profile, NOW);
      expect(result).toMatchObject({
        schemaVersion: "amm.vendor_ingress_contract_lab.v1",
        generatedAt: NOW.toISOString(),
        isTest: true,
        testMarker: "INTERNAL QA — DO NOT CONTACT",
        verification: {
          providerCallPerformed: false,
          databaseWritePerformed: false,
          rawPayloadRetained: false,
          liveActivationAuthorized: false,
        },
      });
      expect(result.envelope).not.toHaveProperty("google_key");
      if (result.normalizedLead) {
        expect(result.normalizedLead.safeMetadata).not.toHaveProperty("google_key");
      }
      expect(JSON.stringify(result)).not.toContain("internal-qa-contract-check-not-a-live-credential");
    }
  });
});
