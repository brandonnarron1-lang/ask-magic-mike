/**
 * Operation Foundation — Security & Data Integrity Tests
 *
 * Verifies the fixes applied in the enterprise foundation hardening:
 * - /api/scoring/compute requires admin auth
 * - /api/routing/accept requires admin auth
 * - ADMIN_SECRET is not accepted via URL query parameter
 * - Intake submit response strips agent internals
 * - lead_grade validated against allowlist in admin PATCH
 * - SLA sweep recordBreach is idempotent
 * - upsertProperty uses upsert not blind insert
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (rel: string) => readFileSync(resolve(process.cwd(), "src", rel), "utf-8");

// ── Auth guards on previously unauthenticated routes ─────────────────────────

describe("POST /api/scoring/compute — auth guard", () => {
  const src = read("app/api/scoring/compute/route.ts");

  it("imports checkAdminAuth", () => {
    expect(src).toContain("checkAdminAuth");
  });

  it("calls checkAdminAuth before reading any lead data", () => {
    const authIdx = src.indexOf("checkAdminAuth(req)");
    const leadIdx = src.indexOf('from("leads")');
    expect(authIdx).toBeGreaterThan(-1);
    expect(leadIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(leadIdx);
  });
});

describe("POST /api/routing/accept — auth guard", () => {
  const src = read("app/api/routing/accept/route.ts");

  it("imports checkAdminAuth", () => {
    expect(src).toContain("checkAdminAuth");
  });

  it("calls checkAdminAuth before touching lead_routing", () => {
    const authIdx = src.indexOf("checkAdminAuth(req)");
    const routingIdx = src.indexOf('from("lead_routing")');
    expect(authIdx).toBeGreaterThan(-1);
    expect(routingIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(routingIdx);
  });
});

// ── Admin secret must never be accepted via URL ───────────────────────────────

describe("checkAdminAuth — no URL query param", () => {
  const src = read("lib/admin/auth.ts");

  it("does not read admin_secret from searchParams", () => {
    expect(src).not.toContain("searchParams.get");
    expect(src).not.toContain('searchParams.get("admin_secret")');
  });

  it("only reads from x-admin-secret header", () => {
    expect(src).toContain('get("x-admin-secret")');
  });
});

// ── Intake submit must not leak agent internals ───────────────────────────────

describe("POST /api/intake/submit — agent data stripping", () => {
  const src = read("app/api/intake/submit/route.ts");

  it("does not return the full routingDecision object", () => {
    expect(src).not.toContain("routing: routingDecision,");
  });

  it("returns only a boolean assignment indicator", () => {
    expect(src).toContain("routing: routingDecision ? { assigned: true } : null");
  });
});

// ── lead_grade validated against allowlist ───────────────────────────────────

describe("Admin PATCH /api/admin/leads/[id] — lead_grade validation", () => {
  const src = read("app/api/admin/leads/[id]/route.ts");

  it("imports LEAD_GRADES", () => {
    expect(src).toContain("LEAD_GRADES");
  });

  it("validates lead_grade against the allowlist", () => {
    expect(src).toContain("LEAD_GRADES as readonly string[]");
  });
});

// ── SLA sweep idempotency ─────────────────────────────────────────────────────

describe("SLA sweep recordBreach — idempotency", () => {
  const src = read("lib/engines/sla-sweep.ts");

  it("checks for an existing compliance_flag before inserting", () => {
    expect(src).toContain("maybeSingle");
    expect(src).toContain("if (existing) return");
  });
});

// ── Property repository uses upsert ──────────────────────────────────────────

describe("upsertProperty — uses actual upsert", () => {
  const src = read("lib/db/property-repository.ts");

  it("uses .upsert() not .insert()", () => {
    expect(src).toContain(".upsert(");
    expect(src).not.toContain(".insert(");
  });

  it("conflicts on lead_id", () => {
    expect(src).toContain('onConflict: "lead_id"');
  });
});

// ── Rate limiting wired to public endpoints ───────────────────────────────────

describe("Public endpoint rate limiting", () => {
  it("intake/submit imports checkRateLimit", () => {
    const src = read("app/api/intake/submit/route.ts");
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("LIMITS.intakeSubmit");
  });

  it("intake/step imports checkRateLimit", () => {
    const src = read("app/api/intake/step/route.ts");
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("LIMITS.intakeStep");
  });

  it("session/create imports checkRateLimit", () => {
    const src = read("app/api/session/create/route.ts");
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("LIMITS.sessionCreate");
  });

  it("analytics/event uses fire-and-forget trackEventNoWait", () => {
    const src = read("app/api/analytics/event/route.ts");
    expect(src).toContain("trackEventNoWait");
    expect(src).not.toContain("await trackEvent(");
  });
});

// ── DB migrations exist ───────────────────────────────────────────────────────

describe("DB migrations — critical columns and constraints", () => {
  const m14 = readFileSync(
    resolve(process.cwd(), "supabase/migrations/00014_leads_missing_columns.sql"),
    "utf-8"
  );
  const m15 = readFileSync(
    resolve(process.cwd(), "supabase/migrations/00015_integrity_constraints.sql"),
    "utf-8"
  );

  it("migration 00014 adds assigned_agent_id column", () => {
    expect(m14).toContain("assigned_agent_id");
  });

  it("migration 00014 adds appointment_requested column", () => {
    expect(m14).toContain("appointment_requested");
  });

  it("migration 00014 expands status CHECK to include spam and escalated", () => {
    expect(m14).toContain("'spam'");
    expect(m14).toContain("'escalated'");
    expect(m14).toContain("'qualified'");
    expect(m14).toContain("'appointment_set'");
  });

  it("migration 00015 adds unique constraint on properties(lead_id)", () => {
    expect(m15).toContain("uq_properties_lead_id");
  });

  it("migration 00015 adds unique constraint on consents(lead_id, consent_type)", () => {
    expect(m15).toContain("uq_consents_lead_consent_type");
  });

  it("migration 00015 adds analytics_events composite index", () => {
    expect(m15).toContain("idx_analytics_events_name_time");
  });
});
