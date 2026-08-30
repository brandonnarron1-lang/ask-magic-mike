import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildLegacyWordpressReconciliation,
  normalizeDatabaseEmail,
  normalizeDatabasePhone,
  normalizeDatabasePropertyIdentity,
  parseLegacyWordpressCsv,
} from "../../scripts/lib/wordpress-legacy-reconciliation.mjs";
import {
  attestDatabaseIdentity,
  parseArgs,
} from "../../scripts/reconcile-wordpress-leads.mjs";

const CSV = `ID,Name,Email,Phone,Property Address,Message
11,Synthetic One,ONE@EXAMPLE.TEST,(252) 555-0101,100 Test St,ignored secret message
12,Synthetic Two,two@example.test,,200 Test Road,ignored
13,Synthetic Three,three@example.test,252-555-0103,300 Test Avenue,ignored
14,Synthetic Four,split@example.test,252-555-0104,400 Test Drive,ignored
15,Synthetic Duplicate,ONE@EXAMPLE.TEST,,500 Test Lane,ignored
16,Synthetic Missing,,,600 Test Court,ignored`;

const CANONICAL = [
  {
    lead_id: "00000000-0000-4000-8000-000000000001",
    normalized_email: "one@example.test",
    normalized_phone: "2525550101",
    normalized_address: "100 test st",
    is_duplicate: false,
  },
  {
    lead_id: "00000000-0000-4000-8000-000000000002",
    normalized_email: "two@example.test",
    normalized_phone: null,
    normalized_address: "200 test road",
    is_duplicate: false,
  },
  {
    lead_id: "00000000-0000-4000-8000-000000000003",
    normalized_email: "split@example.test",
    normalized_phone: null,
    normalized_address: "400 test drive",
    is_duplicate: false,
  },
  {
    lead_id: "00000000-0000-4000-8000-000000000004",
    normalized_email: null,
    normalized_phone: "2525550104",
    normalized_address: "400 test drive",
    is_duplicate: false,
  },
];

describe("WordPress legacy CSV contract", () => {
  it("matches the database normalization contract", () => {
    expect(normalizeDatabaseEmail(" ONE@Example.Test ")).toBe("one@example.test");
    expect(normalizeDatabasePhone("+1 (252) 555-0101")).toBe("2525550101");
    expect(normalizeDatabasePropertyIdentity(" 100 Test St., Apt #2 ")).toBe("100 test st apt 2");
  });

  it("retains only identity fields required for the dry-run", () => {
    const parsed = parseLegacyWordpressCsv(CSV);
    expect(parsed.rows).toHaveLength(6);
    expect(parsed.rows[0]).toEqual({
      wordpressRowId: "11",
      normalizedEmail: "one@example.test",
      normalizedPhone: "2525550101",
      normalizedAddress: "100 test st",
    });
    expect(JSON.stringify(parsed)).not.toContain("Synthetic One");
    expect(JSON.stringify(parsed)).not.toContain("ignored secret message");
  });

  it("refuses missing identity headers, duplicate IDs, and null bytes", () => {
    expect(() => parseLegacyWordpressCsv("id,name\n1,test")).toThrow("missing_email_and_phone_headers");
    expect(() => parseLegacyWordpressCsv("id,email\n1,a@example.test\n1,b@example.test")).toThrow("duplicate_wordpress_row_id_1");
    expect(() => parseLegacyWordpressCsv("id,email\n1,a@example.test\u0000")).toThrow("legacy_csv_null_byte");
  });
});

describe("WordPress legacy reconciliation", () => {
  it("produces a PII-free, no-write decision packet", () => {
    const local = parseLegacyWordpressCsv(CSV).rows;
    const report = buildLegacyWordpressReconciliation(local, CANONICAL);
    expect(report).toMatchObject({
      mode: "dry_run_read_only",
      output_contains_contact_values: false,
      database_writes: 0,
      provider_calls: 0,
      alert: true,
      summary: {
        wordpress_rows: 6,
        matched_candidates: 2,
        operator_review: 1,
        unmatched_import_candidates: 1,
        split_identity_conflicts: 1,
        insufficient_identity: 1,
        local_duplicate_rows: 2,
      },
    });
    expect(report.rows.find((row: { wordpress_row_id: string }) => row.wordpress_row_id === "11")).toMatchObject({
      classification: "matched_candidate",
      confidence: 100,
      match_reasons: ["email_match", "phone_match", "address_corroboration"],
      local_duplicate_row_ids: ["15"],
    });
    expect(report.rows.find((row: { wordpress_row_id: string }) => row.wordpress_row_id === "14")).toMatchObject({
      classification: "split_identity_conflict",
      matched_canonical_lead_id: null,
    });
    const serialized = JSON.stringify(report);
    for (const forbidden of ["one@example.test", "2525550101", "100 test st", "ignored secret message"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("refuses ambiguous canonical identities", () => {
    const local = parseLegacyWordpressCsv("id,email\n21,ambiguous@example.test").rows;
    const report = buildLegacyWordpressReconciliation(local, [
      { lead_id: "a", normalized_email: "ambiguous@example.test" },
      { lead_id: "b", normalized_email: "ambiguous@example.test" },
    ]);
    expect(report.rows[0]).toMatchObject({
      classification: "ambiguous_canonical_match",
      candidate_canonical_lead_ids: ["a", "b"],
    });
  });
});

describe("WordPress reconciliation CLI guards", () => {
  it("parses only the supported read-only mode", () => {
    expect(parseArgs([])).toEqual({ legacyCsv: null, help: false });
    expect(parseArgs(["--legacy-csv", "/private/input.csv"])).toEqual({
      legacyCsv: "/private/input.csv",
      help: false,
    });
    expect(parseArgs(["--", "--legacy-csv", "/private/input.csv"])).toEqual({
      legacyCsv: "/private/input.csv",
      help: false,
    });
    expect(() => parseArgs(["--execute"])).toThrow("unknown_argument_--execute");
  });

  it("requires exact Production endpoint attestation for legacy reconciliation", () => {
    const url = "postgresql://user:secret@ep-canonical.example.neon.tech/neondb?sslmode=require";
    expect(attestDatabaseIdentity(url, {
      DATABASE_ENV: "production",
      PRODUCTION_NEON_ENDPOINT_ID: "ep-canonical",
    }, true)).toMatchObject({ endpoint_id: "ep-canonical", endpoint_attested: true });
    expect(() => attestDatabaseIdentity(url, {
      DATABASE_ENV: "preview",
      PRODUCTION_NEON_ENDPOINT_ID: "ep-canonical",
    }, true)).toThrow("database_env_not_production");
    expect(() => attestDatabaseIdentity(url, {
      DATABASE_ENV: "production",
      PRODUCTION_NEON_ENDPOINT_ID: "ep-other",
    }, true)).toThrow("production_neon_endpoint_mismatch");
  });

  it("keeps every database operation inside a bounded read-only transaction", () => {
    const source = readFileSync("scripts/reconcile-wordpress-leads.mjs", "utf8");
    expect(source).toContain('client.query("BEGIN TRANSACTION READ ONLY")');
    expect(source).toContain("SET LOCAL lock_timeout = '5s'");
    expect(source).toContain("SET LOCAL statement_timeout = '30s'");
    expect(source).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|DROP|CREATE)\b\s+(?:INTO|TABLE|FROM)/i);
  });
});
