import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 9.6 experiment draft migration", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260819190000_phase9_home_value_trust_experiment_draft.sql"),
    "utf8",
  );

  it("registers only a pending approval-required draft", () => {
    expect(sql).toContain("'approval_required'");
    expect(sql).toContain("'pending'");
    expect(sql).toContain("ON CONFLICT (experiment_key) DO NOTHING");
    expect(sql).not.toMatch(/UPDATE\s+public\.growth_experiments/i);
    expect(sql).not.toMatch(/PUBLIC_EXPERIMENTS_ENABLED\s*=\s*true/i);
  });

  it("uses the same reviewed two-variant allocation", () => {
    expect(sql).toContain('"key":"control"');
    expect(sql).toContain('"key":"broker_review"');
    expect(sql.match(/"weight":50/g)).toHaveLength(2);
    expect(sql).toContain("'qualified_appointment_rate'");
  });
});
