import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const RUNBOOK = path.join(ROOT, "docs/runbooks/PR121_PRODUCTION_CUTOVER.md");

describe("PR121 production cutover runbook", () => {
  const text = readFileSync(RUNBOOK, "utf8");

  it("contains every required release checkpoint", () => {
    for (const phrase of [
      "Scope And Immutable Assumptions",
      "Required Owner Access",
      "askmagicmike-domain-bridge-v29",
      "ask-magic-mike-4miw",
      "ask-magic-mike",
      "nellyselly-mvp",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "Production Auto-Deployment Hold Procedure",
      "Merge-Commit-Only Stack Sequence",
      "Branch Deletion Timing",
      "Backup And Restore Checkpoint",
      "Read-Only Identity Preflight Procedure",
      "Exact Preflight Stop Conditions",
      "Migration Application Procedure Placeholders",
      "Migration Verification Queries",
      "Required Grant And RLS Checks",
      "Required Public Lead Smoke Checks",
      "Required Idempotent Replay Checks",
      "Required Appointment-Request Checks",
      "Required Admin Same-State And Concurrency Checks",
      "Required Notification Outbox Checks",
      "Provider And Client Analytics Duplication Checks",
      "Production Traffic Re-Enable Criteria",
      "Automatic Deployment Re-Enable Criteria",
      "Rollback Decision Matrix",
      "Operator Log Template",
    ]) {
      expect(text).toContain(phrase);
    }
  });

  it("does not contain obvious secret-value patterns", () => {
    expect(text).not.toMatch(/postgres(?:ql)?:\/\/\S+/i);
    expect(text).not.toMatch(/Authorization:\s*Bearer\s+\S+/i);
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(text).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/);
  });
});
