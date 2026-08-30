import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260824220000_organic_search_ingress.sql"),
  "utf8",
);

describe("organic-search ingress migration", () => {
  it("is additive, atomic, idempotent, and append-only at the receipt boundary", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.organic_search_import_batches");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.import_organic_search_batch_v1");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("idempotent_replay', true");
    expect(migration).toContain("organic_search_import_batches_reject_change");
    expect(migration).toContain("amm_reject_immutable_change");
    expect(migration).not.toMatch(/DROP TABLE|TRUNCATE TABLE/);
  });

  it("denies browser/service roles and keeps the function owner-connected", () => {
    expect(migration).toContain("SECURITY INVOKER");
    for (const role of ["anon", "authenticated", "service_role"]) {
      expect(migration).toContain(role);
    }
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.import_organic_search_batch_v1");
    expect(migration).toContain("REVOKE ALL ON TABLE public.organic_search_import_batches");
    expect(migration).not.toContain("GRANT EXECUTE");
  });

  it("writes only minimized page evidence and advisory opportunities", () => {
    expect(migration).toContain("public.market_signals");
    expect(migration).toContain("public.market_opportunities");
    expect(migration).toContain("'action_class', 'recommend'");
    expect(migration).toContain("'operator_status_preserved'");
    expect(migration).toContain("'raw_queries_retained', false");
    expect(migration).toContain("'raw_csv_retained', false");
    expect(migration).toContain("'provider_call_performed', false");
    expect(migration).toContain("'content_published', false");
    expect(migration).not.toMatch(/INSERT INTO public\.leads|lead_notifications|send_email|send_sms/i);
  });

  it("hard-isolates the two owned brands from NellySelly", () => {
    expect(migration).toContain("www.askmagicmike.com");
    expect(migration).toContain("www.ourtownproperties.com");
    expect(migration).not.toContain("nellyselly.com");
  });
});
