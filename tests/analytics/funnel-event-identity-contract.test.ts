import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("funnel-event identity operating contract", () => {
  it("keeps pseudonymous analytics from occupying the canonical session primary key", () => {
    const repository = read("src/lib/persistence/neon/analytics-event-repository.ts");
    expect(repository).toContain("properties.funnel_session_id = funnelSessionId");
    expect(repository).not.toContain("INSERT INTO public.sessions");
  });

  it("recovers an identity synchronously before the first Home Value event", () => {
    const funnel = read("app/components/black-diamond/HomeValueFunnel.tsx");
    expect(funnel).toContain(
      "const activeSubmissionId = submissionId ?? tryCreateBrowserSubmissionId()",
    );
    expect(funnel).toContain("const addressEventOptions = { sessionId: activeSubmissionId }");
    expect(funnel.indexOf("const addressEventOptions")).toBeLessThan(
      funnel.indexOf('trackEvent("home_value_started"'),
    );
  });

  it("keeps the post-release verifier aggregate-only and test-excluded", () => {
    const sql = read("docs/phase9/analysis/funnel_event_identity_integrity.sql");
    expect(sql).toContain("COALESCE(e.session_id::text, e.properties->>'funnel_session_id')");
    expect(sql).toContain("duplicate_server_lead_created_identities");
    expect(sql).toContain("NOT is_test");
    expect(sql).not.toMatch(/\b(?:email|phone|first_name|last_name|address_raw|question_raw)\b/i);
    expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
  });

  it("documents the exhausted historical gate and one later exact release phrase", () => {
    const decision = read("docs/phase9/FUNNEL_EVENT_IDENTITY_INTEGRITY.md");
    expect(decision).toContain("Production unchanged");
    expect(decision).toContain("Historical null-session rows are not backfilled");
    expect(decision).toContain(
      "APPROVE PHASE 9 FUNNEL EVENT IDENTITY INTEGRITY MERGE AND PRODUCTION DEPLOYMENT",
    );
    expect(decision).not.toContain(
      "APPROVE PHASE 9 CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT",
    );
  });
});
