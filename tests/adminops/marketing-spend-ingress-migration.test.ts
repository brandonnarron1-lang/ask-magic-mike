import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260824193000_marketing_spend_ingress.sql"),
  "utf8",
);
const postgresContract = readFileSync(
  join(process.cwd(), "supabase/tests/marketing_spend_ingress_pg17.sql"),
  "utf8",
);

describe("marketing-spend ingress migration", () => {
  it("adds one append-only, RLS-protected, minimized receipt ledger", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketing_spend_import_batches");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON public.marketing_spend_import_batches FROM PUBLIC");
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
    expect(migration).toContain("batch_fingerprint text NOT NULL UNIQUE");
    expect(migration).not.toMatch(/raw_(csv|payload|file)\s+(text|jsonb|bytea)/i);
  });

  it("serializes and atomically reconciles channels, campaigns, spend, receipts, and audit", () => {
    expect(migration).toContain("import_marketing_spend_batch_v1");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("INSERT INTO public.marketing_channels");
    expect(migration).toContain("INSERT INTO public.marketing_campaigns");
    expect(migration).toContain("INSERT INTO public.marketing_spend_daily");
    expect(migration).toContain("UPDATE public.marketing_spend_daily");
    expect(migration).toContain("INSERT INTO public.audit_logs");
    expect(migration).toContain("INSERT INTO public.marketing_spend_import_batches");
    expect(migration).toContain("growth.spend_row_revised");
    expect(migration).toContain("growth.marketing_channel_created");
    expect(migration).toContain("growth.marketing_campaign_created");
    expect(migration).toContain("growth.spend_batch_imported");
  });

  it("makes exact replay idempotent and rejects synthetic or conflicting identities", () => {
    expect(migration).toContain("WHERE batch_fingerprint = p_batch_fingerprint");
    expect(migration).toContain("'idempotent_replay', true");
    expect(migration).toContain("(qa|test|demo|synthetic)");
    expect(migration).toContain("existing_channel_identity_conflict");
    expect(migration).toContain("existing_campaign_identity_conflict");
    expect(migration).toContain("conflicting_spend_batch_identity");
  });

  it("cannot grant client mutation access or claim provider, budget, or consumer action", () => {
    expect(migration).toContain("FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']");
    expect(migration).toContain("raw_csv_retained', false");
    expect(migration).toContain("provider_call_performed', false");
    expect(migration).toContain("budget_changed', false");
    expect(migration).toContain("consumer_action_performed', false");
    expect(migration).not.toContain("GRANT EXECUTE ON FUNCTION public.import_marketing_spend_batch_v1(text, jsonb, text, text, text) TO authenticated");
    expect(migration).not.toContain("GRANT EXECUTE ON FUNCTION public.import_marketing_spend_batch_v1(text, jsonb, text, text, text) TO service_role");
    expect(migration).not.toContain("GRANT SELECT, INSERT ON TABLE public.marketing_spend_import_batches TO service_role");
    expect(migration).not.toContain("GRANT UPDATE ON TABLE public.marketing_spend_import_batches");
  });

  it("ships an executable PostgreSQL 17 contract that rolls back every synthetic mutation", () => {
    expect(postgresContract).toContain("import_marketing_spend_batch_v1");
    expect(postgresContract).toContain("idempotent_replay");
    expect(postgresContract).toContain("growth.spend_row_revised");
    expect(postgresContract).toContain("SET LOCAL ROLE authenticated");
    expect(postgresContract).toContain("insufficient_privilege");
    expect(postgresContract).toContain("SQLSTATE '55000'");
    expect(postgresContract).toMatch(/BEGIN;[\s\S]*ROLLBACK;/);
    expect(postgresContract).toContain("INTERNAL_QA_LOCAL_ONLY");
  });
});
