import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260819223000_admin_outcome_ledger.sql"),
  "utf8",
);

describe("Phase 9 AdminOps outcome ledger migration", () => {
  it("keeps lifecycle, audit, and canonical outcome in one database function", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.mutate_admin_lead_status_v2(");
    expect(migration).toContain("INSERT INTO public.audit_logs");
    expect(migration).toContain("INSERT INTO public.lead_outcomes");
    expect(migration).toContain("ON CONFLICT (source_system, external_id)");
    expect(migration).toContain("'outcome_ledger_version', 'v2'");
    expect(migration).toContain("'last_replay_actor', p_actor");
    expect(migration).toContain("'last_replay_at', p_occurred_at");
    expect(migration).toContain("WHEN v_idempotent_replay THEN");
  });

  it("maps only evidenced lifecycle stages and never invents revenue", () => {
    for (const mapping of [
      "WHEN 'qualified' THEN 'qualified'",
      "WHEN 'appointment_set' THEN 'appointment'",
      "WHEN 'converted' THEN 'closed'",
      "WHEN 'dead' THEN 'lost'",
      "WHEN 'spam' THEN 'disqualified'",
    ]) expect(migration).toContain(mapping);
    expect(migration).toContain("Historical reconciliation is deliberately deterministic and non-destructive");
    expect(migration).toContain("NULL,");
    expect(migration).toContain("Preserve lead_outcomes for audit and attribution");
  });

  it("keeps the function server-only and preserves v1 for rollback", () => {
    expect(migration).toContain(") FROM PUBLIC;");
    expect(migration).toContain("FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']");
    expect(migration).toContain("IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)");
    expect(migration).not.toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("mutate_admin_lead_status_v1");
  });
});
