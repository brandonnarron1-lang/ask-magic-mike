import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const RUNBOOK = readFileSync(path.join(ROOT, "docs/runbooks/PR121_PRODUCTION_CUTOVER.md"), "utf8");
const MIGRATION = readFileSync(path.join(ROOT, "supabase/migrations/20260716043829_infra_02_atomic_lifecycle.sql"), "utf8");
const CONSENT_DECISION = readFileSync(path.join(ROOT, "docs/architecture/PR121_CONSENT_EVIDENCE_DECISION.md"), "utf8");

describe("PR121 production cutover runbook", () => {
  it("places deployment hold before all stack merges", () => {
    expect(RUNBOOK.indexOf("Production Auto-Deployment Hold Procedure")).toBeLessThan(
      RUNBOOK.indexOf("Merge-Commit-Only Stack Sequence"),
    );
    expect(RUNBOOK.indexOf("Pause, disable, or otherwise hold automatic Production deployment")).toBeLessThan(
      RUNBOOK.indexOf("Merge PR #118 into `main`"),
    );
  });

  it("requires corrected preflight source and blob verification before remote preflight", () => {
    expect(RUNBOOK).toContain("Accepted PR #121 at `a6fc33c22ba9951487e2cafc97e2f511eeb6c23e` does not");
    expect(RUNBOOK).toMatch(/must not\s+use the preflight script from accepted PR #121 as-is/);
    expect(RUNBOOK).toContain("Do not integrate only the latest offline commit");
    expect(RUNBOOK).toContain("31719358edc7fab0ea3037907097c0cadffe5254");
    expect(RUNBOOK).toContain("6a18b9cc400e158b5fe980a3716a628be54cfe59");
    expect(RUNBOOK).toContain("a6fc33c22ba9951487e2cafc97e2f511eeb6c23e..<AUTHORITATIVE_EVIDENCE_HEAD>");
    expect(RUNBOOK).toContain("Cherry-picking only the tip commit is prohibited");
    expect(RUNBOOK).toContain("Verify the corrected `scripts/infra-03-contact-identity-preflight.sql` Git");
    expect(RUNBOOK).toContain("git rev-list --reverse");
    expect(RUNBOOK.indexOf("Reviewed Preflight Source Prerequisite")).toBeLessThan(
      RUNBOOK.indexOf("Read-Only Identity Preflight Procedure"),
    );
  });

  it("documents legacy unlinked lead review and migration behavior accurately", () => {
    expect(RUNBOOK).toContain("Legacy Unlinked Lead Review");
    expect(RUNBOOK).toContain("A `legacy_unlinked_lead` row is not proof of a cross-contact collision");
    expect(RUNBOOK).toContain("backfills `request_fingerprint`");
    expect(RUNBOOK).toContain("does not automatically attach a contact");
    expect(RUNBOOK).toContain("does not create `contact_identities` for that lead");
    expect(RUNBOOK).toContain("create a new lead marked through the duplicate path");
    expect(RUNBOOK).toContain("leave the historical lead unlinked");
  });

  it("requires legacy remediation or explicit exception before proceeding", () => {
    expect(RUNBOOK).toContain("`REMEDIATE`");
    expect(RUNBOOK).toContain("`ACCEPT_EXCEPTION`");
    expect(RUNBOOK).toContain("Unresolved `legacy_unlinked_lead` rows remain a migration stop condition");
    expect(RUNBOOK).toContain("Do not record raw email or phone in shared cutover evidence");
    expect(RUNBOOK).toContain("`identity_type = 'legacy_unlinked_lead'`");
  });

  it("keeps migration before PR121 application deployment", () => {
    expect(RUNBOOK.indexOf("Apply the migration only after preflight")).toBeLessThan(
      RUNBOOK.indexOf("Merge PR #121 into `main`"),
    );
    expect(RUNBOOK.indexOf("Merge PR #121 into `main`")).toBeLessThan(
      RUNBOOK.indexOf("Deploy the resulting `main` SHA"),
    );
  });

  it("verifies exact RPC signatures against the migration", () => {
    const signatures = [
      "public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)",
      "public.request_public_appointment_v1(uuid,uuid,text,timestamptz)",
      "public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)",
      "public.mutate_admin_assignment_v1(uuid,uuid,uuid,text,text,text,timestamptz)",
    ];
    for (const signature of signatures) {
      expect(RUNBOOK).toContain(`to_regprocedure('${signature}')`);
    }
    expect(MIGRATION).toContain("CREATE OR REPLACE FUNCTION public.capture_public_lead_v1(");
    expect(MIGRATION).toContain("CREATE OR REPLACE FUNCTION public.request_public_appointment_v1(");
    expect(MIGRATION).toContain("CREATE OR REPLACE FUNCTION public.mutate_admin_lead_status_v1(");
    expect(MIGRATION).toContain("CREATE OR REPLACE FUNCTION public.mutate_admin_assignment_v1(");
  });

  it("contains all required hard stop conditions", () => {
    for (const phrase of [
      "source branch SHA mismatch",
      "corrected preflight script blob SHA mismatch",
      "any preflight blocker row",
      "any unresolved `legacy_unlinked_lead` row without recorded owner disposition",
      "missing backup/restore checkpoint reference",
      "missing `SUPABASE_SERVICE_ROLE_KEY` presence or Production scope",
      "grant/RLS verification failure",
      "smoke-test failure",
    ]) {
      expect(RUNBOOK).toContain(phrase);
    }
  });

  it("does not claim a reverse migration exists or contain obvious secret values", () => {
    expect(RUNBOOK).toContain("No verified reverse migration exists for PR #121");
    expect(RUNBOOK).not.toMatch(/postgres(?:ql)?:\/\/\S+/i);
    expect(RUNBOOK).not.toMatch(/Authorization:\s*Bearer\s+\S+/i);
    expect(RUNBOOK).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(RUNBOOK).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/);
  });
});

describe("PR121 consent evidence decision", () => {
  it("keeps technical recommendation separate from owner approval", () => {
    expect(CONSENT_DECISION).toContain("Technical Fact");
    expect(CONSENT_DECISION).toContain("Technical Recommendation");
    expect(CONSENT_DECISION).toContain("ACCEPT_EXPLICIT_DEFERRAL is the current technical recommendation");
    expect(CONSENT_DECISION).toContain("OWNER_DECISION_PENDING");
    expect(CONSENT_DECISION).toContain(
      "Owner must explicitly choose either to accept durable consent-row evidence as a",
    );
    expect(CONSENT_DECISION).not.toContain("ACCEPT_EXPLICIT_DEFERRAL_APPROVED");
  });
});
