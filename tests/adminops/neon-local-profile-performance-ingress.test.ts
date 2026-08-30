import { describe, expect, it, vi } from "vitest";
import {
  LOCAL_PROFILE_PERFORMANCE_INGRESS_CONFIRMATION,
  LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS,
  SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV,
  parseLocalProfilePerformanceCsv,
} from "../../app/lib/growth/local-profile-performance-ingress";
import {
  importLocalProfilePerformanceCsv,
  loadLocalProfilePerformanceIngressState,
} from "../../app/lib/persistence/neonLocalProfilePerformanceIngress";

const NOW = new Date("2026-08-24T20:00:00.000Z");
const PREVIEW_ENDPOINT = "ep-amm-preview-qa123456";
const PRODUCTION_ENDPOINT = "ep-amm-production-qa654321";
const PROD_ENV = {
  GROWTH_LOCAL_PROFILE_IMPORT_ENABLED: "true",
  DATABASE_URL: `postgresql://${PRODUCTION_ENDPOINT}.us-east-2.aws.neon.tech/neondb`,
  VERCEL_ENV: "production",
  DATABASE_ENV: "production",
  PREVIEW_NEON_ENDPOINT_ID: PREVIEW_ENDPOINT,
  PRODUCTION_NEON_ENDPOINT_ID: PRODUCTION_ENDPOINT,
};

const REAL_CSV = `${LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS.join(",")}\n${[
  "2026-08-01,2026-08-20,ourtown_properties_primary,final,business_impressions_mobile_search,1200,google_business_profile_report",
  "2026-08-01,2026-08-20,ourtown_properties_primary,final,business_impressions_desktop_search,300,google_business_profile_report",
  "2026-08-01,2026-08-20,ourtown_properties_primary,final,website_clicks,3,google_business_profile_report",
  "2026-08-01,2026-08-20,ourtown_properties_primary,final,call_clicks,2,google_business_profile_report",
  "2026-08-01,2026-08-20,ourtown_properties_primary,final,business_direction_requests,1,google_business_profile_report",
].join("\n")}`;

function input(overrides: Partial<Parameters<typeof importLocalProfilePerformanceCsv>[0]> = {}) {
  const preview = parseLocalProfilePerformanceCsv(REAL_CSV, { now: NOW });
  if (!preview.batchFingerprint) throw new Error("fixture invalid");
  return {
    csv: REAL_CSV,
    batchFingerprint: preview.batchFingerprint,
    approvalReference: "GBP Performance 2026-08-01 through 2026-08-20",
    confirmation: LOCAL_PROFILE_PERFORMANCE_INGRESS_CONFIRMATION,
    actor: "lead-center:synthetic-operator",
    ...overrides,
  };
}

describe("canonical Neon local-profile performance ingress", () => {
  it("revalidates and commits only through the atomic owner-connected function", async () => {
    const query = { query: vi.fn(async (statement: string, _params?: unknown[]) => {
      if (statement.includes("to_regclass")) return [{
        has_signals: true,
        has_opportunities: true,
        has_receipts: true,
        has_function: true,
      }];
      if (statement.includes("import_local_profile_performance_batch_v1")) return [{ result: {
        ok: true,
        batch_id: "11111111-1111-4111-8111-111111111111",
        audit_id: "22222222-2222-4222-8222-222222222222",
        idempotent_replay: false,
        row_count: 5,
        inserted_signals: 5,
        updated_signals: 0,
        unchanged_signals: 0,
        inserted_opportunities: 1,
        updated_opportunities: 0,
        unchanged_opportunities: 0,
      } }];
      return [];
    }) };

    const result = await importLocalProfilePerformanceCsv(input(), { query, env: PROD_ENV, now: NOW });
    expect(result).toMatchObject({
      ok: true,
      rowCount: 5,
      insertedSignals: 5,
      insertedOpportunities: 1,
    });
    const functionCall = query.query.mock.calls.find(([statement]) =>
      String(statement).includes("SELECT public.import_local_profile_performance_batch_v1"));
    expect(functionCall).toBeTruthy();
    const params = functionCall?.[1] as unknown[] | undefined;
    expect(String(params?.[1])).toContain("google_business_profile_report");
    expect(String(params?.[2])).toContain("interactions_total");
    expect(JSON.stringify(params)).not.toContain(REAL_CSV);
    expect(JSON.stringify(params)).not.toMatch(/search_keyword|location_id|oauth|customer_email/i);
  });

  it("fails closed for disabled gate, Preview runtime, or wrong Production endpoint", async () => {
    const query = { query: vi.fn() };
    await expect(importLocalProfilePerformanceCsv(input(), {
      query,
      env: { ...PROD_ENV, GROWTH_LOCAL_PROFILE_IMPORT_ENABLED: "false" },
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "local_profile_import_disabled" });

    await expect(importLocalProfilePerformanceCsv(input(), {
      query,
      env: {
        ...PROD_ENV,
        VERCEL_ENV: "preview",
        DATABASE_ENV: "preview",
        PREVIEW_DATA_MODE: "disabled",
      },
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "preview_data_disabled" });

    await expect(importLocalProfilePerformanceCsv(input(), {
      query,
      env: { ...PROD_ENV, DATABASE_URL: `postgresql://${PREVIEW_ENDPOINT}.aws.neon.tech/neondb` },
      now: NOW,
    })).resolves.toMatchObject({
      ok: false,
      error: "local_profile_production_database_identity_unconfirmed",
    });
    expect(query.query).not.toHaveBeenCalled();
  });

  it("rejects synthetic rows, stale fingerprints, and missing confirmation before database work", async () => {
    const query = { query: vi.fn() };
    const synthetic = parseLocalProfilePerformanceCsv(SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV, { now: NOW });
    expect(synthetic.batchFingerprint).toBeTruthy();
    await expect(importLocalProfilePerformanceCsv({
      ...input(),
      csv: SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV,
      batchFingerprint: synthetic.batchFingerprint ?? "",
    }, { query, env: PROD_ENV, now: NOW })).resolves.toMatchObject({
      ok: false,
      error: "synthetic_local_profile_not_importable",
    });

    await expect(importLocalProfilePerformanceCsv(input({ batchFingerprint: "a".repeat(64) }), {
      query,
      env: PROD_ENV,
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "local_profile_preview_changed" });

    await expect(importLocalProfilePerformanceCsv(input({ confirmation: "yes" }), {
      query,
      env: PROD_ENV,
      now: NOW,
    })).resolves.toMatchObject({ ok: false, error: "local_profile_confirmation_required" });
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
        row_count: 5,
        inserted_signals: 5,
        updated_signals: 0,
        unchanged_signals: 0,
        inserted_opportunities: 1,
        updated_opportunities: 0,
        unchanged_opportunities: 0,
        impressions_total: 1500,
        interactions_total: 6,
        interaction_rate: "0.00400000",
        website_clicks: 3,
        call_clicks: 2,
        direction_requests: 1,
        conversations: 0,
        bookings: 0,
        date_start: "2026-08-01",
        date_end: "2026-08-20",
        profile_key: "ourtown_properties_primary",
        data_state: "final",
        approval_reference: "GBP report",
        imported_by: "lead-center:operator",
        audit_id: "22222222-2222-4222-8222-222222222222",
        created_at: "2026-08-24T20:00:00.000Z",
      }];
    }) };
    const state = await loadLocalProfilePerformanceIngressState({ query, env: PROD_ENV });
    expect(state).toMatchObject({
      configured: true,
      schemaReady: true,
      importEnabled: true,
      readIdentityConfirmed: true,
      productionIdentityConfirmed: true,
      receipts: [{ rowCount: 5, impressionsTotal: 1500, interactionRate: 0.004 }],
    });
  });
});
