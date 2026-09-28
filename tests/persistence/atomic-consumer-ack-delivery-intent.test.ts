import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260928160000_atomic_consumer_ack_delivery_intent.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");

describe("atomic consumer acknowledgment delivery intent migration", () => {
  it("wraps v2 and derives acknowledgment eligibility from the stored lead", () => {
    const functionStart = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.capture_public_lead_v3",
    );
    const functionEnd = migration.indexOf("END;\n$$;", functionStart);
    const body = migration.slice(functionStart, functionEnd);

    expect(functionStart).toBeGreaterThan(-1);
    expect(functionEnd).toBeGreaterThan(functionStart);
    expect(body).toContain("public.capture_public_lead_v2(");
    expect(body).toContain("FROM public.leads");
    expect(body).toContain("consent_email");
    expect(body).toContain("consent_timestamp");
    expect(body).toContain("consent_language_version");
    expect(body).toContain("consent_language_text");
    expect(body).toContain("communication_suppressed");
    expect(body).toContain("email_suppressed");
    expect(body).toContain("is_test");
  });

  it("creates one PII-minimized, idempotent consumer outbox row", () => {
    expect(migration).toContain("'consumer_ack'");
    expect(migration).toContain("'customer'");
    expect(migration).toContain("'email_configured'");
    expect(migration).toContain("ON CONFLICT (idempotency_key) DO NOTHING");
    expect(migration).toContain("canonical_consumer_ack_outbox_invariant_failed");
    expect(migration).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(migration).not.toContain("LEAD_NOTIFICATION_BCC");
    expect(migration).not.toContain("RESEND_API_KEY");
    expect(migration).not.toContain("SMTP_PASSWORD");
  });

  it("is additive, server-only, and leaves v2 as the rollback target", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB, JSONB)",
    );
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("point the application back to capture_public_lead_v2");
    expect(migration).toContain(
      "DROP FUNCTION IF EXISTS public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB, JSONB)",
    );
  });
});
