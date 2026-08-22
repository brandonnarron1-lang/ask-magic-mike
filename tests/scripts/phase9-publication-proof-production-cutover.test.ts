import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPROVAL_PHRASE,
  MIGRATION_FILE,
  MIGRATION_SHA256,
  MIGRATION_VERSION,
  assertExecutionApproval,
  hasSafeEvidenceConstraintMarkers,
  migrationSource,
  plan,
  validatePostflight,
  validatePreflight,
} from "../../scripts/phase9-publication-proof-production-cutover.mjs";

const runnerSource = readFileSync(
  "scripts/phase9-publication-proof-production-cutover.mjs",
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
    migration_ledger: true,
    service_role: true,
    service_role_bypassrls: true,
    service_role_schema_usage: true,
    service_role_audit_select: true,
    service_role_audit_insert: true,
    publication_table_present: false,
    publication_function_present: false,
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
    publication_table_present: true,
    publication_table_owner: "neondb_owner",
    publication_table_rls: true,
    immutable_trigger: true,
    immutable_trigger_enabled: true,
    immutable_trigger_update_delete: true,
    channel_index: true,
    campaign_index: true,
    live_index: true,
    canonical_attribution_constraints: true,
    state_proof_constraints: true,
    evidence_constraint_definitions: [
      "evidence_url",
      "google",
      "facebook",
      "instagram",
      "linkedin",
      "access[_-]?token",
      "api[_-]?key",
      "authorization",
      "password",
      "secret",
    ].join(" "),
    copy_hash_constraint: true,
    publication_function_present: true,
    publication_function_owner: "neondb_owner",
    publication_function_security_definer: false,
    publication_function_search_path_locked: true,
    publication_function_idempotent: true,
    publication_function_audited: true,
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
    proof_count: 0,
    ...overrides,
  };
}

describe("Phase 9 publication-proof Production cutover interlocks", () => {
  it("requires the exact dedicated migration and deployment approval", () => {
    expect(assertExecutionApproval(APPROVAL_PHRASE)).toBe(true);
    expect(() => assertExecutionApproval("APPROVE PHASE 9 FIRST RESPONSE PRODUCTION MIGRATION, PR 181 MERGE, AND PRODUCTION DEPLOYMENT"))
      .toThrow("exact_publication_proof_production_approval_missing");
  });

  it("pins the reviewed migration bytes and keeps the offline plan secret-free", async () => {
    const source = await migrationSource();
    expect(source.sha256).toBe(MIGRATION_SHA256);
    expect(source.sql).toContain("owned_demand_publication_proofs");
    const output = JSON.stringify(plan());
    expect(output).toContain(MIGRATION_FILE);
    expect(output).toContain(MIGRATION_SHA256);
    expect(output).toContain(MIGRATION_VERSION);
    expect(output).not.toContain("postgresql://");
  });

  it("accepts only the post-PR-181 schema boundary before execution", () => {
    expect(validatePreflight(preflight())).toMatchObject({
      first_response_table: true,
      publication_table_absent: true,
      publication_function_absent: true,
      target_migration_absent: true,
    });
    expect(() => validatePreflight(preflight({ first_response_table: false }))).toThrow("first_response_table");
    expect(() => validatePreflight(preflight({ publication_table_present: true }))).toThrow("publication_table_absent");
    expect(() => validatePreflight(preflight({ publication_function_present: true }))).toThrow("publication_function_absent");
    expect(() => validatePreflight(preflight({ target_migration_count: 1 }))).toThrow("target_migration_absent");
  });

  it("fails preflight on owner, privilege, or required-column drift", () => {
    expect(() => validatePreflight(preflight({ owner: "service_role" }))).toThrow("owner");
    expect(() => validatePreflight(preflight({ service_role_bypassrls: false }))).toThrow("service_role_bypassrls");
    expect(() => validatePreflight(preflight({ missing_required_columns: ["public.audit_logs.metadata"] })))
      .toThrow("publication_proof_production_schema_required_columns_missing");
    expect(() => validatePreflight(preflight({ ledger_required_columns: ["version", "unknown_required"] })))
      .toThrow("publication_proof_migration_ledger_unsupported_required_columns");
  });

  it("requires the append-only, audited, least-privilege postconditions", () => {
    expect(validatePostflight(preflight(), postflight())).toMatchObject({
      immutable_trigger_update_delete: true,
      publication_function_idempotent: true,
      publication_function_audited: true,
      no_migration_seed_proofs: true,
    });
    expect(() => validatePostflight(preflight(), postflight({ immutable_trigger_update_delete: false }))).toThrow("immutable_trigger_update_delete");
    expect(() => validatePostflight(preflight(), postflight({ service_role_table_update: true }))).toThrow("service_role_table_update_denied");
    expect(() => validatePostflight(preflight(), postflight({ service_role_table_delete: true }))).toThrow("service_role_table_delete_denied");
    expect(() => validatePostflight(preflight(), postflight({ service_role_table_truncate: true }))).toThrow("service_role_table_truncate_denied");
    expect(() => validatePostflight(preflight(), postflight({ service_role_table_admin: true }))).toThrow("service_role_table_admin_denied");
    expect(() => validatePostflight(preflight(), postflight({ public_function_execute: true }))).toThrow("public_function_execute_denied");
    expect(() => validatePostflight(preflight(), postflight({ proof_count: 1 }))).toThrow("no_migration_seed_proofs");
  });

  it("permits read-only verification after legitimate runtime proof rows exist", () => {
    const after = postflight({ proof_count: 3 });
    expect(validatePostflight(after, after, { allowRuntimeProofs: true }).no_migration_seed_proofs).toBe(true);
  });

  it("verifies trigger events structurally instead of relying on display order", () => {
    expect(runnerSource).toContain("t.tgtype");
    expect(runnerSource).toContain("(tgtype & 8) = 8");
    expect(runnerSource).toContain("(tgtype & 16) = 16");
    expect(runnerSource).not.toContain("BEFORE UPDATE OR DELETE");
  });

  it("verifies evidence constraints by semantic markers instead of escaped catalog formatting", () => {
    const pg18CatalogRender = String.raw`
      CHECK (evidence_url !~* '[?&](access[_-]?token|api[_-]?key|authorization|password|secret)='::text)
      google\\.com facebook\\.com instagram\\.com linkedin\\.com
    `;
    expect(hasSafeEvidenceConstraintMarkers(pg18CatalogRender)).toBe(true);
    expect(hasSafeEvidenceConstraintMarkers(pg18CatalogRender.replace("authorization", ""))).toBe(false);
    expect(runnerSource).toContain("evidence_constraint_definitions");
    expect(runnerSource).not.toContain("'safe_evidence_constraints', COALESCE");
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
