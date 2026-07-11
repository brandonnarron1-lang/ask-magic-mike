import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(process.cwd(), "supabase/migrations/00005_routing.sql");
const notificationMigration = "20260710221617_lead_notifications_outbox.sql";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("routing migration Postgres 17 compatibility", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("keeps SLA deadline columns as ordinary timestamptz columns", () => {
    expect(migration).toMatch(/accept_deadline\s+TIMESTAMPTZ\s+NOT NULL,/);
    expect(migration).toMatch(/contact_deadline\s+TIMESTAMPTZ\s+NOT NULL,/);
    expect(migration).not.toMatch(/accept_deadline[\s\S]*?GENERATED ALWAYS AS/);
    expect(migration).not.toMatch(/contact_deadline[\s\S]*?GENERATED ALWAYS AS/);
  });

  it("maintains the original 2-minute and 5-minute SLA mapping in the trigger", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.set_lead_routing_sla_deadlines()");
    expect(migration).toContain("NEW.accept_deadline := NEW.assigned_at + INTERVAL '2 minutes';");
    expect(migration).toContain("NEW.contact_deadline := NEW.assigned_at + INTERVAL '5 minutes';");
  });

  it("fires only for inserts and deadline-driving updates", () => {
    expect(migration).toContain("CREATE TRIGGER lead_routing_sla_deadlines_biu");
    expect(migration).toContain("BEFORE INSERT OR UPDATE OF assigned_at, accept_deadline, contact_deadline");
    expect(migration).toContain("ON public.lead_routing");
  });

  it("keeps deadline lookup indexes intact", () => {
    expect(migration).toContain("CREATE INDEX idx_lead_routing_accept_deadline ON lead_routing(accept_deadline)");
    expect(migration).toContain("CREATE INDEX idx_lead_routing_contact_deadline ON lead_routing(contact_deadline)");
  });

  it("keeps the notification migration later in the chain", () => {
    const migrations = readdirSync(resolve(process.cwd(), "supabase/migrations")).sort();
    expect(migrations.indexOf("00005_routing.sql")).toBeGreaterThanOrEqual(0);
    expect(migrations.indexOf(notificationMigration)).toBeGreaterThan(
      migrations.indexOf("00005_routing.sql")
    );
  });

  it("does not add remote migration commands to local replay docs", () => {
    const decision = read("docs/LOCAL_ROUTING_MIGRATION_POSTGRES17_DECISION.md");
    expect(decision).not.toMatch(/\bsupabase\s+link\b/);
    expect(decision).not.toMatch(/\bsupabase\s+db\s+push\b/);
    expect(decision).not.toContain("--linked");
  });
});
