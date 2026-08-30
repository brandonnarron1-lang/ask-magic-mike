import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260825060000_local_demand_metric_truth_guard.sql",
  ),
  "utf8",
);

describe("local-demand metric truth guard migration", () => {
  it("rejects the retired GBP conversation metric at the durable signal boundary", () => {
    expect(migration).toContain("public.amm_reject_retired_local_profile_metric");
    expect(migration).toContain("market_signals_reject_retired_local_profile_metric");
    expect(migration).toContain("BEFORE INSERT OR UPDATE OF source_system, evidence");
    expect(migration).toContain("NEW.source_system = 'google_business_profile'");
    expect(migration).toContain("NEW.evidence->>'metric' = 'business_conversations'");
    expect(migration).toContain("ERRCODE = '23514'");
  });

  it("is forward-only and preserves historical signals", () => {
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.market_signals/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.market_signals\s+SET/i);
    expect(migration).not.toMatch(/DROP\s+TABLE|TRUNCATE\s+TABLE/i);
    expect(migration).toContain("historical rows are not scanned, updated, or deleted");
  });

  it("keeps the guard non-callable by browser and service roles", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.amm_reject_retired_local_profile_metric() FROM PUBLIC");
    for (const role of ["anon", "authenticated", "service_role"]) {
      expect(migration).toContain(role);
    }
  });
});
