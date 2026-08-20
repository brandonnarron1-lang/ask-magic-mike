import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260820013000_first_response_intelligence.sql"),
  "utf8",
);
const growthView = readFileSync(
  join(process.cwd(), "app/lib/persistence/neonGrowthIntelligenceView.ts"),
  "utf8",
);

describe("Phase 9 first-response intelligence migration", () => {
  it("stores one immutable, server-only milestone per lead", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.lead_response_milestones");
    expect(migration).toContain("lead_id uuid NOT NULL UNIQUE");
    expect(migration).toContain("lead_response_milestones_reject_change");
    expect(migration).toContain("public.amm_reject_immutable_change()");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });

  it("records evidence without sending or inferring contact", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.record_admin_first_response_v1(");
    expect(migration).toContain("lead.first_human_response_recorded");
    expect(migration).toMatch(/A mutable\s+-- legacy last_contacted_at value alone is not treated as proof/);
    expect(migration).not.toMatch(/INSERT INTO public\.lead_notifications/i);
  });

  it("keeps v2 as rollback and adds contacted-state recording atomically in v3", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.mutate_admin_lead_status_v3(");
    expect(migration).toContain("public.mutate_admin_lead_status_v2(");
    expect(migration).toContain("IF p_next_status = 'contacted'");
    expect(migration).toContain("Application rollback: deploy code that calls mutate_admin_lead_status_v2");
  });

  it("reads only live, unsuppressed response milestones into business KPIs", () => {
    expect(growthView).toContain("rm.is_test = false");
    expect(growthView).toContain("rm.communication_suppressed = false");
    expect(growthView).toContain("first_human_response_at");
  });
});
