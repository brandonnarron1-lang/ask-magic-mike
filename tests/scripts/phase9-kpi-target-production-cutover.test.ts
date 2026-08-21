import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  APPROVAL_PHRASE,
  MIGRATION_FILE,
  MIGRATION_SHA256,
  MIGRATION_VERSION,
  assertExecutionApproval,
  migrationSource,
  plan,
  validatePostflight,
  validatePreflight,
} from "../../scripts/phase9-kpi-target-production-cutover.mjs";

const runnerSource = readFileSync(
  "scripts/phase9-kpi-target-production-cutover.mjs",
  "utf8",
);

function preflight(overrides: Record<string, unknown> = {}) {
  return {
    database: "neondb",
    owner: "neondb_owner",
    server_version: "18.4",
    can_create_public: true,
    leads_table: true,
    audit_logs_table: true,
    immutable_function: true,
    first_response_table: true,
    publication_proof_table: true,
    publication_proof_migration_count: 1,
    migration_ledger: true,
    service_role: true,
    service_role_bypassrls: true,
    service_role_schema_usage: true,
    service_role_audit_select: true,
    service_role_audit_insert: true,
    target_table_present: false,
    target_function_present: false,
    target_migration_count: 0,
    lead_count: 6,
    lead_state_digest: "lead-state",
    audit_count: 17,
    audit_state_digest: "audit-state",
    ledger_columns: ["version", "statements", "name"],
    ledger_required_columns: ["version"],
    missing_required_columns: [],
    ...overrides,
  };
}

function postflight(overrides: Record<string, unknown> = {}) {
  return {
    database: "neondb",
    owner: "neondb_owner",
    target_table_present: true,
    target_table_owner: "neondb_owner",
    target_table_rls: true,
    immutable_trigger: true,
    immutable_trigger_enabled: true,
    immutable_trigger_update_delete: true,
    metric_index: true,
    approved_index: true,
    metric_contract_constraints: true,
    evidence_state_constraints: true,
    target_range_constraints: true,
    approval_constraints: true,
    target_function_present: true,
    target_function_owner: "neondb_owner",
    target_function_security_definer: false,
    target_function_search_path_locked: true,
    target_function_idempotent: true,
    target_function_audited: true,
    target_function_server_baseline_contract: true,
    service_role_table_select: true,
    service_role_table_insert: true,
    service_role_table_update: false,
    service_role_table_delete: false,
    service_role_table_truncate: false,
    service_role_table_admin: false,
    service_role_function_execute: true,
    public_table_access: false,
    browser_role_table_access_count: 0,
    public_function_execute: false,
    browser_role_function_execute_count: 0,
    target_migration_count: 1,
    lead_count: 6,
    lead_state_digest: "lead-state",
    audit_count: 17,
    audit_state_digest: "audit-state",
    target_version_count: 0,
    ...overrides,
  };
}

describe("Phase 9 KPI target-register Production cutover interlocks", () => {
  it("requires its exact dedicated migration and deployment approval", () => {
    expect(assertExecutionApproval(APPROVAL_PHRASE)).toBe(true);
    expect(() => assertExecutionApproval(
      "APPROVE PHASE 9 FIRST RESPONSE PRODUCTION MIGRATION, PR 181 MERGE, AND PRODUCTION DEPLOYMENT",
    )).toThrow("exact_kpi_target_production_approval_missing");
    expect(() => assertExecutionApproval(
      "APPROVE PHASE 9 KPI TARGET REGISTER PRODUCTION MIGRATION",
    )).toThrow("exact_kpi_target_production_approval_missing");
  });

  it("pins the reviewed migration bytes and keeps the offline plan secret-free", async () => {
    const source = await migrationSource();
    expect(source.sha256).toBe(MIGRATION_SHA256);
    expect(source.sql).toContain("growth_kpi_target_versions");
    expect(source.sql).toContain("deliberately empty at migration time");
    const output = JSON.stringify(plan());
    expect(output).toContain(MIGRATION_FILE);
    expect(output).toContain(MIGRATION_SHA256);
    expect(output).toContain(MIGRATION_VERSION);
    expect(output).not.toContain("postgresql://");
  });

  it("accepts only the reviewed stacked schema boundary before execution", () => {
    expect(validatePreflight(preflight())).toMatchObject({
      publication_proof_table: true,
      publication_proof_migration_once: true,
      target_table_absent: true,
      target_function_absent: true,
      target_migration_absent: true,
    });
    expect(() => validatePreflight(preflight({ publication_proof_table: false })))
      .toThrow("publication_proof_table");
    expect(() => validatePreflight(preflight({ publication_proof_migration_count: 0 })))
      .toThrow("publication_proof_migration_once");
    expect(() => validatePreflight(preflight({ target_table_present: true })))
      .toThrow("target_table_absent");
    expect(() => validatePreflight(preflight({ target_function_present: true })))
      .toThrow("target_function_absent");
    expect(() => validatePreflight(preflight({ target_migration_count: 1 })))
      .toThrow("target_migration_absent");
  });

  it("fails preflight on identity, privilege, or required-column drift", () => {
    expect(() => validatePreflight(preflight({ owner: "service_role" }))).toThrow("owner");
    expect(() => validatePreflight(preflight({ service_role_bypassrls: false })))
      .toThrow("service_role_bypassrls");
    expect(() => validatePreflight(preflight({ missing_required_columns: ["public.audit_logs.metadata"] })))
      .toThrow("kpi_target_production_schema_required_columns_missing");
    expect(() => validatePreflight(preflight({ ledger_required_columns: ["version", "unknown_required"] })))
      .toThrow("kpi_target_migration_ledger_unsupported_required_columns");
  });

  it("requires append-only, evidence-gated, audited, least-privilege postconditions", () => {
    expect(validatePostflight(preflight(), postflight())).toMatchObject({
      immutable_trigger_update_delete: true,
      approval_constraints: true,
      target_function_server_baseline_contract: true,
      no_migration_seed_versions: true,
    });
    expect(() => validatePostflight(preflight(), postflight({ immutable_trigger_update_delete: false })))
      .toThrow("immutable_trigger_update_delete");
    expect(() => validatePostflight(preflight(), postflight({ approval_constraints: false })))
      .toThrow("approval_constraints");
    expect(() => validatePostflight(preflight(), postflight({ service_role_table_update: true })))
      .toThrow("service_role_table_update_denied");
    expect(() => validatePostflight(preflight(), postflight({ service_role_table_delete: true })))
      .toThrow("service_role_table_delete_denied");
    expect(() => validatePostflight(preflight(), postflight({ public_function_execute: true })))
      .toThrow("public_function_execute_denied");
    expect(() => validatePostflight(preflight(), postflight({ target_version_count: 1 })))
      .toThrow("no_migration_seed_versions");
  });

  it("permits read-only verification after legitimate runtime versions exist", () => {
    const after = postflight({ target_version_count: 4, audit_count: 21, audit_state_digest: "later-audit-state" });
    expect(validatePostflight(after, after, { allowRuntimeVersions: true }).no_migration_seed_versions)
      .toBe(true);
  });

  it("verifies trigger events structurally instead of relying on display order", () => {
    expect(runnerSource).toContain("t.tgtype");
    expect(runnerSource).toContain("(tgtype & 8) = 8");
    expect(runnerSource).toContain("(tgtype & 16) = 16");
    expect(runnerSource).not.toContain("BEFORE UPDATE OR DELETE");
  });

  it("uses a backup, advisory lock, transaction, and redacted secure environment input", () => {
    expect(runnerSource).toContain("createBackup");
    expect(runnerSource).toContain("pg_try_advisory_xact_lock");
    expect(runnerSource).toContain('client.query("BEGIN")');
    expect(runnerSource).toContain('client.query("COMMIT")');
    expect(runnerSource).toContain('client.query("ROLLBACK")');
    expect(runnerSource).toContain("AMM_PRODUCTION_DATABASE_URL");
    expect(runnerSource).toContain("redactError");
    expect(runnerSource).not.toContain("DATABASE_URL=");
  });
});
