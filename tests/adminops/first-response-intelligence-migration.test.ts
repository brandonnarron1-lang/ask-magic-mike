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
    expect(migration).toContain("responder_user_id text");
    expect(migration).toContain("responder_agent_id uuid");
    expect(migration).toContain("assigned_agent_id_at_response uuid");
    expect(migration).not.toMatch(/responder_user_id text REFERENCES/i);
    expect(migration).not.toMatch(/assigned_agent_id_at_response uuid REFERENCES/i);
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

  it("resolves response ownership on the server and does not invent historical assignment snapshots", () => {
    expect(migration).toContain("LEFT JOIN public.agents a ON a.id::text = u.\"agentId\"");
    expect(migration).toContain("v_lead.assigned_agent_id");
    expect(migration).toContain("'response_owner_evidence'");
    expect(migration).toContain("'assigned_owner_snapshot_available', false");
    expect(migration).toMatch(/a\.responder_agent_id,\s+NULL,\s+a\.audit_id/);
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
    expect(growthView).toContain("rm.responder_agent_id");
    expect(growthView).toContain("rm.responder_user_id");
    expect(growthView).toContain("assigned_agent_id_at_response");
    expect(growthView).not.toContain("response_assigned.id = l.assigned_agent_id");
  });
});
