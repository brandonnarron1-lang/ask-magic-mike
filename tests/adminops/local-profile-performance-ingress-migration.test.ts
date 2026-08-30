import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260825033000_local_profile_performance_ingress.sql"),
  "utf8",
);

describe("local-profile performance ingress migration", () => {
  it("is additive, atomic, idempotent, and append-only at the receipt boundary", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.local_profile_performance_import_batches");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.import_local_profile_performance_batch_v1");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("idempotent_replay', true");
    expect(migration).toContain("local_profile_performance_import_batches_reject_change");
    expect(migration).toContain("amm_reject_immutable_change");
    expect(migration).not.toMatch(/DROP TABLE|TRUNCATE TABLE/);
  });

  it("denies browser/service roles and keeps the function owner-connected", () => {
    expect(migration).toContain("SECURITY INVOKER");
    for (const role of ["anon", "authenticated", "service_role"]) {
      expect(migration).toContain(role);
    }
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.import_local_profile_performance_batch_v1");
    expect(migration).toContain("REVOKE ALL ON TABLE public.local_profile_performance_import_batches");
    expect(migration).not.toContain("GRANT EXECUTE");
  });

  it("recomputes scores and fingerprints before any durable write", () => {
    const validation = migration.indexOf("v_expected_batch_fingerprint");
    const write = migration.indexOf("INSERT INTO public.market_signals");
    expect(validation).toBeGreaterThan(0);
    expect(write).toBeGreaterThan(validation);
    expect(migration).toContain("conflicting_local_profile_performance_fingerprint");
    expect(migration).toContain("row_fingerprint' IS DISTINCT FROM encode(extensions.digest");
  });

  it("writes only aggregate evidence and advisory opportunities", () => {
    expect(migration).toContain("public.market_signals");
    expect(migration).toContain("public.market_opportunities");
    expect(migration).toContain("'action_class', 'recommend'");
    expect(migration).toContain("'operator_status_preserved'");
    expect(migration).toContain("'raw_search_terms_retained', false");
    expect(migration).toContain("'provider_location_id_retained', false");
    expect(migration).toContain("'provider_call_performed', false");
    expect(migration).toContain("'profile_mutation_performed', false");
    expect(migration).toContain("'content_published', false");
    expect(migration).not.toMatch(/INSERT INTO public\.leads|lead_notifications|send_email|send_sms/i);
  });

  it("hard-isolates the approved Our Town profile from NellySelly", () => {
    expect(migration).toContain("ourtown_properties_primary");
    expect(migration).not.toContain("nellyselly.com");
  });
});
