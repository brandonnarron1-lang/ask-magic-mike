import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  APPROVAL_PHRASE,
  EXPECTED_ENDPOINT_ID,
  EXPECTED_HOSTNAME,
  MIGRATION_SHA256,
  MIGRATION_VERSION,
  assertExecutionApproval,
  buildLedgerInsert,
  parseMode,
  parseProductionDatabaseUrl,
  plan,
  postgresUtilityEnv,
  redactError,
  validatePostflight,
  validatePreflight,
} from "../../scripts/phase9-outcome-production-cutover.mjs";

const productionUrl =
  "postgresql://neondb_owner:secret%21@ep-proud-bonus-autwv60g.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const runnerSource = readFileSync("scripts/phase9-outcome-production-cutover.mjs", "utf8");

function preflight(overrides: Record<string, unknown> = {}) {
  return {
    database: "neondb",
    owner: "neondb_owner",
    server_version: "18.4",
    can_create_public: true,
    leads_table: true,
    audit_logs_table: true,
    lead_outcomes_table: true,
    outcome_unique_index: true,
    outcome_unique_index_valid: true,
    migration_ledger: true,
    service_role: true,
    service_role_bypassrls: true,
    service_role_schema_usage: true,
    service_role_v1_execute: true,
    service_role_leads_select: true,
    service_role_leads_update: true,
    service_role_audit_select: true,
    service_role_audit_insert: true,
    service_role_outcomes_select: true,
    service_role_outcomes_insert: true,
    service_role_outcomes_update: true,
    v1_present: true,
    v2_present: false,
    target_migration_count: 0,
    target_outcome_count: 0,
    lead_count: 6,
    lead_status_digest: "abc123",
    backfill_eligible_count: 2,
    ledger_columns: ["version", "statements", "name"],
    ledger_required_columns: ["version"],
    missing_required_columns: [],
    ...overrides,
  };
}

describe("Phase 9 production cutover interlocks", () => {
  it("requires the exact database-specific approval phrase", () => {
    expect(assertExecutionApproval(APPROVAL_PHRASE)).toBe(true);
    expect(() => assertExecutionApproval("APPROVE PHASE 9 MERGE AND PRODUCTION DEPLOYMENT")).toThrow(
      "exact_production_approval_missing",
    );
  });

  it("defaults to the offline plan and rejects conflicting modes", () => {
    expect(parseMode([])).toBe("plan");
    expect(parseMode(["--preflight"])).toBe("preflight");
    expect(parseMode(["--execute"])).toBe("execute");
    expect(() => parseMode(["--preflight", "--execute"])).toThrow("cutover_mode_conflict");
  });

  it("accepts only the canonical unpooled Neon endpoint over TLS", () => {
    const parsed = parseProductionDatabaseUrl(productionUrl);
    expect(parsed.endpointId).toBe(EXPECTED_ENDPOINT_ID);
    expect(parsed.hostname).toBe(EXPECTED_HOSTNAME);
    expect(parsed.database).toBe("neondb");
    expect(parsed.safeIdentity).not.toHaveProperty("password");

    expect(() =>
      parseProductionDatabaseUrl(productionUrl.replace("ep-proud-bonus-autwv60g", "ep-preview-branch")),
    ).toThrow("production_database_endpoint_mismatch");
    expect(() =>
      parseProductionDatabaseUrl(productionUrl.replace(".us-east-1.", "-pooler.us-east-1.")),
    ).toThrow("production_database_must_be_unpooled");
    expect(() => parseProductionDatabaseUrl(productionUrl.replace("sslmode=require", "sslmode=disable"))).toThrow(
      "production_database_tls_required",
    );
    expect(() =>
      parseProductionDatabaseUrl(productionUrl.replace("channel_binding=require", "channel_binding=prefer")),
    ).toThrow("production_database_channel_binding_required");
    expect(() =>
      parseProductionDatabaseUrl(productionUrl.replace("us-east-1", "us-west-2")),
    ).toThrow("production_database_hostname_mismatch");
    expect(() => parseProductionDatabaseUrl(`${productionUrl}&options=-c%20search_path%3Devil`)).toThrow(
      "production_database_url_parameter_forbidden",
    );
    expect(() => parseProductionDatabaseUrl(`${productionUrl}&sslmode=disable`)).toThrow(
      "production_database_url_parameter_ambiguous",
    );
    expect(() => parseProductionDatabaseUrl(productionUrl.replace(".neon.tech/", ".neon.tech:6543/"))).toThrow(
      "production_database_port_mismatch",
    );
  });

  it("passes only operational allowlist values to PostgreSQL subprocesses", () => {
    const parsed = parseProductionDatabaseUrl(productionUrl);
    const child = postgresUtilityEnv(parsed, {
      PATH: "/opt/postgres/bin:/usr/bin",
      LANG: "C",
      OPENAI_API_KEY: "must-not-cross-process-boundary",
      SMTP_PASSWORD: "must-not-cross-process-boundary",
      AMM_PRODUCTION_APPROVAL: APPROVAL_PHRASE,
    });
    expect(child).toMatchObject({
      PATH: "/opt/postgres/bin:/usr/bin",
      LANG: "C",
      PGHOST: EXPECTED_HOSTNAME,
      PGDATABASE: "neondb",
      PGUSER: "neondb_owner",
      PGAPPNAME: "amm_phase9_outcome_cutover",
    });
    expect(child).not.toHaveProperty("OPENAI_API_KEY");
    expect(child).not.toHaveProperty("SMTP_PASSWORD");
    expect(child).not.toHaveProperty("AMM_PRODUCTION_APPROVAL");
  });

  it("builds a compatible migration-ledger insert without guessing extra columns", () => {
    const insert = buildLedgerInsert(["version", "statements", "name"]);
    expect(insert.text).toContain("supabase_migrations.schema_migrations");
    expect(insert.text).toContain("ON CONFLICT (version) DO NOTHING");
    expect(insert.text).not.toContain("\n+");
    expect(insert.params).toEqual([MIGRATION_VERSION, [], "admin_outcome_ledger"]);
    expect(() => buildLedgerInsert(["statements", "name"])).toThrow(
      "migration_ledger_version_column_missing",
    );
  });

  it("fails preflight when the target function, migration, or outcomes already exist", () => {
    expect(validatePreflight(preflight())).toMatchObject({ v2_absent: true });
    expect(() => validatePreflight(preflight({ v2_present: true }))).toThrow("v2_absent");
    expect(() => validatePreflight(preflight({ target_migration_count: 1 }))).toThrow(
      "target_migration_absent",
    );
    expect(() => validatePreflight(preflight({ target_outcome_count: 1 }))).toThrow(
      "target_outcomes_absent",
    );
  });

  it("fails preflight on schema drift or a weakened server role", () => {
    expect(() =>
      validatePreflight(preflight({ missing_required_columns: ["public.leads.closed_won_at"] })),
    ).toThrow("production_schema_required_columns_missing");
    expect(() => validatePreflight(preflight({ service_role_bypassrls: false }))).toThrow(
      "service_role_bypassrls",
    );
    expect(() => validatePreflight(preflight({ service_role_audit_select: false }))).toThrow(
      "service_role_audit_select",
    );
    expect(() => validatePreflight(preflight({ outcome_unique_index_valid: false }))).toThrow(
      "outcome_unique_index_valid",
    );
  });

  it("rejects an unfamiliar required migration-ledger column", () => {
    expect(() =>
      validatePreflight(preflight({ ledger_required_columns: ["version", "unexpected_required"] })),
    ).toThrow("migration_ledger_unsupported_required_columns");
  });

  it("proves the postflight boundary without accepting status or privilege drift", () => {
    const before = preflight();
    const after = {
      database: "neondb",
      owner: "neondb_owner",
      v1_present: true,
      v2_present: true,
      v2_owner: "neondb_owner",
      v2_security_definer: false,
      v2_search_path_locked: true,
      service_role_v1_execute: true,
      service_role_execute: true,
      public_execute: false,
      browser_role_execute_count: 0,
      target_migration_count: 1,
      lead_count: 6,
      lead_status_digest: "abc123",
      target_outcome_count: 2,
      target_flag_mismatch_count: 0,
      target_metadata_mismatch_count: 0,
      target_amount_count: 0,
    };
    expect(validatePostflight(before, after)).toMatchObject({ lead_status_unchanged: true });
    expect(() => validatePostflight(before, { ...after, public_execute: true })).toThrow(
      "public_execute_denied",
    );
    expect(() => validatePostflight(before, { ...after, lead_status_digest: "changed" })).toThrow(
      "lead_status_unchanged",
    );
    expect(() => validatePostflight(before, { ...after, v2_security_definer: true })).toThrow(
      "v2_security_invoker",
    );
    expect(() => validatePostflight(before, { ...after, v2_owner: "unexpected_owner" })).toThrow(
      "v2_owner_expected",
    );
    expect(() => validatePostflight(before, { ...after, service_role_v1_execute: false })).toThrow(
      "service_role_v1_execute",
    );
    expect(() => validatePostflight(before, { ...after, browser_role_execute_count: 1 })).toThrow(
      "browser_role_execute_denied",
    );
    expect(() => validatePostflight(before, { ...after, target_metadata_mismatch_count: 1 })).toThrow(
      "backfill_metadata_complete",
    );
  });

  it("contains the concurrency, credential-isolation, and backup hardening", () => {
    expect(runnerSource).toContain("enableChannelBinding: true");
    expect(runnerSource).toContain("pg_try_advisory_xact_lock");
    expect(runnerSource).toContain(
      "LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE",
    );
    expect(runnerSource).toContain('const childEnv = {}');
    expect(runnerSource).not.toContain("const childEnv = { ...process.env }");
    expect(runnerSource).toContain("createReadStream(file)");
    expect(runnerSource).toContain("error.backup = backup");
  });

  it("keeps secrets out of the offline plan and error strings", () => {
    const output = JSON.stringify(plan());
    expect(output).toContain(MIGRATION_SHA256);
    expect(output).toContain("20260819223000_admin_outcome_ledger.sql");
    expect(output).not.toContain("secret!");
    expect(redactError(`failed ${productionUrl}`)).toContain("[REDACTED_DATABASE_URL]");
    expect(redactError(`failed ${productionUrl}`)).not.toContain("secret%21");
  });
});
