import { describe, expect, it, vi } from "vitest";
import {
  ORGANIC_SEARCH_INGRESS_CONFIRMATION,
  ORGANIC_SEARCH_INGRESS_HEADERS,
  SYNTHETIC_ORGANIC_SEARCH_CSV,
  parseOrganicSearchCsv,
} from "../../app/lib/growth/organic-search-ingress";
import {
  importOrganicSearchCsv,
  loadOrganicSearchIngressState,
} from "../../app/lib/persistence/neonOrganicSearchIngress";

const NOW = new Date("2026-08-24T16:00:00.000Z");
const PREVIEW_ENDPOINT = "ep-amm-preview-qa123456";
const PRODUCTION_ENDPOINT = "ep-amm-production-qa654321";
const PROD_ENV = {
  GROWTH_SEARCH_IMPORT_ENABLED: "true",
  DATABASE_URL: `postgresql://${PRODUCTION_ENDPOINT}.us-east-2.aws.neon.tech/neondb`,
  VERCEL_ENV: "production",
  DATABASE_ENV: "production",
  PREVIEW_NEON_ENDPOINT_ID: PREVIEW_ENDPOINT,
  PRODUCTION_NEON_ENDPOINT_ID: PRODUCTION_ENDPOINT,
};

const REAL_ROW = [
  "2026-08-01", "2026-08-20", "sc-domain:askmagicmike.com", "web", "final",
  "ALL", "all", "https://www.askmagicmike.com/home-value", "12", "1200", "1%",
  "7.2", "google_search_console_csv",
].join(",");
const REAL_CSV = `${ORGANIC_SEARCH_INGRESS_HEADERS.join(",")}\n${REAL_ROW}`;

function input(overrides: Partial<Parameters<typeof importOrganicSearchCsv>[0]> = {}) {
  const preview = parseOrganicSearchCsv(REAL_CSV, { now: NOW });
  if (!preview.batchFingerprint) throw new Error("fixture invalid");
  return {
    csv: REAL_CSV,
    batchFingerprint: preview.batchFingerprint,
    approvalReference: "GSC Pages 2026-08-01 through 2026-08-20",
    confirmation: ORGANIC_SEARCH_INGRESS_CONFIRMATION,
    actor: "lead-center:synthetic-operator",
    ...overrides,
  };
}

describe("canonical Neon organic-search ingress", () => {
  it("revalidates and commits only through the atomic owner-connected function", async () => {
    const query = { query: vi.fn(async (statement: string, _params?: unknown[]) => {
      if (statement.includes("to_regclass")) return [{
        has_signals: true,
        has_opportunities: true,
        has_receipts: true,
        has_function: true,
      }];
      if (statement.includes("import_organic_search_batch_v1")) return [{ result: {
        ok: true,
        batch_id: "11111111-1111-4111-8111-111111111111",
        audit_id: "22222222-2222-4222-8222-222222222222",
        idempotent_replay: false,
        row_count: 1,
        inserted_signals: 1,
        updated_signals: 0,
        unchanged_signals: 0,
        opportunity_rows: 1,
        inserted_opportunities: 1,
        updated_opportunities: 0,
        unchanged_opportunities: 0,
      } }];
      return [];
    }) };

    const result = await importOrganicSearchCsv(input(), { query, env: PROD_ENV, now: NOW });
    expect(result).toMatchObject({
      ok: true,
      rowCount: 1,
      insertedSignals: 1,
      opportunityRows: 1,
      insertedOpportunities: 1,
    });
    const functionCall = query.query.mock.calls.find(([statement]) =>
      String(statement).includes("SELECT public.import_organic_search_batch_v1"));
    expect(functionCall).toBeTruthy();
    const serializedRows = String((functionCall?.[1] as unknown[] | undefined)?.[1]);
    expect(serializedRows).toContain("google_search_console_csv");
    expect(serializedRows).not.toContain("raw_queries_retained");
    expect(serializedRows).not.toMatch(/"query"|query_text|search_query/);
    expect(serializedRows).not.toContain(REAL_CSV);
  });

  it("fails closed for disabled gate, Preview runtime, or wrong Production endpoint", async () => {
    const query = { query: vi.fn() };
    await expect(importOrganicSearchCsv(input(), {
      query,
      env: { ...PROD_ENV, GROWTH_SEARCH_IMPORT_ENABLED: "false" },
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "organic_search_import_disabled" });

    await expect(importOrganicSearchCsv(input(), {
      query,
      env: {
        ...PROD_ENV,
        VERCEL_ENV: "preview",
        DATABASE_ENV: "preview",
        PREVIEW_DATA_MODE: "disabled",
      },
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "preview_data_disabled" });

    await expect(importOrganicSearchCsv(input(), {
      query,
      env: { ...PROD_ENV, DATABASE_URL: `postgresql://${PREVIEW_ENDPOINT}.aws.neon.tech/neondb` },
      now: NOW,
    })).resolves.toMatchObject({
      ok: false,
      error: "organic_search_production_database_identity_unconfirmed",
    });
    expect(query.query).not.toHaveBeenCalled();
  });

  it("rejects synthetic rows, stale fingerprints, and missing confirmation before database work", async () => {
    const query = { query: vi.fn() };
    const synthetic = parseOrganicSearchCsv(SYNTHETIC_ORGANIC_SEARCH_CSV, { now: NOW });
    expect(synthetic.batchFingerprint).toBeTruthy();
    await expect(importOrganicSearchCsv({
      ...input(),
      csv: SYNTHETIC_ORGANIC_SEARCH_CSV,
      batchFingerprint: synthetic.batchFingerprint ?? "",
    }, { query, env: PROD_ENV, now: NOW })).resolves.toMatchObject({
      ok: false,
      error: "synthetic_organic_search_not_importable",
    });

    await expect(importOrganicSearchCsv(input({ batchFingerprint: "a".repeat(64) }), {
      query,
      env: PROD_ENV,
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "organic_search_preview_changed" });

    await expect(importOrganicSearchCsv(input({ confirmation: "yes" }), {
      query,
      env: PROD_ENV,
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "organic_search_confirmation_required" });
    expect(query.query).not.toHaveBeenCalled();
  });

  it("loads minimized receipts only after exact read identity and schema attestation", async () => {
    const query = { query: vi.fn(async (statement: string) => {
      if (statement.includes("to_regclass")) return [{
        has_signals: true,
        has_opportunities: true,
        has_receipts: true,
        has_function: true,
      }];
      return [{
        id: "11111111-1111-4111-8111-111111111111",
        batch_fingerprint: "b".repeat(64),
        row_count: 2,
        inserted_signals: 2,
        updated_signals: 0,
        unchanged_signals: 0,
        opportunity_rows: 1,
        inserted_opportunities: 1,
        updated_opportunities: 0,
        unchanged_opportunities: 0,
        impressions_total: 2100,
        clicks_total: 21,
        ctr_total: "0.01000000",
        date_start: "2026-08-01",
        date_end: "2026-08-20",
        site_properties: ["sc-domain:askmagicmike.com"],
        page_hosts: ["www.askmagicmike.com"],
        approval_reference: "GSC export",
        imported_by: "lead-center:operator",
        audit_id: "22222222-2222-4222-8222-222222222222",
        created_at: "2026-08-24T16:00:00.000Z",
      }];
    }) };
    const state = await loadOrganicSearchIngressState({ query, env: PROD_ENV });
    expect(state).toMatchObject({
      configured: true,
      schemaReady: true,
      importEnabled: true,
      readIdentityConfirmed: true,
      productionIdentityConfirmed: true,
      receipts: [{ rowCount: 2, impressionsTotal: 2100, ctrTotal: 0.01 }],
    });
  });
});
