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
} from "../../scripts/phase9-first-response-production-cutover.mjs";

const runnerSource = readFileSync(
  "scripts/phase9-first-response-production-cutover.mjs",
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
    lead_outcomes_table: true,
    lead_center_users_table: true,
    agents_table: true,
    migration_ledger: true,
    service_role: true,
    service_role_bypassrls: true,
    service_role_schema_usage: true,
    service_role_leads_select: true,
    service_role_leads_update: true,
    service_role_audit_select: true,
    service_role_audit_insert: true,
    service_role_users_select: true,
    service_role_agents_select: true,
    v2_present: true,
    v2_owner: "neondb_owner",
    v2_security_definer: false,
    v2_search_path_locked: true,
    service_role_v2_execute: true,
    response_table_present: false,
    response_unique_index_present: false,
    recorder_present: false,
    v3_present: false,
    target_migration_count: 0,
    lead_count: 6,
    lead_state_digest: "lead-state",
    audit_count: 17,
    audit_contact_digest: "contact-evidence",
    backfill_eligible_count: 2,
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
    v2_present: true,
    v2_owner: "neondb_owner",
    v2_security_definer: false,
    v2_search_path_locked: true,
    response_table_present: true,
    response_table_owner: "neondb_owner",
    response_table_rls: true,
    response_unique_index_present: true,
    response_update_trigger: true,
    response_update_trigger_enabled: true,
    recorder_present: true,
    recorder_owner: "neondb_owner",
    recorder_security_definer: false,
    recorder_search_path_locked: true,
    v3_present: true,
    v3_owner: "neondb_owner",
    v3_security_definer: false,
    v3_search_path_locked: true,
    service_role_v2_execute: true,
    service_role_recorder_execute: true,
    service_role_v3_execute: true,
    service_role_response_select: true,
    service_role_response_insert: true,
    public_function_execute: false,
    browser_role_function_execute_count: 0,
    public_table_access: false,
    browser_role_table_access_count: 0,
    target_migration_count: 1,
    lead_count: 6,
    lead_state_digest: "lead-state",
    audit_count: 17,
    audit_contact_digest: "contact-evidence",
    backfill_eligible_count: 2,
    target_backfill_count: 2,
    target_backfill_distinct_leads: 2,
    runtime_milestone_count: 0,
    target_backfill_source_mismatch_count: 0,
    target_backfill_time_mismatch_count: 0,
    target_backfill_evidence_mismatch_count: 0,
    target_backfill_identity_mismatch_count: 0,
    target_backfill_flag_mismatch_count: 0,
    target_backfill_metadata_mismatch_count: 0,
    ...overrides,
  };
}

describe("Phase 9 first-response Production cutover interlocks", () => {
  it("requires the exact PR 181 database and deployment approval phrase", () => {
    expect(assertExecutionApproval(APPROVAL_PHRASE)).toBe(true);
    expect(() =>
      assertExecutionApproval(
        "APPROVE OUTCOME LEDGER PRODUCTION MIGRATION, PR 180 MERGE, AND PRODUCTION DEPLOYMENT",
      ),
    ).toThrow("exact_first_response_production_approval_missing");
  });

  it("pins the reviewed migration bytes and keeps the offline plan secret-free", async () => {
    const source = await migrationSource();
    expect(source.sha256).toBe(MIGRATION_SHA256);
    expect(source.sql).toContain("CREATE TABLE IF NOT EXISTS public.lead_response_milestones");
    const output = JSON.stringify(plan());
    expect(output).toContain(MIGRATION_FILE);
    expect(output).toContain(MIGRATION_SHA256);
    expect(output).toContain(MIGRATION_VERSION);
    expect(output).not.toContain("postgresql://");
  });

  it("accepts only the exact post-PR-180 schema boundary", () => {
    expect(validatePreflight(preflight())).toMatchObject({
      v2_present: true,
      response_table_absent: true,
      recorder_absent: true,
      v3_absent: true,
    });
    expect(() => validatePreflight(preflight({ v2_present: false }))).toThrow(
      "v2_present",
    );
    expect(() =>
      validatePreflight(preflight({ response_table_present: true })),
    ).toThrow("response_table_absent");
    expect(() => validatePreflight(preflight({ recorder_present: true }))).toThrow(
      "recorder_absent",
    );
    expect(() => validatePreflight(preflight({ v3_present: true }))).toThrow(
      "v3_absent",
    );
    expect(() =>
      validatePreflight(preflight({ target_migration_count: 1 })),
    ).toThrow("target_migration_absent");
  });

  it("fails preflight on owner, privilege, or required-column drift", () => {
    expect(() => validatePreflight(preflight({ owner: "service_role" }))).toThrow(
      "owner",
    );
    expect(() =>
      validatePreflight(preflight({ service_role_bypassrls: false })),
    ).toThrow("service_role_bypassrls");
    expect(() =>
      validatePreflight(preflight({ service_role_v2_execute: false })),
    ).toThrow("service_role_v2_execute");
    expect(() =>
      validatePreflight(
        preflight({
          missing_required_columns: ["public.audit_logs.created_at"],
        }),
      ),
    ).toThrow("first_response_production_schema_required_columns_missing");
    expect(() =>
      validatePreflight(
        preflight({
          ledger_required_columns: ["version", "unknown_required"],
        }),
      ),
    ).toThrow("first_response_migration_ledger_unsupported_required_columns");
  });

  it("proves immutable schema, least privilege, exact backfill, and no source-row drift", () => {
    const before = preflight();
    const after = postflight();
    expect(validatePostflight(before, after)).toMatchObject({
      response_table_rls: true,
      public_function_execute_denied: true,
      public_table_access_denied: true,
      backfill_cardinality: true,
      lead_state_unchanged: true,
      audit_count_unchanged: true,
    });

    expect(() =>
      validatePostflight(before, postflight({ public_function_execute: true })),
    ).toThrow("public_function_execute_denied");
    expect(() =>
      validatePostflight(before, postflight({ public_table_access: true })),
    ).toThrow("public_table_access_denied");
    expect(() =>
      validatePostflight(before, postflight({ response_table_rls: false })),
    ).toThrow("response_table_rls");
    expect(() =>
      validatePostflight(before, postflight({ lead_state_digest: "changed" })),
    ).toThrow("lead_state_unchanged");
    expect(() =>
      validatePostflight(before, postflight({ audit_count: 18 })),
    ).toThrow("audit_count_unchanged");
    expect(() =>
      validatePostflight(before, postflight({ target_backfill_count: 1 })),
    ).toThrow("backfill_cardinality");
    expect(() =>
      validatePostflight(
        before,
        postflight({ target_backfill_identity_mismatch_count: 1 }),
      ),
    ).toThrow("backfill_identity_exact");
  });

  it("allows later legitimate runtime milestones only in read-only verify mode", () => {
    const before = preflight();
    const after = postflight({ runtime_milestone_count: 1 });
    expect(() => validatePostflight(before, after)).toThrow(
      "runtime_milestones_expected",
    );
    expect(
      validatePostflight(before, after, { allowRuntimeMilestones: true }),
    ).toMatchObject({ runtime_milestones_expected: true });
  });

  it("retains the proven backup, lock, hash, and rollback discipline", () => {
    expect(runnerSource).toContain("reviewed_first_response_migration_hash_mismatch");
    expect(runnerSource).toContain("pg_try_advisory_xact_lock");
    expect(runnerSource).toContain(
      "LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE",
    );
    expect(runnerSource).toContain(
      "LOCK TABLE public.leads, public.audit_logs, public.lead_center_users, public.agents IN SHARE MODE",
    );
    expect(runnerSource).toContain("ask-magic-mike-pre-first-response");
    expect(runnerSource).toContain('await client.query("ROLLBACK")');
    expect(runnerSource).toContain("safeBackup(error.backup)");
    expect(runnerSource).not.toContain("console.log(process.env");
  });
});
