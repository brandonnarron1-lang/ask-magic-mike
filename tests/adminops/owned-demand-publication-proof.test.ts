import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  normalizeOwnedDemandPublicEvidenceUrl,
  publicationPolicyForChannel,
  validateOwnedDemandPublicationProof,
} from "../../app/lib/growth/publication-proof";
import {
  loadOwnedDemandPublicationProofLedger,
  recordOwnedDemandPublicationProof,
  type OwnedDemandPublicationQuery,
} from "../../app/lib/persistence/neonOwnedDemandPublicationProofs";

const NOW = new Date("2026-08-21T17:30:00.000Z");
const FINAL_COPY = "Wilson homeowners can request a broker-reviewed home-value and sale-readiness review from Our Town Properties.";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    channelKey: "facebook",
    placementKey: "seller_review",
    platformState: "live",
    proofType: "public_url",
    evidenceUrl: "https://www.facebook.com/OurTownProperties/posts/123?ref=page_internal#comments",
    evidenceReference: null,
    finalCopy: FINAL_COPY,
    creativeAssetKey: "brand/black-diamond/hero-social-4x5-v1",
    approvalReference: "Owner approval 2026-08-21",
    actor: "lead_center:user-123",
    isTest: false,
    ...overrides,
  };
}

class QueryStub implements OwnedDemandPublicationQuery {
  calls: Array<{ text: string; params?: unknown[] }> = [];

  constructor(private readonly responses: unknown[]) {}

  async query(text: string, params?: unknown[]) {
    this.calls.push({ text, params });
    return this.responses.shift() ?? [];
  }
}

describe("owned-demand publication proof validation", () => {
  it("resolves canonical attribution, strips URL fragments, hashes copy, and never returns raw copy", () => {
    const result = validateOwnedDemandPublicationProof(validInput(), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.placement.channelKey).toBe("facebook");
    expect(result.value.placement.content).toBe("facebook_local_question_seller_review");
    expect(result.value.placement.trackedUrl).toContain("utm_campaign=amm_owned_demand_2026");
    expect(result.value.evidenceUrl).toBe("https://www.facebook.com/OurTownProperties/posts/123?ref=page_internal");
    expect(result.value.finalCopySha256).toBe(createHash("sha256").update(FINAL_COPY).digest("hex"));
    expect(result.value).not.toHaveProperty("finalCopy");
    expect(result.value.observedAt).toBe(NOW.toISOString());
  });

  it("uses a deterministic idempotency key for the same observed proof", () => {
    const first = validateOwnedDemandPublicationProof(validInput(), NOW);
    const second = validateOwnedDemandPublicationProof(validInput(), new Date("2026-08-21T18:00:00Z"));
    expect(first.ok && second.ok && first.value.idempotencyKey).toBe(second.ok ? second.value.idempotencyKey : null);
  });

  it("rejects foreign hosts, credentials, sensitive query parameters, and PII in public evidence", () => {
    for (const evidenceUrl of [
      "https://example.com/post/123",
      "https://user:password@facebook.com/post/123",
      "https://facebook.com/post/123?access_token=private",
      "https://facebook.com/post/123?ref=owner@example.com",
      "https://facebook.com/post/123?ref=252-555-0100",
    ]) {
      expect(validateOwnedDemandPublicationProof(validInput({ evidenceUrl }), NOW).ok).toBe(false);
    }
    expect(normalizeOwnedDemandPublicEvidenceUrl("facebook", "javascript:alert(1)")).toBeNull();
  });

  it("enforces channel-specific states and state-to-proof relationships", () => {
    expect(validateOwnedDemandPublicationProof(validInput({ platformState: "configured" }), NOW)).toEqual({ ok: false, error: "invalid_platform_state" });
    expect(validateOwnedDemandPublicationProof(validInput({ platformState: "scheduled" }), NOW)).toEqual({ ok: false, error: "proof_type_state_mismatch" });
    expect(validateOwnedDemandPublicationProof(validInput({ proofType: "platform_reference", evidenceUrl: null, evidenceReference: "Meta scheduled post 123" }), NOW)).toEqual({ ok: false, error: "proof_type_state_mismatch" });
  });

  it("accepts non-public references for scheduled, configured, and scan-tested placements", () => {
    const cases = [
      validInput({ channelKey: "google_business_profile", placementKey: "general_question", platformState: "scheduled", proofType: "platform_reference", evidenceUrl: null, evidenceReference: "GBP scheduled update 123" }),
      validInput({ channelKey: "email_signature", placementKey: "general_question", platformState: "configured", proofType: "configuration_reference", evidenceUrl: null, evidenceReference: "Approved brokerage signature v2" }),
      validInput({ channelKey: "qr_print", placementKey: "buyer_match", platformState: "distributed", proofType: "scan_test_reference", evidenceUrl: null, evidenceReference: "Two-device scan test packet 14" }),
    ];
    expect(cases.map((input) => validateOwnedDemandPublicationProof(input, NOW).ok)).toEqual([true, true, true]);
  });

  it("records a named WordPress placement only against the brokerage public host", () => {
    const valid = validateOwnedDemandPublicationProof(validInput({
      channelKey: "ourtown_wordpress",
      placementKey: "wordpress_we_buy_homes",
      evidenceUrl: "https://www.ourtownproperties.com/we-buy-homes/",
    }), NOW);
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.placement.destination).toBe("https://www.askmagicmike.com/sell");
      expect(valid.value.placement.content).toBe("wordpress_we_buy_homes");
    }
    expect(validateOwnedDemandPublicationProof(validInput({
      channelKey: "ourtown_wordpress",
      placementKey: "wordpress_we_buy_homes",
      evidenceUrl: "https://example.com/we-buy-homes/",
    }), NOW).ok).toBe(false);
  });

  it("rejects raw PII, secrets, placeholders, unsupported claims, and fair-housing language", () => {
    const invalidCopy = [
      "Contact owner@example.com for this broker-reviewed real estate request.",
      "Use api_key=secretvalue to open this broker-reviewed real estate request.",
      "Request a guaranteed home value from the team today.",
      "Ask about [address] and receive a broker-reviewed real estate conversation.",
      "This home is perfect for families seeking a local real estate conversation.",
    ];
    expect(invalidCopy.map((finalCopy) => validateOwnedDemandPublicationProof(validInput({ finalCopy }), NOW).ok)).toEqual([false, false, false, false, false]);
  });

  it("exposes only supported channel policy options", () => {
    expect(publicationPolicyForChannel("ourtown_wordpress")?.states).toEqual(["live", "configured", "removed"]);
    expect(publicationPolicyForChannel("facebook")?.states).toEqual(["live", "scheduled", "removed"]);
    expect(publicationPolicyForChannel("qr_print")?.proofTypes).toEqual(["scan_test_reference", "removal_reference"]);
    expect(publicationPolicyForChannel("unknown")).toBeNull();
  });
});

describe("Neon owned-demand publication proof repository", () => {
  it("reports unconfigured and schema-pending states without querying proof rows", async () => {
    expect(await loadOwnedDemandPublicationProofLedger({ query: null, now: NOW })).toMatchObject({ configured: false, schemaReady: false, proofs: [] });
    const sql = new QueryStub([[{ ready: false }]]);
    expect(await loadOwnedDemandPublicationProofLedger({ query: sql, now: NOW })).toMatchObject({ configured: true, schemaReady: false, proofs: [] });
    expect(sql.calls).toHaveLength(1);
  });

  it("loads only bounded, non-test evidence rows", async () => {
    const sql = new QueryStub([
      [{ ready: true }],
      [{
        id: "proof-1",
        channel_key: "facebook",
        placement_key: "seller_review",
        platform_state: "live",
        proof_type: "public_url",
        campaign_key: "amm_owned_demand_2026",
        utm_source: "facebook",
        utm_medium: "social_organic",
        utm_content: "facebook_local_question_seller_review",
        tracked_url: "https://www.askmagicmike.com/home-value?utm_source=facebook",
        evidence_url: "https://facebook.com/post/123",
        evidence_reference: null,
        final_copy_sha256: "a".repeat(64),
        creative_asset_key: null,
        approval_reference: "Owner approval 2026-08-21",
        observed_at: NOW.toISOString(),
        recorded_by: "lead_center:user-123",
        created_at: NOW.toISOString(),
      }],
    ]);
    const result = await loadOwnedDemandPublicationProofLedger({ query: sql, now: NOW });
    expect(result.schemaReady).toBe(true);
    expect(result.proofs).toHaveLength(1);
    expect(result.proofs[0].channelKey).toBe("facebook");
    expect(sql.calls[1].text).toContain("WHERE is_test = false");
    expect(sql.calls[1].text).toContain("LIMIT 250");
  });

  it("does not expose an unsafe persisted evidence URL to the rendered view", async () => {
    const sql = new QueryStub([
      [{ ready: true }],
      [{
        id: "proof-unsafe",
        channel_key: "facebook",
        placement_key: "seller_review",
        platform_state: "live",
        proof_type: "public_url",
        campaign_key: "amm_owned_demand_2026",
        evidence_url: "javascript:alert(1)",
        final_copy_sha256: "a".repeat(64),
        observed_at: NOW.toISOString(),
        created_at: NOW.toISOString(),
      }],
    ]);
    const result = await loadOwnedDemandPublicationProofLedger({ query: sql, now: NOW });
    expect(result.proofs[0].evidenceUrl).toBeNull();
  });

  it("fails closed in Preview before any database query", async () => {
    const sql = new QueryStub([]);
    const result = await recordOwnedDemandPublicationProof(validInput(), {
      query: sql,
      now: NOW,
      env: { VERCEL_ENV: "preview", PREVIEW_DATA_MODE: "disabled" },
    });
    expect(result).toEqual({ ok: false, statusCode: 503, error: "preview_data_disabled" });
    expect(sql.calls).toHaveLength(0);
  });

  it("records only canonical minimized parameters through the server-only RPC", async () => {
    const sql = new QueryStub([
      [{ ready: true }],
      [{ result: { ok: true, proof_id: "proof-1", audit_id: "audit-1", idempotent_replay: false } }],
    ]);
    const result = await recordOwnedDemandPublicationProof(validInput(), { query: sql, now: NOW, env: {} });
    expect(result).toEqual({ ok: true, proofId: "proof-1", auditId: "audit-1", idempotentReplay: false });
    expect(sql.calls[1].text).toContain("record_owned_demand_publication_proof_v1");
    expect(sql.calls[1].params).not.toContain(FINAL_COPY);
    expect(sql.calls[1].params).toContain(createHash("sha256").update(FINAL_COPY).digest("hex"));
    expect(sql.calls[1].params).toContain("amm_owned_demand_2026");
  });

  it("does not touch the database when validation fails", async () => {
    const sql = new QueryStub([]);
    const result = await recordOwnedDemandPublicationProof(validInput({ finalCopy: "too short" }), { query: sql, now: NOW, env: {} });
    expect(result).toEqual({ ok: false, statusCode: 400, error: "invalid_final_copy" });
    expect(sql.calls).toHaveLength(0);
  });
});
