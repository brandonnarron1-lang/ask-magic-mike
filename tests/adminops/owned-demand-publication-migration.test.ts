import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260821170000_owned_demand_publication_proofs.sql"),
  "utf8",
);

describe("owned-demand publication proof migration", () => {
  it("creates one append-only server-only ledger", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.owned_demand_publication_proofs");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON public.owned_demand_publication_proofs FROM PUBLIC");
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
    expect(migration).toContain("WHERE is_test = false");
  });

  it("binds every proof to the canonical campaign, attribution, and state contract", () => {
    expect(migration).toContain("campaign_key = 'amm_owned_demand_2026'");
    expect(migration).toContain("utm_source = 'google_business_profile'");
    expect(migration).toContain("utm_content = ('facebook_local_question'");
    expect(migration).toContain("facebook\\.com|fb\\.com|fb\\.watch");
    expect(migration).toContain("access[_-]?token");
    expect(migration).toContain("platform_state = 'live' AND proof_type IN ('public_url', 'screenshot_reference')");
    expect(migration).toContain("platform_state = 'removed' AND proof_type = 'removal_reference'");
  });

  it("records one immutable audit event and makes exact replays idempotent", () => {
    expect(migration).toContain("record_owned_demand_publication_proof_v1");
    expect(migration).toContain("ON CONFLICT (idempotency_key) DO NOTHING");
    expect(migration).toContain("growth.publication_proof_recorded");
    expect(migration).toContain("idempotent_replay");
    expect(migration).toContain("external_mutation_performed', false");
  });

  it("stores a copy hash rather than raw publication copy", () => {
    expect(migration).toContain("final_copy_sha256");
    expect(migration).toContain("raw_copy_retained', false");
    expect(migration).not.toMatch(/final_copy\s+text/i);
  });

  it("guards optional Supabase roles and grants no client mutation access", () => {
    expect(migration).toContain("FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']");
    expect(migration).toContain("IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)");
    const serviceRevoke = migration.indexOf(
      "REVOKE ALL ON TABLE public.owned_demand_publication_proofs FROM service_role",
    );
    const serviceGrant = migration.indexOf(
      "GRANT SELECT, INSERT ON TABLE public.owned_demand_publication_proofs TO service_role",
    );
    expect(serviceRevoke).toBeGreaterThanOrEqual(0);
    expect(serviceGrant).toBeGreaterThan(serviceRevoke);
    expect(migration).not.toContain(
      "GRANT UPDATE ON TABLE public.owned_demand_publication_proofs TO service_role",
    );
    expect(migration).not.toContain("GRANT SELECT, INSERT ON TABLE public.owned_demand_publication_proofs TO authenticated");
  });
});
