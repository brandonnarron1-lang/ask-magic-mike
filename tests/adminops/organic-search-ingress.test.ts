import { describe, expect, it } from "vitest";
import {
  ORGANIC_SEARCH_INGRESS_HEADERS,
  ORGANIC_SEARCH_INGRESS_MAX_BYTES,
  SYNTHETIC_ORGANIC_SEARCH_CSV,
  parseOrganicSearchCsv,
  scoreOrganicSearchPage,
} from "../../app/lib/growth/organic-search-ingress";

const NOW = new Date("2026-08-24T16:00:00.000Z");

function csvRow(overrides: Partial<Record<(typeof ORGANIC_SEARCH_INGRESS_HEADERS)[number], string>> = {}) {
  const values: Record<(typeof ORGANIC_SEARCH_INGRESS_HEADERS)[number], string> = {
    start_date: "2026-08-01",
    end_date: "2026-08-20",
    site_property: "sc-domain:askmagicmike.com",
    search_type: "web",
    data_state: "final",
    country: "ALL",
    device: "all",
    page: "https://askmagicmike.com/home-value",
    clicks: "12",
    impressions: "1200",
    ctr: "1%",
    position: "7.2",
    source_system: "google_search_console_csv",
    ...overrides,
  };
  return ORGANIC_SEARCH_INGRESS_HEADERS.map((header) => values[header]).join(",");
}

function csv(...rows: string[]) {
  return `${ORGANIC_SEARCH_INGRESS_HEADERS.join(",")}\n${rows.join("\n")}`;
}

describe("privacy-minimized Search Console page CSV contract", () => {
  it("normalizes an owned page, reconciles CTR, and derives explainable evidence", () => {
    const result = parseOrganicSearchCsv(csv(csvRow()), { now: NOW });
    expect(result).toMatchObject({
      ok: true,
      rowCount: 1,
      dateStart: "2026-08-01",
      dateEnd: "2026-08-20",
      siteProperties: ["sc-domain:askmagicmike.com"],
      pageHosts: ["www.askmagicmike.com"],
      sourceSystems: ["google_search_console_csv"],
      synthetic: false,
      totals: { clicks: 12, impressions: 1200, ctr: 0.01, opportunities: 1 },
      sourceCoverage: "operator_export_not_guaranteed_exhaustive",
      rawCsvRetained: false,
      rawQueriesRetained: false,
      providerCallPerformed: false,
    });
    expect(result.rows[0]).toMatchObject({
      pageUrl: "https://www.askmagicmike.com/home-value",
      ctr: 0.01,
      position: 7.2,
      opportunity: {
        type: "organic_click_capture_gap",
        policyCtrThreshold: 0.02,
      },
    });
    expect(result.rows[0].opportunity?.score).toBe(
      (result.rows[0].opportunity?.demandPoints ?? 0) +
      (result.rows[0].opportunity?.accessibilityPoints ?? 0) +
      (result.rows[0].opportunity?.clickGapPoints ?? 0),
    );
    expect(result.batchFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result.rows[0].signalExternalId).toMatch(/^gsc_page:[0-9a-f]{64}$/);
    expect(result.rows[0].opportunity?.key).toMatch(/^organic_search:[0-9a-f]{64}$/);
    expect(result).not.toHaveProperty("csv");
    expect(JSON.stringify(result)).not.toContain("query_text");
  });

  it("keeps the synthetic template previewable but unmistakably non-production", () => {
    const result = parseOrganicSearchCsv(SYNTHETIC_ORGANIC_SEARCH_CSV, { now: NOW });
    expect(result).toMatchObject({ ok: true, synthetic: true, rowCount: 1 });
    expect(result.sourceSystems).toEqual(["synthetic_template"]);
  });

  it("creates one stable batch fingerprint regardless of page row order", () => {
    const homeValue = csvRow();
    const seller = csvRow({
      page: "https://www.askmagicmike.com/sell",
      clicks: "9",
      impressions: "900",
      ctr: "0.01",
      position: "12.4",
    });
    const forward = parseOrganicSearchCsv(csv(homeValue, seller), { now: NOW });
    const reverse = parseOrganicSearchCsv(csv(seller, homeValue), { now: NOW });
    expect(forward.ok).toBe(true);
    expect(reverse.ok).toBe(true);
    expect(forward.batchFingerprint).toBe(reverse.batchFingerprint);
    expect(forward.rows.map((row) => row.pagePath)).toEqual(["/home-value", "/sell"]);
  });

  it("rejects non-owned/NellySelly pages, URL payloads, and raw query columns", () => {
    const foreign = parseOrganicSearchCsv(csv(csvRow({ page: "https://nellyselly.com/home-value" })), { now: NOW });
    expect(foreign.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "page", code: "invalid_owned_page" }),
    ]));

    const queryString = parseOrganicSearchCsv(csv(csvRow({ page: "https://www.askmagicmike.com/home-value?email=person@example.com" })), { now: NOW });
    expect(queryString.issues[0]).toMatchObject({ field: "page", code: "invalid_owned_page" });

    const withQueryColumn = parseOrganicSearchCsv(
      `${ORGANIC_SEARCH_INGRESS_HEADERS.join(",")},query\n${csvRow()},sell my house`,
      { now: NOW },
    );
    expect(withQueryColumn.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "query", code: "unknown_header" }),
    ]));
  });

  it("rejects irreconcilable CTR, duplicate pages, and mixed report identity", () => {
    const ctrMismatch = parseOrganicSearchCsv(csv(csvRow({ ctr: "9%" })), { now: NOW });
    expect(ctrMismatch.issues[0]).toMatchObject({ field: "ctr", code: "ctr_mismatch" });

    const duplicate = parseOrganicSearchCsv(csv(csvRow(), csvRow()), { now: NOW });
    expect(duplicate.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "page", code: "duplicate_page" }),
    ]));

    const mixed = parseOrganicSearchCsv(csv(
      csvRow(),
      csvRow({ page: "https://www.askmagicmike.com/sell", device: "mobile" }),
    ), { now: NOW });
    expect(mixed.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "mixed_report_identity" }),
    ]));
  });

  it("scores final aggregate evidence with more confidence than fresh segmented evidence", () => {
    const base = {
      pageUrl: "https://www.askmagicmike.com/home-value",
      pageHost: "www.askmagicmike.com",
      pagePath: "/home-value",
      startDate: "2026-08-01",
      endDate: "2026-08-20",
      clicks: 12,
      impressions: 1200,
      ctr: 0.01,
      position: 7.2,
    } as const;
    const final = scoreOrganicSearchPage({ ...base, dataState: "final", country: "ALL", device: "all" });
    const fresh = scoreOrganicSearchPage({ ...base, dataState: "fresh", country: "USA", device: "mobile" });
    expect(final.signalScore).toBe(fresh.signalScore);
    expect(final.confidence).toBeGreaterThan(fresh.confidence);
    expect(final.opportunity?.type).toBe("organic_click_capture_gap");
  });

  it("bounds bytes, rows, cells, dates, and malformed quoting", () => {
    const tooLarge = parseOrganicSearchCsv("x".repeat(ORGANIC_SEARCH_INGRESS_MAX_BYTES + 1), { now: NOW });
    expect(tooLarge.issues[0].code).toBe("csv_too_large");

    const tooMany = parseOrganicSearchCsv(csv(...Array.from({ length: 1001 }, (_, index) =>
      csvRow({ page: `https://www.askmagicmike.com/page-${index}` }),
    )), { now: NOW });
    expect(tooMany.issues[0].code).toBe("too_many_rows");

    const oldDate = parseOrganicSearchCsv(csv(csvRow({ start_date: "2024-01-01" })), { now: NOW });
    expect(oldDate.issues[0].code).toBe("invalid_date_window");

    const unclosed = parseOrganicSearchCsv(`${ORGANIC_SEARCH_INGRESS_HEADERS.join(",")}\n"unterminated`, { now: NOW });
    expect(unclosed.issues[0].code).toBe("unclosed_quote");
  });
});
