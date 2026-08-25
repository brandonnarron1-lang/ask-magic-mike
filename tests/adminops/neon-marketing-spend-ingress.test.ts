import { describe, expect, it, vi } from "vitest";
import {
  SPEND_INGRESS_CONFIRMATION,
  SPEND_INGRESS_HEADERS,
  SYNTHETIC_SPEND_CSV,
  parseMarketingSpendCsv,
} from "../../app/lib/growth/spend-ingress";
import {
  importMarketingSpendCsv,
  loadMarketingSpendIngressState,
} from "../../app/lib/persistence/neonMarketingSpendIngress";

const NOW = new Date("2026-08-24T16:00:00.000Z");
const PREVIEW_ENDPOINT = "ep-amm-preview-qa123456";
const PRODUCTION_ENDPOINT = "ep-amm-production-qa654321";
const PROD_ENV = {
  GROWTH_SPEND_IMPORT_ENABLED: "true",
  DATABASE_URL: `postgresql://${PRODUCTION_ENDPOINT}.us-east-2.aws.neon.tech/neondb`,
  VERCEL_ENV: "production",
  DATABASE_ENV: "production",
  PREVIEW_NEON_ENDPOINT_ID: PREVIEW_ENDPOINT,
  PRODUCTION_NEON_ENDPOINT_ID: PRODUCTION_ENDPOINT,
};

const REAL_ROW = [
  "2026-08-20", "google_ads", "Google Ads", "google", "search", "cpc",
  "wilson_seller_review", "Wilson Seller Review", "active", "123456789",
  "google", "cpc", "wilson_seller_review", "125.45", "2500", "85", "4", "1",
  "google_ads_export",
].join(",");
const REAL_CSV = `${SPEND_INGRESS_HEADERS.join(",")}\n${REAL_ROW}`;

function input(overrides: Partial<Parameters<typeof importMarketingSpendCsv>[0]> = {}) {
  const preview = parseMarketingSpendCsv(REAL_CSV, { now: NOW });
  if (!preview.batchFingerprint) throw new Error("fixture invalid");
  return {
    csv: REAL_CSV,
    batchFingerprint: preview.batchFingerprint,
    approvalReference: "Google Ads report 2026-08-20",
    confirmation: SPEND_INGRESS_CONFIRMATION,
    actor: "lead-center:synthetic-operator",
    ...overrides,
  };
}

describe("canonical Neon marketing-spend ingress", () => {
  it("revalidates and commits only through the atomic database function", async () => {
    const query = { query: vi.fn(async (statement: string, _params?: unknown[]) => {
      if (statement.includes("to_regclass")) return [{ has_receipts: true, has_function: true }];
      if (statement.includes("import_marketing_spend_batch_v1")) return [{ result: {
        ok: true,
        batch_id: "11111111-1111-4111-8111-111111111111",
        audit_id: "22222222-2222-4222-8222-222222222222",
        idempotent_replay: false,
        row_count: 1,
        inserted_rows: 1,
        updated_rows: 0,
        unchanged_rows: 0,
      } }];
      return [];
    }) };

    const result = await importMarketingSpendCsv(input(), { query, env: PROD_ENV, now: NOW });
    expect(result).toMatchObject({
      ok: true,
      idempotentReplay: false,
      rowCount: 1,
      insertedRows: 1,
      updatedRows: 0,
      unchangedRows: 0,
    });
    expect(query.query).toHaveBeenCalledTimes(2);
    const mutationCall = query.query.mock.calls[1];
    expect(mutationCall[0]).toContain("import_marketing_spend_batch_v1");
    expect(JSON.stringify(mutationCall[1])).not.toContain(REAL_CSV);
    expect(String(mutationCall[1]?.[1])).toContain('"row_fingerprint"');
    expect(String(mutationCall[1]?.[1])).not.toContain('"raw_csv"');
  });

  it("fails closed before database access when disabled, read-only, wrong-database, synthetic, stale, or unconfirmed", async () => {
    const query = { query: vi.fn() };
    await expect(importMarketingSpendCsv(input(), {
      query,
      env: { ...PROD_ENV, GROWTH_SPEND_IMPORT_ENABLED: "false" },
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "spend_import_disabled" });

    await expect(importMarketingSpendCsv(input(), {
      query,
      env: {
        ...PROD_ENV,
        VERCEL_ENV: "preview",
        DATABASE_ENV: "preview",
        PREVIEW_DATA_MODE: "disabled",
        ALLOW_PREVIEW_DB_MUTATION: "false",
      },
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "preview_data_disabled" });

    await expect(importMarketingSpendCsv(input(), {
      query,
      env: {
        ...PROD_ENV,
        DATABASE_URL: `postgresql://${PREVIEW_ENDPOINT}.us-east-2.aws.neon.tech/neondb`,
      },
      now: NOW,
    })).resolves.toMatchObject({
      ok: false,
      error: "spend_production_database_identity_unconfirmed",
    });

    const synthetic = parseMarketingSpendCsv(SYNTHETIC_SPEND_CSV, { now: NOW });
    await expect(importMarketingSpendCsv(input({
      csv: SYNTHETIC_SPEND_CSV,
      batchFingerprint: synthetic.batchFingerprint || "",
    }), { query, env: PROD_ENV, now: NOW })).resolves.toMatchObject({
      ok: false,
      error: "synthetic_spend_not_importable",
    });

    await expect(importMarketingSpendCsv(input({ batchFingerprint: "0".repeat(64) }), {
      query, env: PROD_ENV, now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "spend_preview_changed" });

    await expect(importMarketingSpendCsv(input({ confirmation: "yes" }), {
      query, env: PROD_ENV, now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "spend_confirmation_required" });
    expect(query.query).not.toHaveBeenCalled();
  });

  it("maps database identity conflicts without leaking database details", async () => {
    const query = { query: vi.fn(async (statement: string) =>
      statement.includes("to_regclass")
        ? [{ has_receipts: true, has_function: true }]
        : [{ result: { ok: false, error: "existing_campaign_identity_conflict" } }],
    ) };
    await expect(importMarketingSpendCsv(input(), { query, env: PROD_ENV, now: NOW }))
      .resolves.toMatchObject({ ok: false, statusCode: 409, error: "existing_campaign_identity_conflict" });
  });

  it("loads only minimized durable receipts when the schema exists", async () => {
    const query = { query: vi.fn(async (statement: string) => {
      if (statement.includes("to_regclass")) return [{ has_receipts: true, has_function: true }];
      return [{
        id: "11111111-1111-4111-8111-111111111111",
        batch_fingerprint: "a".repeat(64),
        row_count: 2,
        inserted_rows: 1,
        updated_rows: 1,
        unchanged_rows: 0,
        spend_usd_total: "250.00",
        date_start: "2026-08-19",
        date_end: "2026-08-20",
        source_systems: ["google_ads_export"],
        approval_reference: "report-123",
        imported_by: "lead-center:operator",
        audit_id: "22222222-2222-4222-8222-222222222222",
        created_at: "2026-08-24T16:00:00Z",
      }];
    }) };
    const state = await loadMarketingSpendIngressState({ query, env: PROD_ENV });
    expect(state).toMatchObject({
      configured: true,
      schemaReady: true,
      importEnabled: true,
      mutationAllowed: true,
      readIdentityConfirmed: true,
      productionIdentityConfirmed: true,
      receipts: [{ rowCount: 2, spendUsdTotal: 250, sourceSystems: ["google_ads_export"] }],
    });
    expect(JSON.stringify(state)).not.toContain("raw_csv");
  });

  it("does not query an unattested or cross-project database even for protected receipt reads", async () => {
    const query = { query: vi.fn() };
    const state = await loadMarketingSpendIngressState({
      query,
      env: {
        ...PROD_ENV,
        DATABASE_URL: `postgresql://${PREVIEW_ENDPOINT}.us-east-2.aws.neon.tech/neondb`,
      },
    });
    expect(state).toMatchObject({
      configured: true,
      schemaReady: false,
      readIdentityConfirmed: false,
      productionIdentityConfirmed: false,
      error: "spend_database_identity_unconfirmed",
    });
    expect(query.query).not.toHaveBeenCalled();
  });
});
