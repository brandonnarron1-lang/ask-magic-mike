import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260902012000_atomic_public_lead_delivery_intent.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");

describe("atomic public lead delivery intent migration", () => {
  it("keeps the complete lead envelope and canonical email outbox in one function", () => {
    const functionStart = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.capture_public_lead_v2",
    );
    const functionEnd = migration.indexOf("END;\n$$;", functionStart);
    const body = migration.slice(functionStart, functionEnd);

    expect(functionStart).toBeGreaterThan(-1);
    expect(functionEnd).toBeGreaterThan(functionStart);
    expect(body).toContain("public.capture_public_lead_v1(");
    expect(body).toContain("'disabled'");
    expect(body).toContain("UPDATE public.leads");
    expect(body).toContain("score_factors");
    expect(body).toContain("request_idempotency_key");
    expect(body).toContain("UPDATE public.source_attribution");
    expect(body).toContain("first_touch");
    expect(body).toContain("last_touch");
    expect(body).toContain("click_ids");
    expect(body).toContain("INSERT INTO public.consents");
    expect(body).toContain("INSERT INTO public.lead_notifications");
    expect(body).toContain("'lead_alert'");
    expect(body).toContain("'internal'");
    expect(body).toContain("ON CONFLICT (idempotency_key) DO NOTHING");
    expect(body).toContain("canonical_lead_alert_outbox_invariant_failed");
  });

  it("stores no configured email address, BCC, provider secret, or message body", () => {
    expect(migration).toContain("'email_configured'");
    expect(migration).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(migration).not.toContain("LEAD_NOTIFICATION_BCC");
    expect(migration).not.toContain("RESEND_API_KEY");
    expect(migration).not.toContain("SMTP_PASSWORD");
  });

  it("keeps execution server-only and preserves a one-function rollback", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.capture_public_lead_v2(JSONB, JSONB, JSONB, TEXT, JSONB)",
    );
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain(
      "DROP FUNCTION IF EXISTS public.capture_public_lead_v2(JSONB, JSONB, JSONB, TEXT, JSONB)",
    );
  });
});
