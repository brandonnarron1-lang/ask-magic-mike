import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260821213000_growth_kpi_target_register.sql",
  "utf8",
);
const page = readFileSync("app/admin/growth/targets/page.tsx", "utf8");
const action = readFileSync("app/admin/growth/targets/actions.ts", "utf8");
const contract = readFileSync("supabase/tests/growth_kpi_target_register_pg17.sql", "utf8");
const localVerifier = readFileSync("scripts/staging-local-verify.mjs", "utf8");
const rateLimiter = readFileSync("src/lib/security/rate-limit.ts", "utf8");

describe("Growth KPI target-register migration and route guards", () => {
  it("keeps target versions append-only, RLS-enabled, and server-only", () => {
    expect(migration).toContain("ALTER TABLE public.growth_kpi_target_versions ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("growth_kpi_target_versions_reject_change");
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
    expect(migration).toContain("REVOKE ALL ON public.growth_kpi_target_versions FROM PUBLIC");
    expect(migration).toContain("GRANT SELECT, INSERT ON TABLE public.growth_kpi_target_versions TO service_role");
    expect(migration).not.toContain("GRANT UPDATE");
    expect(migration).not.toContain("GRANT DELETE");
  });

  it("requires a measured baseline and explicit approval for approved targets", () => {
    expect(migration).toContain("status = 'approved'");
    expect(migration).toContain("baseline_state = 'measured'");
    expect(migration).toContain("baseline_value IS NOT NULL");
    expect(migration).toContain("approval_reference IS NOT NULL");
    expect(migration).toContain("target_value IS NULL");
    expect(migration).toContain("baseline_state IN ('insufficient_sample', 'not_instrumented', 'unavailable')");
    expect(migration).toContain("No target rows are seeded by migration");
  });

  it("records one immutable audit event without external action authority", () => {
    expect(migration).toContain("growth.kpi_target_version_recorded");
    expect(migration).toContain("external_mutation_performed");
    expect(migration).toContain("It cannot mutate leads, campaigns, providers, or consumer communications");
  });

  it("protects reads and mutations with distinct Lead Center permissions", () => {
    expect(page).toContain('requireLeadCenterPermission("report:view")');
    expect(page).toContain('hasLeadCenterPermission(principal.role, "growth:manage")');
    expect(action).toContain('requireLeadCenterPermission("growth:manage")');
    expect(action).toContain("assertDatabaseMutationAllowed");
    expect(action).toContain('"growthTarget"');
    expect(rateLimiter).toContain("growthTarget: { limit: 30");
    expect(action).toContain("recordGrowthKpiTarget");
    expect(page).toContain('dynamic = "force-dynamic"');
  });

  it("does not claim that drafts or uninstrumented metrics are approved", () => {
    expect(page).toContain("Draft — no approval claim");
    expect(page).toContain("measured baseline required");
    expect(page).toContain("No target version has been recorded");
    expect(page).toContain("not yet instrumented");
  });

  it("runs the role, idempotency, audit, and immutability contract in local staging", () => {
    expect(contract).toContain("SET LOCAL ROLE service_role");
    expect(contract).toContain("SET LOCAL ROLE authenticated");
    expect(contract).toContain("measured_kpi_baseline_and_approval_required");
    expect(contract).toContain("growth.kpi_target_version_recorded");
    expect(contract).toContain("idempotent_replay");
    expect(contract).toContain("'55000'");
    expect(contract).toContain("'42501'");
    expect(contract).toMatch(/BEGIN;[\s\S]*ROLLBACK;/);
    expect(localVerifier).toContain("growth_kpi_target_register_pg17.sql");
    expect(localVerifier).toContain("kpi_target_sql_passed");
    expect(localVerifier).toContain("kpiTarget.status !== 0");
  });
});
