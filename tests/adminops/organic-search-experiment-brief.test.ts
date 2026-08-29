import { describe, expect, it } from "vitest";

import {
  buildOrganicSearchExperimentBrief,
  formatOrganicSearchExperimentBrief,
  ORGANIC_SEARCH_EXPERIMENT_BRIEF_VERSION,
} from "../../app/lib/growth/organic-search-experiment-brief";
import {
  ORGANIC_SEARCH_INGRESS_HEADERS,
  parseOrganicSearchCsv,
  type OrganicSearchImportRow,
} from "../../app/lib/growth/organic-search-ingress";

const NOW = new Date("2026-08-28T16:00:00.000Z");

function row(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    start_date: "2026-08-01",
    end_date: "2026-08-20",
    site_property: "sc-domain:askmagicmike.com",
    search_type: "web",
    data_state: "final",
    country: "ALL",
    device: "all",
    page: "https://www.askmagicmike.com/home-value",
    clicks: "12",
    impressions: "1200",
    ctr: "1%",
    position: "7.2",
    source_system: "google_search_console_csv",
    ...overrides,
  };
  const csv = `${ORGANIC_SEARCH_INGRESS_HEADERS.join(",")}\n${ORGANIC_SEARCH_INGRESS_HEADERS.map((header) => values[header]).join(",")}`;
  const preview = parseOrganicSearchCsv(csv, { now: NOW });
  expect(preview.ok).toBe(true);
  return preview.rows[0];
}

describe("organic-search experiment briefs", () => {
  it("turns a validated click-capture signal into a bounded internal decision packet", () => {
    const brief = buildOrganicSearchExperimentBrief(row());

    expect(brief).toMatchObject({
      version: ORGANIC_SEARCH_EXPERIMENT_BRIEF_VERSION,
      status: "internal_review_only",
      pageUrl: "https://www.askmagicmike.com/home-value",
      opportunityType: "organic_click_capture_gap",
      primaryMetric: {
        key: "organic_ctr",
        baseline: "1.00%",
      },
      evidence: {
        window: "2026-08-01 to 2026-08-20",
        impressions: 1200,
        clicks: 12,
        ctr: 0.01,
        averagePosition: 7.2,
        policyCtrThreshold: 0.02,
        coverage: "operator_export_not_guaranteed_exhaustive",
      },
    });
    expect(brief?.readerTask).toContain("broker-reviewed home-value");
    expect(brief?.requiredInputs.join(" ")).toContain("query text is not retained");
    expect(brief?.guardrails.join(" ")).toContain("No protected-class data");
    expect(brief?.authority).toContain("does not authorize a WordPress edit");
    expect(brief?.references.every((reference) =>
      reference.href.startsWith("https://developers.google.com/") ||
      reference.href.startsWith("https://support.google.com/")
    )).toBe(true);
  });

  it("uses type-specific objectives and primary metrics without promising rankings", () => {
    const pageOne = buildOrganicSearchExperimentBrief(row({
      page: "https://www.askmagicmike.com/sell",
      clicks: "18",
      impressions: "900",
      ctr: "2%",
      position: "14.4",
    }));
    const visibility = buildOrganicSearchExperimentBrief(row({
      page: "https://www.askmagicmike.com/ask",
      clicks: "5",
      impressions: "500",
      ctr: "1%",
      position: "26.4",
    }));

    expect(pageOne).toMatchObject({
      opportunityType: "organic_page_one_gap",
      primaryMetric: { key: "organic_clicks", baseline: "18" },
    });
    expect(pageOne?.singleChangeScope).toContain("existing canonical page");
    expect(visibility).toMatchObject({
      opportunityType: "organic_visibility_gap",
      primaryMetric: { key: "organic_impressions", baseline: "500" },
    });
    expect(JSON.stringify([pageOne, visibility])).not.toMatch(/will rank|guaranteed page one|guaranteed ranking/i);
  });

  it("formats a complete copyable brief with evidence, review, measurement, and authority", () => {
    const brief = buildOrganicSearchExperimentBrief(row());
    expect(brief).not.toBeNull();
    const markdown = formatOrganicSearchExperimentBrief(brief!);

    expect(markdown).toContain("Status: INTERNAL REVIEW ONLY");
    expect(markdown).toContain("## Source evidence");
    expect(markdown).toContain("## Required owner inputs");
    expect(markdown).toContain("## Measurement");
    expect(markdown).toContain("## Guardrails");
    expect(markdown).toContain("## Stop conditions");
    expect(markdown).toContain("## Authority");
    expect(markdown).toContain("No AI/provider call");
    expect(markdown).not.toMatch(/publish now|will rank|guaranteed page one|private@example|provider_payload/i);
  });

  it("fails closed for foreign, parameterized, inconsistent, malformed, or unscored rows", () => {
    const valid = row();
    const cases: OrganicSearchImportRow[] = [
      { ...valid, pageUrl: "https://nellyselly.com/home-value", pageHost: "nellyselly.com" },
      { ...valid, pageHost: "askmagicmike.com" },
      { ...valid, pageUrl: "https://www.askmagicmike.com/home-value?email=private@example.com" },
      { ...valid, pagePath: "/sell" },
      { ...valid, rowFingerprint: "not-a-fingerprint" },
      { ...valid, startDate: "2026-02-31" },
      { ...valid, clicks: valid.impressions + 1 },
      { ...valid, dataState: "forged" as OrganicSearchImportRow["dataState"] },
      { ...valid, device: "television" as OrganicSearchImportRow["device"] },
      { ...valid, opportunity: { ...valid.opportunity!, score: 78.5 } },
      { ...valid, opportunity: null },
    ];

    expect(cases.map(buildOrganicSearchExperimentBrief)).toEqual(cases.map(() => null));
  });

  it("is deterministic and carries no raw query, consumer PII, provider payload, or execution authority", () => {
    const input = row();
    const first = buildOrganicSearchExperimentBrief(input);
    const second = buildOrganicSearchExperimentBrief(structuredClone(input));

    expect(second).toEqual(first);
    const serialized = JSON.stringify(first);
    expect(serialized).not.toMatch(/query_text|consumer_email|provider_payload|private@example/i);
    expect(serialized).toContain("No AI/provider call");
    expect(serialized).toContain("No raw query");
    expect(serialized).toContain("does not authorize");
  });
});
