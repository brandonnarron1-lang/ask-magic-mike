import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPROVAL_PHRASE,
  MIGRATION_FILE,
  MIGRATION_SHA256,
  MIGRATION_VERSION,
  assertExecutionApproval,
  hasWordpressScopeConstraintMarkers,
  migrationSource,
  plan,
  validatePostflight,
  validatePreflight,
} from "../../scripts/phase9-wordpress-proof-scope-production-cutover.mjs";

const runnerSource = readFileSync(
  "scripts/phase9-wordpress-proof-scope-production-cutover.mjs",
  "utf8",
);

const scopeMarkers = [
  "ourtown_wordpress",
  "ourtownproperties",
  "owned_media",
  "wordpress_ask_magic_mike_seller_review",
  "wordpress_ask_magic_mike_buyer_match",
  "wordpress_ask_magic_mike_renter_plan",
  "wordpress_homepage_ask_mike",
  "wordpress_home_value_page",
  "wordpress_we_buy_homes",
  "wordpress_mike_agent_page",
  "wordpress_listing_buyer",
  "wordpress_rental_to_homeownership",
  "wordpress_ask_magic_mike_embed",
  "channel_key <> 'ourtown_wordpress'",
  "configured",
  "removed",
  "access[_-]?token",
  "api[_-]?key",
  "authorization",
  "password",
  "secret",
].join(" ");

function preflight(overrides: Record<string, unknown> = {}) {
  return {
    database: "neondb",
    owner: "neondb_owner",
    server_version: "18.4",
    can_alter_publication_table: true,
    leads_table: true,
    audit_logs_table: true,
    publication_table_present: true,
    publication_table_owner: "neondb_owner",
    publication_table_rls: true,
    publication_function_present: true,
    publication_function_security_definer: false,
    publication_function_search_path_locked: true,
    publication_function_digest: "function-state",
    immutable_trigger: true,
    migration_ledger: true,
    service_role: true,
    service_role_bypassrls: true,
    service_role_table_select: true,
    service_role_table_insert: true,
    service_role_table_update: false,
    service_role_table_delete: false,
    public_table_access: false,
    browser_role_table_access_count: 0,
    predecessor_migration_count: 1,
    target_migration_count: 0,
    v2_constraint_count: 0,
    wordpress_constraint_count: 0,
    legacy_channel_constraint_count: 1,
    legacy_placement_constraint_count: 1,
    legacy_evidence_constraint_count: 1,
    legacy_attribution_constraint_count: 1,
    legacy_content_constraint_count: 1,
    legacy_state_constraint_count: 1,
    lead_count: 6,
    lead_state_digest: "lead-state",
    audit_count: 17,
    audit_state_digest: "audit-state",
    proof_count: 2,
    proof_state_digest: "proof-state",
    ledger_columns: ["version", "statements", "name"],
    ledger_required_columns: ["version"],
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
    publication_function_present: true,
    publication_function_security_definer: false,
    publication_function_search_path_locked: true,
    publication_function_digest: "function-state",
    immutable_trigger: true,
    v2_constraint_count: 6,
    v2_validated_constraint_count: 6,
    scope_constraint_definitions: scopeMarkers,
    predecessor_migration_count: 1,
    target_migration_count: 1,
    service_role_table_select: true,
    service_role_table_insert: true,
    service_role_table_update: false,
    service_role_table_delete: false,
    public_table_access: false,
    browser_role_table_access_count: 0,
    lead_count: 6,
    lead_state_digest: "lead-state",
    audit_count: 17,
    audit_state_digest: "audit-state",
    proof_count: 2,
    proof_state_digest: "proof-state",
    ...overrides,
  };
}

describe("Phase 9 WordPress proof-scope Production cutover interlocks", () => {
  it("requires the exact migration, PR, and deployment approval", () => {
    expect(assertExecutionApproval(APPROVAL_PHRASE)).toBe(true);
    expect(() => assertExecutionApproval(
      "APPROVE PHASE 9 OWNED-DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT",
    )).toThrow("exact_wordpress_proof_scope_production_approval_missing");
  });

  it("pins the reviewed migration bytes and emits a secret-free plan", async () => {
    const source = await migrationSource();
    expect(source.sha256).toBe(MIGRATION_SHA256);
    expect(source.sql).toContain("owned_demand_publication_content_v2");
    const output = JSON.stringify(plan());
    expect(output).toContain(MIGRATION_FILE);
    expect(output).toContain(MIGRATION_VERSION);
    expect(output).toContain(MIGRATION_SHA256);
    expect(output).not.toContain("postgresql://");
  });

  it("accepts only the exact legacy ledger boundary before execution", () => {
    expect(validatePreflight(preflight())).toMatchObject({
      predecessor_migration_once: true,
      target_migration_absent: true,
      v2_constraints_absent: true,
      wordpress_scope_absent: true,
      legacy_content_constraint: true,
    });
    expect(() => validatePreflight(preflight({ target_migration_count: 1 })))
      .toThrow("target_migration_absent");
    expect(() => validatePreflight(preflight({ v2_constraint_count: 1 })))
      .toThrow("v2_constraints_absent");
    expect(() => validatePreflight(preflight({ wordpress_constraint_count: 1 })))
      .toThrow("wordpress_scope_absent");
    expect(() => validatePreflight(preflight({ legacy_content_constraint_count: 0 })))
      .toThrow("legacy_content_constraint");
  });

  it("fails closed on ownership, authorization, and migration-ledger drift", () => {
    expect(() => validatePreflight(preflight({ owner: "service_role" })))
      .toThrow("owner");
    expect(() => validatePreflight(preflight({ publication_table_rls: false })))
      .toThrow("publication_table_rls");
    expect(() => validatePreflight(preflight({ service_role_table_update: true })))
      .toThrow("service_role_update_denied");
    expect(() => validatePreflight(preflight({ browser_role_table_access_count: 1 })))
      .toThrow("browser_table_access_denied");
    expect(() => validatePreflight(preflight({ ledger_required_columns: ["version", "unknown"] })))
      .toThrow("wordpress_proof_scope_migration_ledger_unsupported_required_columns");
  });

  it("requires every exact WordPress tuple and safety marker", () => {
    expect(hasWordpressScopeConstraintMarkers(scopeMarkers)).toBe(true);
    expect(hasWordpressScopeConstraintMarkers(
      scopeMarkers.replace("wordpress_home_value_page", ""),
    )).toBe(false);
    expect(hasWordpressScopeConstraintMarkers(
      scopeMarkers.replace("access[_-]?token", ""),
    )).toBe(false);
  });

  it("preserves leads, audit events, proof rows, function, RLS, and privileges", () => {
    expect(validatePostflight(preflight(), postflight())).toMatchObject({
      six_v2_constraints: true,
      six_v2_constraints_validated: true,
      wordpress_scope_contract: true,
      proof_state_unchanged: true,
      publication_function_unchanged: true,
    });
    expect(() => validatePostflight(preflight(), postflight({ proof_count: 3 })))
      .toThrow("proof_count_unchanged");
    expect(() => validatePostflight(preflight(), postflight({ proof_state_digest: "changed" })))
      .toThrow("proof_state_unchanged");
    expect(() => validatePostflight(preflight(), postflight({ publication_function_digest: "changed" })))
      .toThrow("publication_function_unchanged");
    expect(() => validatePostflight(preflight(), postflight({ v2_validated_constraint_count: 5 })))
      .toThrow("six_v2_constraints_validated");
  });

  it("does not claim before/after invariants during standalone verification", () => {
    const checks = validatePostflight(null, postflight());
    expect(checks).toMatchObject({
      six_v2_constraints: true,
      wordpress_scope_contract: true,
    });
    expect(checks).not.toHaveProperty("lead_state_unchanged");
    expect(checks).not.toHaveProperty("proof_state_unchanged");
    expect(checks).not.toHaveProperty("publication_function_unchanged");
  });

  it("uses a backup, guarded locks, one transaction, and redacted secure input", () => {
    expect(runnerSource).toContain("createBackup");
    expect(runnerSource).toContain("pg_try_advisory_xact_lock");
    expect(runnerSource).toContain("public.owned_demand_publication_proofs IN SHARE MODE");
    expect(runnerSource).toContain('client.query("BEGIN")');
    expect(runnerSource).toContain('client.query("COMMIT")');
    expect(runnerSource).toContain('client.query("ROLLBACK")');
    expect(runnerSource).toContain("AMM_PRODUCTION_DATABASE_URL");
    expect(runnerSource).toContain("redactError");
    expect(runnerSource).not.toContain("DATABASE_URL=");
  });
});
