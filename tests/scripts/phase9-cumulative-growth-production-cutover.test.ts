import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPROVAL_PHRASE,
  MIGRATIONS,
  assertExecutionApproval,
  assertGrowthImportGatesDisabled,
  migrationSources,
  normalizeMigrationSql,
  parseMode,
  plan,
  validatePostflight,
  validatePreflight,
} from "../../scripts/phase9-cumulative-growth-production-cutover.mjs";

const runnerSource = readFileSync(
  "scripts/phase9-cumulative-growth-production-cutover.mjs",
  "utf8",
);

const versions = Object.fromEntries(MIGRATIONS.map((migration) => [migration.version, 0]));
const requiredColumnKeys = [
  "leads.id", "leads.status", "leads.lead_type", "leads.lead_grade",
  "leads.next_follow_up_at", "leads.last_contacted_at", "leads.closed_lost_reason",
  "leads.updated_at", "agents.id", "messages.id", "messages.created_at",
  "messages.lead_id", "messages.role", "messages.content", "messages.content_type",
  "messages.agent_id", "tasks.id", "tasks.created_at", "tasks.updated_at",
  "tasks.lead_id", "tasks.agent_id", "tasks.created_by", "tasks.title", "tasks.body",
  "tasks.due_at", "tasks.priority", "tasks.category", "lead_routing.lead_id",
  "lead_routing.assignment_reason", "agent_assignments.idempotency_key",
  "agent_assignments.assignment_reason", "audit_logs.id", "audit_logs.created_at",
  "audit_logs.actor", "audit_logs.action", "audit_logs.resource_type",
  "audit_logs.resource_id", "audit_logs.before_state", "audit_logs.after_state",
  "audit_logs.metadata",
];

function preflight(overrides: Record<string, unknown> = {}) {
  return {
    database: "neondb",
    owner: "neondb_owner",
    server_version: "18.4",
    can_create_public: true,
    migration_ledger: true,
    ledger_columns: ["version", "statements", "name"],
    ledger_required_columns: ["version"],
    roles: { anon: false, authenticated: false, service_role: true },
    required_tables: {
      audit_logs: true,
      marketing_channels: true,
      marketing_campaigns: true,
      marketing_spend_daily: true,
      market_signals: true,
      market_opportunities: true,
      leads: true,
      agents: true,
      messages: true,
      tasks: true,
      lead_routing: true,
      agent_assignments: true,
    },
    required_functions: { mutate_admin_assignment_v1: true },
    required_columns: Object.fromEntries(requiredColumnKeys.map((key) => [key, true])),
    immutable_guard_present: true,
    target_tables: {
      marketing_spend_import_batches: false,
      organic_search_import_batches: false,
      local_profile_performance_import_batches: false,
    },
    target_functions: {
      import_marketing_spend_batch_v1: false,
      import_organic_search_batch_v1: false,
      import_local_profile_performance_batch_v1: false,
      amm_reject_retired_local_profile_metric: false,
      patch_admin_lead_v1: false,
      add_admin_lead_note_v1: false,
      create_admin_lead_task_v1: false,
      mutate_admin_assignment_v2: false,
    },
    target_triggers: {
      marketing_spend_import_batches_reject_change: false,
      organic_search_import_batches_reject_change: false,
      local_profile_performance_import_batches_reject_change: false,
      market_signals_reject_retired_local_profile_metric: false,
    },
    ledger_counts: { ...versions },
    baseline_counts: {
      audit_logs: 12,
      marketing_channels: 4,
      marketing_campaigns: 7,
      marketing_spend_daily: 9,
      market_signals: 5,
      market_opportunities: 3,
    },
    ...overrides,
  };
}

function hardenedTable() {
  return {
    present: true,
    owner: "neondb_owner",
    rls: true,
    public_privilege: false,
    blocked_role_privilege_count: 0,
  };
}

function hardenedFunction(searchPath: string, serviceRoleExecute = false) {
  return {
    present: true,
    owner: "neondb_owner",
    security_definer: false,
    search_path: [searchPath],
    public_execute: false,
    anon_execute: false,
    authenticated_execute: false,
    service_role_execute: serviceRoleExecute,
  };
}

function trigger(table: string, functionName = "amm_reject_immutable_change") {
  return {
    present: true,
    enabled: true,
    definition: `CREATE TRIGGER example BEFORE INSERT ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.${functionName}()`,
  };
}

function postflight(overrides: Record<string, unknown> = {}) {
  const before = preflight();
  return {
    database: "neondb",
    owner: "neondb_owner",
    target_tables: {
      marketing_spend_import_batches: hardenedTable(),
      organic_search_import_batches: hardenedTable(),
      local_profile_performance_import_batches: hardenedTable(),
    },
    target_functions: {
      import_marketing_spend_batch_v1: hardenedFunction("search_path=public, pg_temp"),
      import_organic_search_batch_v1: hardenedFunction("search_path=public, pg_temp"),
      import_local_profile_performance_batch_v1: hardenedFunction("search_path=public, pg_temp"),
      amm_reject_retired_local_profile_metric: hardenedFunction('search_path=""'),
      patch_admin_lead_v1: hardenedFunction("search_path=public, pg_temp", true),
      add_admin_lead_note_v1: hardenedFunction("search_path=public, pg_temp", true),
      create_admin_lead_task_v1: hardenedFunction("search_path=public, pg_temp", true),
      mutate_admin_assignment_v2: hardenedFunction("search_path=public, pg_temp", true),
    },
    target_triggers: {
      marketing_spend_import_batches_reject_change: trigger("marketing_spend_import_batches"),
      organic_search_import_batches_reject_change: trigger("organic_search_import_batches"),
      local_profile_performance_import_batches_reject_change: trigger(
        "local_profile_performance_import_batches",
      ),
      market_signals_reject_retired_local_profile_metric: trigger(
        "market_signals",
        "amm_reject_retired_local_profile_metric",
      ),
    },
    ledger_counts: Object.fromEntries(
      MIGRATIONS.map((migration) => [migration.version, 1]),
    ),
    baseline_counts: before.baseline_counts,
    receipt_counts: {
      marketing_spend_import_batches: 0,
      organic_search_import_batches: 0,
      local_profile_performance_import_batches: 0,
    },
    ...overrides,
  };
}

describe("Phase 9 cumulative growth Production cutover interlocks", () => {
  it("requires the exact cumulative approval and disabled import gates", () => {
    expect(assertExecutionApproval(APPROVAL_PHRASE)).toBe(true);
    expect(() => assertExecutionApproval("APPROVE PHASE 9 PRODUCTION DEPLOYMENT")).toThrow(
      "exact_cumulative_production_approval_missing",
    );
    expect(assertGrowthImportGatesDisabled({})).toBe(true);
    expect(assertGrowthImportGatesDisabled({ GROWTH_SEARCH_IMPORT_ENABLED: "false" })).toBe(true);
    expect(() => assertGrowthImportGatesDisabled({
      GROWTH_LOCAL_PROFILE_IMPORT_ENABLED: "true",
    })).toThrow("growth_import_gate_must_remain_disabled");
  });

  it("defaults to an offline plan and rejects conflicting modes", () => {
    expect(parseMode([])).toBe("plan");
    expect(parseMode(["--preflight"])).toBe("preflight");
    expect(parseMode(["--verify"])).toBe("verify");
    expect(parseMode(["--execute"])).toBe("execute");
    expect(() => parseMode(["--preflight", "--execute"])).toThrow(
      "cutover_mode_conflict",
    );
  });

  it("verifies every reviewed migration hash and removes only the reviewed outer envelope", async () => {
    const sources = await migrationSources();
    expect(sources).toHaveLength(5);
    expect(sources.map((source) => source.sha256)).toEqual(
      MIGRATIONS.map((migration) => migration.sha256),
    );
    expect(sources[3].sql).not.toMatch(/^\s*BEGIN;/);
    expect(sources[3].sql).not.toMatch(/COMMIT;\s*$/);
    expect(sources[4].file).toBe("20260830190000_admin_lead_api_persistence.sql");
    expect(() => normalizeMigrationSql(
      { file: "unexpected.sql", transactionWrapped: false },
      "BEGIN; SELECT 1; COMMIT;",
    )).toThrow("unexpected_migration_transaction_control");
    expect(() => normalizeMigrationSql(
      { file: "wrapped.sql", transactionWrapped: true },
      "BEGIN; BEGIN; SELECT 1; COMMIT;",
    )).toThrow("reviewed_transaction_envelope_mismatch");
  });

  it("accepts only the canonical absent-target Production prestate", () => {
    expect(validatePreflight(preflight())).toMatchObject({
      service_role_present: true,
      browser_role_state_observed: true,
      prerequisites_present: true,
      target_tables_absent: true,
      target_migrations_absent: true,
    });
    expect(validatePreflight(preflight({
      roles: { anon: true, authenticated: true, service_role: true },
    }))).toMatchObject({
      service_role_present: true,
      browser_role_state_observed: true,
    });
    expect(() => validatePreflight(preflight({
      roles: { anon: false, authenticated: false, service_role: false },
    }))).toThrow("service_role_present");
    expect(validatePreflight(preflight({ server_version: "17.11" }))).toMatchObject({
      postgres_major_supported: true,
    });
    expect(() => validatePreflight(preflight({ server_version: "16.9" }))).toThrow(
      "postgres_major_supported",
    );
    expect(() => validatePreflight(preflight({
      target_tables: {
        marketing_spend_import_batches: true,
        organic_search_import_batches: false,
        local_profile_performance_import_batches: false,
      },
    }))).toThrow("target_tables_absent");
    expect(() => validatePreflight(preflight({
      ledger_counts: { ...versions, "20260824220000": 1 },
    }))).toThrow("target_migrations_absent");
    expect(() => validatePreflight(preflight({
      required_tables: { ...preflight().required_tables, market_signals: false },
    }))).toThrow("prerequisites_present");
    expect(() => validatePreflight(preflight({
      required_functions: { mutate_admin_assignment_v1: false },
    }))).toThrow("prerequisite_functions_present");
    expect(() => validatePreflight(preflight({
      required_columns: { ...preflight().required_columns, "leads.updated_at": false },
    }))).toThrow("prerequisite_columns_present");
  });

  it("rejects migration-ledger drift instead of guessing required columns", () => {
    expect(() => validatePreflight(preflight({ ledger_columns: ["name"] }))).toThrow(
      "migration_ledger_version_column_missing",
    );
    expect(() => validatePreflight(preflight({
      ledger_required_columns: ["version", "unknown_required"],
    }))).toThrow("migration_ledger_unsupported_required_columns");
  });

  it("proves hardened objects, one ledger row each, unchanged rows, and empty receipts", () => {
    const before = preflight();
    const after = postflight();
    expect(validatePostflight(before, after, { requireEmptyReceipts: true })).toMatchObject({
      target_tables_hardened: true,
      target_functions_hardened: true,
      target_triggers_enabled: true,
      receipts_empty: true,
    });
    expect(() => validatePostflight(before, postflight({
      baseline_counts: { ...before.baseline_counts, market_signals: 6 },
    }))).toThrow("baseline_counts_unchanged");
    expect(() => validatePostflight(before, postflight({
      ledger_counts: { ...Object.fromEntries(MIGRATIONS.map((migration) => [migration.version, 1])), "20260825060000": 0 },
    }))).toThrow("target_migrations_once");
  });

  it("fails closed on privilege, trigger, or unexpected receipt drift", () => {
    const before = preflight();
    const weakTables = postflight().target_tables;
    weakTables.organic_search_import_batches.public_privilege = true;
    expect(() => validatePostflight(before, postflight({ target_tables: weakTables }))).toThrow(
      "target_tables_hardened",
    );

    const weakFunctions = postflight().target_functions;
    weakFunctions.import_marketing_spend_batch_v1.authenticated_execute = true;
    expect(() => validatePostflight(before, postflight({ target_functions: weakFunctions }))).toThrow(
      "target_functions_hardened",
    );

    const missingAdminGrant = postflight().target_functions;
    missingAdminGrant.patch_admin_lead_v1.service_role_execute = false;
    expect(() => validatePostflight(
      before,
      postflight({ target_functions: missingAdminGrant }),
    )).toThrow("target_functions_hardened");

    expect(() => validatePostflight(before, postflight({
      receipt_counts: {
        marketing_spend_import_batches: 0,
        organic_search_import_batches: 1,
        local_profile_performance_import_batches: 0,
      },
    }), { requireEmptyReceipts: true })).toThrow("receipts_empty");
  });

  it("contains backup, lock, transaction, rollback, and credential-redaction hardening", () => {
    expect(runnerSource).toContain("createBackup(target");
    expect(runnerSource).toContain("pg_try_advisory_xact_lock");
    expect(runnerSource).toContain(
      "LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE",
    );
    expect(runnerSource).toContain("SET LOCAL lock_timeout = '5s'");
    expect(runnerSource).toContain("SET LOCAL statement_timeout = '120s'");
    expect(runnerSource).toContain("SET LOCAL idle_in_transaction_session_timeout = '180s'");
    expect(runnerSource).toContain('await client.query("BEGIN")');
    expect(runnerSource).toContain('await client.query("COMMIT")');
    expect(runnerSource).toContain('await client.query("ROLLBACK")');
    expect(runnerSource).toContain("redactError(error?.message)");
    expect(runnerSource).toContain("FROM pg_roles role");
    expect(runnerSource).not.toContain("has_function_privilege('anon', procedure.oid");
    expect(runnerSource).not.toContain(
      "has_function_privilege('authenticated', procedure.oid",
    );
    expect(runnerSource).not.toContain("console.log(process.env)");
    expect(runnerSource).not.toContain("{ ...process.env }");
  });

  it("keeps secrets out of the offline plan", () => {
    const output = JSON.stringify(plan());
    expect(output).toContain("bitter-star-20214385");
    expect(output).toContain(MIGRATIONS[0].sha256);
    expect(output).toContain("AMM_PRODUCTION_DATABASE_URL (secure environment only)");
    expect(output).not.toContain("postgresql://");
    expect(output).not.toContain("password");
  });
});
