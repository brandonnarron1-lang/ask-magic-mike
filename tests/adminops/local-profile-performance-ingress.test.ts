import { describe, expect, it } from "vitest";
import {
  LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS,
  LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES,
  SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV,
  localProfilePerformanceRowsForDatabase,
  localProfilePerformanceSummaryForDatabase,
  parseLocalProfilePerformanceCsv,
  scoreLocalProfileOpportunity,
} from "../../app/lib/growth/local-profile-performance-ingress";

const NOW = new Date("2026-08-24T20:00:00.000Z");

function csvRow(overrides: Partial<Record<
  (typeof LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS)[number],
  string
>> = {}) {
  const values: Record<
    (typeof LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS)[number],
    string
  > = {
    start_date: "2026-08-01",
    end_date: "2026-08-20",
    profile_key: "ourtown_properties_primary",
    data_state: "final",
    metric: "business_impressions_mobile_search",
    value: "1200",
    source_system: "google_business_profile_report",
    ...overrides,
  };
  return LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS.map((header) => values[header]).join(",");
}

function csv(...rows: string[]) {
  return `${LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS.join(",")}\n${rows.join("\n")}`;
}

function completeRows(overrides: Parameters<typeof csvRow>[0] = {}) {
  return [
    csvRow(overrides),
    csvRow({ ...overrides, metric: "business_impressions_desktop_search", value: "300" }),
    csvRow({ ...overrides, metric: "website_clicks", value: "3" }),
    csvRow({ ...overrides, metric: "call_clicks", value: "2" }),
    csvRow({ ...overrides, metric: "business_direction_requests", value: "1" }),
  ];
}

describe("privacy-minimized Google Business Profile performance CSV", () => {
  it("normalizes one aggregate report and derives an explainable opportunity", () => {
    const result = parseLocalProfilePerformanceCsv(csv(...completeRows()), { now: NOW });
    expect(result).toMatchObject({
      ok: true,
      rowCount: 5,
      dateStart: "2026-08-01",
      dateEnd: "2026-08-20",
      profileKeys: ["ourtown_properties_primary"],
      sourceSystems: ["google_business_profile_report"],
      synthetic: false,
      totals: {
        impressions: 1500,
        interactions: 6,
        interactionRate: 0.004,
        websiteClicks: 3,
        callClicks: 2,
        directionRequests: 1,
      },
      sourceCoverage: "operator_reviewed_aggregate_report",
      rawCsvRetained: false,
      rawSearchTermsRetained: false,
      providerLocationIdRetained: false,
      providerCallPerformed: false,
      opportunity: {
        type: "local_profile_interaction_gap",
        policyInteractionRateThreshold: 0.01,
      },
    });
    expect(result.batchFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result.rows.every((row) => row.signalExternalId.startsWith("gbp_performance:"))).toBe(true);
  });

  it("does not infer a gap from partial or incomplete action evidence", () => {
    const partial = parseLocalProfilePerformanceCsv(
      csv(...completeRows({ data_state: "partial" })),
      { now: NOW },
    );
    expect(partial.ok).toBe(true);
    expect(partial.opportunity).toBeNull();

    const incomplete = parseLocalProfilePerformanceCsv(csv(
      csvRow(),
      csvRow({ metric: "website_clicks", value: "0" }),
    ), { now: NOW });
    expect(incomplete.ok).toBe(true);
    expect(incomplete.opportunity).toBeNull();
  });

  it("rejects raw keyword/provider identity columns and spreadsheet formulas", () => {
    const unknown = parseLocalProfilePerformanceCsv(
      `${LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS.join(",")},search_keyword\n${csvRow()},sell my house`,
      { now: NOW },
    );
    expect(unknown.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "search_keyword", code: "unknown_header" }),
    ]));

    const providerId = parseLocalProfilePerformanceCsv(
      `${LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS.join(",")},location_id\n${csvRow()},123456789`,
      { now: NOW },
    );
    expect(providerId.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "location_id", code: "unknown_header" }),
    ]));

    const formula = parseLocalProfilePerformanceCsv(csv(csvRow({ profile_key: "=IMPORTXML(A1)" })), { now: NOW });
    expect(formula.issues[0]).toMatchObject({ field: "profile_key", code: "unknown_profile" });
  });

  it("rejects duplicate metrics, mixed report identity, and unapproved profiles", () => {
    const duplicate = parseLocalProfilePerformanceCsv(csv(csvRow(), csvRow()), { now: NOW });
    expect(duplicate.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "metric", code: "duplicate_metric" }),
    ]));

    const mixed = parseLocalProfilePerformanceCsv(csv(
      csvRow(),
      csvRow({ metric: "website_clicks", end_date: "2026-08-19" }),
    ), { now: NOW });
    expect(mixed.issues[0]).toMatchObject({ code: "mixed_report_identity" });

    const profile = parseLocalProfilePerformanceCsv(csv(csvRow({ profile_key: "nellyselly" })), { now: NOW });
    expect(profile.issues[0]).toMatchObject({ field: "profile_key", code: "unknown_profile" });
  });

  it("bounds bytes, rows, cells, dates, and integer values", () => {
    const tooLarge = parseLocalProfilePerformanceCsv(
      "x".repeat(LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES + 1),
      { now: NOW },
    );
    expect(tooLarge.issues[0].code).toBe("csv_too_large");

    const tooMany = parseLocalProfilePerformanceCsv(csv(
      ...Array.from({ length: 33 }, (_, index) =>
        csvRow({ metric: `metric_${index}` }),
      ),
    ), { now: NOW });
    expect(tooMany.issues[0].code).toBe("too_many_rows");

    const oldDate = parseLocalProfilePerformanceCsv(csv(csvRow({ start_date: "2024-01-01" })), { now: NOW });
    expect(oldDate.issues[0].code).toBe("invalid_date_window");

    const negative = parseLocalProfilePerformanceCsv(csv(csvRow({ value: "-1" })), { now: NOW });
    expect(negative.issues[0]).toMatchObject({ field: "value", code: "invalid_value" });

    const unclosed = parseLocalProfilePerformanceCsv(
      `${LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS.join(",")}\n"unterminated`,
      { now: NOW },
    );
    expect(unclosed.issues[0].code).toBe("unclosed_quote");
  });

  it("keeps the synthetic example valid but unmistakably non-importable", () => {
    const result = parseLocalProfilePerformanceCsv(SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV, { now: NOW });
    expect(result.ok).toBe(true);
    expect(result.synthetic).toBe(true);
    expect(result.sourceSystems).toEqual(["synthetic_template"]);
  });

  it("serializes a fixed minimized database contract", () => {
    const result = parseLocalProfilePerformanceCsv(csv(...completeRows()), { now: NOW });
    expect(result.ok).toBe(true);
    const rows = localProfilePerformanceRowsForDatabase(result.rows);
    const summary = localProfilePerformanceSummaryForDatabase(result);
    expect(Object.keys(rows[0]).sort()).toEqual([
      "confidence",
      "data_state",
      "end_date",
      "geography",
      "metric",
      "profile_key",
      "row_fingerprint",
      "signal_external_id",
      "signal_score",
      "signal_type",
      "source_system",
      "start_date",
      "value",
    ]);
    expect(summary).toMatchObject({
      impressions_total: 1500,
      interactions_total: 6,
      opportunity_type: "local_profile_interaction_gap",
    });
    expect(JSON.stringify({ rows, summary })).not.toMatch(/search_keyword|location_id|oauth|consumer/i);
  });

  it("uses deterministic bounded opportunity components", () => {
    const result = scoreLocalProfileOpportunity({
      profileKey: "ourtown_properties_primary",
      startDate: "2026-08-01",
      endDate: "2026-08-20",
      dataState: "final",
      metricsPresent: new Set([
        "business_impressions_mobile_search",
        "website_clicks",
        "call_clicks",
        "business_direction_requests",
      ]),
      totals: {
        impressions: 1000,
        interactions: 5,
        interactionRate: 0.005,
        websiteClicks: 2,
        callClicks: 2,
        directionRequests: 1,
        conversations: 0,
        bookings: 0,
      },
    });
    expect(result).not.toBeNull();
    expect(result?.score).toBe(
      Math.min(100, (result?.demandPoints ?? 0) +
        (result?.interactionGapPoints ?? 0) +
        (result?.completenessPoints ?? 0)),
    );
  });
});
