import { describe, expect, it } from "vitest";
import {
  SPEND_INGRESS_HEADERS,
  SPEND_INGRESS_MAX_BYTES,
  SYNTHETIC_SPEND_CSV,
  parseMarketingSpendCsv,
} from "../../app/lib/growth/spend-ingress";

const NOW = new Date("2026-08-24T16:00:00.000Z");

function csvRow(overrides: Partial<Record<(typeof SPEND_INGRESS_HEADERS)[number], string>> = {}) {
  const values: Record<(typeof SPEND_INGRESS_HEADERS)[number], string> = {
    spend_date: "2026-08-20",
    channel_key: "google_ads",
    channel_name: "Google Ads",
    vendor: "google",
    channel_type: "search",
    buying_model: "cpc",
    campaign_key: "wilson_seller_review",
    campaign_name: "Wilson Seller Review",
    campaign_status: "active",
    external_campaign_id: "123456789",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "wilson_seller_review",
    spend_usd: "125.45",
    impressions: "2500",
    clicks: "85",
    platform_leads: "4",
    booked_appointments: "1",
    source_system: "google_ads_export",
    ...overrides,
  };
  return SPEND_INGRESS_HEADERS.map((header) => values[header]).join(",");
}

function csv(...rows: string[]) {
  return `${SPEND_INGRESS_HEADERS.join(",")}\n${rows.join("\n")}`;
}

describe("canonical marketing-spend CSV contract", () => {
  it("normalizes a real row, derives stable fingerprints, and retains no raw CSV", () => {
    const result = parseMarketingSpendCsv(csv(csvRow()), { now: NOW });
    expect(result).toMatchObject({
      ok: true,
      rowCount: 1,
      dateStart: "2026-08-20",
      dateEnd: "2026-08-20",
      sourceSystems: ["google_ads_export"],
      synthetic: false,
      totals: {
        spendUsd: 125.45,
        impressions: 2500,
        clicks: 85,
        platformLeads: 4,
        bookedAppointments: 1,
      },
      rawCsvRetained: false,
    });
    expect(result.batchFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result.rows[0].rowFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).not.toHaveProperty("csv");
    expect(result.rows[0]).not.toHaveProperty("raw");
  });

  it("makes the unmistakable synthetic template valid for preview but non-importable", () => {
    const result = parseMarketingSpendCsv(SYNTHETIC_SPEND_CSV, { now: NOW });
    expect(result.ok).toBe(true);
    expect(result.synthetic).toBe(true);
    expect(result.sourceSystems).toEqual(["synthetic_template"]);
  });

  it("classifies synthetic identity markers even when the source-system slug looks real", () => {
    const result = parseMarketingSpendCsv(csv(csvRow({
      campaign_key: "wilson_test_campaign",
      campaign_name: "Wilson Test Campaign",
      external_campaign_id: "TEST-123",
      utm_campaign: "wilson_test_campaign",
      source_system: "google_ads_export",
    })), { now: NOW });
    expect(result).toMatchObject({ ok: true, synthetic: true });
  });

  it("creates the same batch fingerprint regardless of source row order", () => {
    const first = csvRow({ spend_date: "2026-08-19", spend_usd: "100.00" });
    const second = csvRow({ spend_date: "2026-08-20", spend_usd: "125.45" });
    const forward = parseMarketingSpendCsv(csv(first, second), { now: NOW });
    const reverse = parseMarketingSpendCsv(csv(second, first), { now: NOW });
    expect(forward.ok).toBe(true);
    expect(reverse.ok).toBe(true);
    expect(forward.batchFingerprint).toBe(reverse.batchFingerprint);
    expect(forward.rows.map((row) => row.spendDate)).toEqual(["2026-08-19", "2026-08-20"]);
  });

  it("handles RFC-style quoted commas and escaped quotes without ambiguity", () => {
    const row = csvRow({ campaign_name: '"Wilson, ""Premier"" Sellers"' });
    const result = parseMarketingSpendCsv(csv(row), { now: NOW });
    expect(result.ok).toBe(true);
    expect(result.rows[0].campaignName).toBe('Wilson, "Premier" Sellers');
  });

  it("rejects missing, unknown, and duplicate headers", () => {
    const missing = parseMarketingSpendCsv("spend_date,unknown,spend_date\n2026-08-20,x,2026-08-20", { now: NOW });
    expect(missing.ok).toBe(false);
    expect(missing.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      "duplicate_header",
      "missing_header",
      "unknown_header",
    ]));
  });

  it("rejects invalid dates, spreadsheet formulas, formatted money, and negative metrics", () => {
    const result = parseMarketingSpendCsv(csv(csvRow({
      spend_date: "2026-02-30",
      channel_name: '"Google\nAds"',
      campaign_name: "=IMPORTXML(evil)",
      spend_usd: '"$1,000.00"',
      clicks: "-1",
    })), { now: NOW });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "spend_date", code: "invalid_date" }),
      expect.objectContaining({ field: "channel_name", code: "invalid_text" }),
      expect.objectContaining({ field: "campaign_name", code: "invalid_text" }),
      expect.objectContaining({ field: "spend_usd", code: "invalid_money" }),
      expect.objectContaining({ field: "clicks", code: "invalid_integer" }),
    ]));
  });

  it("rejects duplicate campaign-days and conflicting channel or campaign identities", () => {
    const result = parseMarketingSpendCsv(csv(
      csvRow(),
      csvRow({ channel_name: "Conflicting Channel", campaign_name: "Conflicting Campaign" }),
    ), { now: NOW });
    expect(result.ok).toBe(false);
    expect(result.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      "duplicate_campaign_day",
      "channel_identity_conflict",
      "campaign_identity_conflict",
    ]));
  });

  it("bounds bytes, rows, cell length, and malformed quote state", () => {
    const tooLarge = parseMarketingSpendCsv("x".repeat(SPEND_INGRESS_MAX_BYTES + 1), { now: NOW });
    expect(tooLarge.issues[0].code).toBe("csv_too_large");

    const tooMany = parseMarketingSpendCsv(csv(...Array.from({ length: 251 }, (_, index) =>
      csvRow({ spend_date: "2026-08-20", campaign_key: `campaign_${index}`, utm_campaign: `campaign_${index}` }),
    )), { now: NOW });
    expect(tooMany.issues[0].code).toBe("too_many_rows");

    const longCell = parseMarketingSpendCsv(`${SPEND_INGRESS_HEADERS.join(",")}\n${"a".repeat(513)}`, { now: NOW });
    expect(longCell.issues[0].code).toBe("cell_too_long");

    const unclosed = parseMarketingSpendCsv(`${SPEND_INGRESS_HEADERS.join(",")}\n"unterminated`, { now: NOW });
    expect(unclosed.issues[0].code).toBe("unclosed_quote");
  });
});
