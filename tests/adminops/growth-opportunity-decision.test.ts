import { describe, expect, it } from "vitest";
import { buildOpportunityDecisionPacket } from "../../app/lib/growth/opportunity-decision";

const NOW = new Date("2026-08-25T16:00:00.000Z");

describe("privacy-safe growth opportunity decision packets", () => {
  it("turns an organic click gap into a deterministic review packet", () => {
    const packet = buildOpportunityDecisionPacket({
      type: "organic_click_capture_gap",
      confidence: 0.82,
      geography: "US",
      segment: "www.askmagicmike.com",
      detectedAt: "2026-08-21T23:59:59.000Z",
      evidence: {
        date_start: "2026-08-01",
        date_end: "2026-08-20",
        impressions: 1250,
        clicks: 8,
        ctr: 0.0064,
        position: 5.2,
        policy_ctr_threshold: 0.02,
        data_state: "final",
        device: "mobile",
        page_url: "https://www.askmagicmike.com/value?email=private@example.com",
        row_fingerprint: "secret-internal-fingerprint",
      },
    }, { now: NOW });

    expect(packet).toMatchObject({
      confidenceLabel: "high",
      confidencePercent: 82,
      freshness: "current",
      evidenceWindow: "Aug 1, 2026 – Aug 20, 2026",
      sourceHref: "/admin/growth/search-ingress",
    });
    expect(packet.evidence).toEqual(expect.arrayContaining([
      { key: "impressions", label: "Impressions", value: "1,250" },
      { key: "ctr", label: "CTR", value: "0.64%" },
    ]));
    expect(JSON.stringify(packet)).not.toMatch(/private@example|fingerprint|page_url/i);
    expect(packet.nextDecision).toContain("owner approval");
  });

  it("uses only current local-profile metrics and makes execution boundaries explicit", () => {
    const packet = buildOpportunityDecisionPacket({
      type: "local_profile_interaction_gap",
      confidence: 0.71,
      geography: "Wilson, NC",
      segment: "ourtown_properties_primary",
      detectedAt: "2026-08-20T23:59:59.000Z",
      evidence: {
        date_start: "2026-08-01",
        date_end: "2026-08-20",
        impressions_total: 1500,
        interactions_total: 6,
        interaction_rate: 0.004,
        website_clicks: 3,
        call_clicks: 2,
        direction_requests: 1,
        bookings: 0,
        conversations: 999,
        provider_location_id: "must-not-render",
      },
    }, { now: NOW });

    expect(packet).toMatchObject({
      confidenceLabel: "directional",
      freshness: "current",
      sourceHref: "/admin/growth/local-profile-ingress",
    });
    expect(packet.evidence.map((item) => item.key)).toEqual([
      "impressions_total",
      "interactions_total",
      "interaction_rate",
      "website_clicks",
      "call_clicks",
      "direction_requests",
      "bookings",
    ]);
    expect(JSON.stringify(packet)).not.toMatch(/conversations|must-not-render|provider_location/i);
    expect(packet.limitation).toContain("Retired conversation metrics are excluded");
    expect(packet.nextDecision).toContain("owner review");
  });

  it("labels stale and unknown evidence without inventing source facts", () => {
    const stale = buildOpportunityDecisionPacket({
      type: "organic_visibility_gap",
      confidence: 4,
      geography: null,
      segment: null,
      detectedAt: "2026-05-01T00:00:00.000Z",
      evidence: {},
    }, { now: NOW });
    expect(stale.confidencePercent).toBe(100);
    expect(stale.freshness).toBe("stale");
    expect(stale.context).toEqual([]);

    const unknown = buildOpportunityDecisionPacket({
      type: "future_unrecognized_type",
      confidence: Number.NaN,
      geography: "\u0000unsafe",
      segment: "x".repeat(121),
      detectedAt: "not-a-date",
      evidence: { raw_consumer_payload: "do not render" },
    }, { now: NOW });
    expect(unknown).toMatchObject({
      confidenceLabel: "collecting",
      confidencePercent: 0,
      freshness: "unknown",
      evidence: [],
      context: [],
      sourceHref: "/admin/growth",
    });
    expect(JSON.stringify(unknown)).not.toContain("do not render");
  });

  it("rejects malformed calendar dates and unbounded or negative evidence numbers", () => {
    const packet = buildOpportunityDecisionPacket({
      type: "organic_click_capture_gap",
      confidence: 0.7,
      geography: null,
      segment: null,
      detectedAt: "not-a-date",
      evidence: {
        date_start: "2026-02-01",
        date_end: "2026-02-31",
        impressions: -1,
        clicks: "9".repeat(80),
        ctr: 0.01,
      },
    }, { now: NOW });

    expect(packet.evidenceWindow).toBeNull();
    expect(packet.freshness).toBe("unknown");
    expect(packet.evidence.map((item) => item.key)).toEqual(["ctr"]);
  });
});
