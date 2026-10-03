import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aiArtifactPermissionAllowed } from "@/lib/ai/neon-intelligence";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Agent Command Center security boundaries", () => {
  it("binds task and appointment mutations to the authorized parent and record version", () => {
    const neon = read("app/lib/persistence/neonAdminAppointmentFollowupOps.ts");
    const legacy = read("app/lib/persistence/supabase/adminAppointmentFollowupOps.ts");
    for (const source of [neon, legacy]) {
      expect(source).toContain("leadId: string");
      expect(source).toContain("expectedUpdatedAt: string | null");
      expect(source).toContain("stale_appointment_version");
      expect(source).toContain("stale_followup_version");
      expect(source).toMatch(/lead_id\s*=\s*\$|lead_id.*eq\./);
      expect(source).toContain("updated_at");
    }
  });

  it("reserves budget and resolves permissions before any model call", () => {
    const route = read("app/api/admin/copilot/route.ts");
    const facts = read("src/lib/ai/neon-intelligence.ts");
    expect(facts).toContain("communication_permissions");
    expect(route.indexOf("loadLeadIntelligenceFacts(")).toBeLessThan(route.indexOf("reserveAiBudget({"));
    expect(route.indexOf("aiArtifactPermissionAllowed(permissionRows, parsed.data.artifactType)")).toBeLessThan(route.indexOf("reserveAiBudget({"));
    expect(route.indexOf("reserveAiBudget({")).toBeLessThan(route.indexOf("generateAiLeadIntelligence(facts"));
    expect(route).toContain("test_record_ai_draft_blocked");
    expect(route).toContain("suppressed_lead_ai_draft_blocked");
    expect(route).not.toContain("catch(() => [{ cost: 0 }])");
  });

  it("requires the exact channel and requested-service purpose before drafting communication", () => {
    const permissions = [{
      channel: "email",
      purpose: "appointment_coordination",
      state: "allowed",
      manual_review_required: false,
    }];
    expect(aiArtifactPermissionAllowed(permissions, "lead_summary")).toBe(true);
    expect(aiArtifactPermissionAllowed(permissions, "email_draft")).toBe(false);
    expect(aiArtifactPermissionAllowed([
      { ...permissions[0], purpose: "requested_service_response" },
    ], "email_draft")).toBe(true);
    expect(aiArtifactPermissionAllowed([
      { ...permissions[0], purpose: "requested_service_response", manual_review_required: true },
    ], "email_draft")).toBe(false);
  });

  it("fails closed before the async worker can mutate a Preview database", () => {
    const worker = read("app/api/admin/copilot/jobs/process/route.ts");
    expect(worker).toContain("assertDatabaseMutationAllowed()");
    expect(worker.indexOf("assertDatabaseMutationAllowed()")).toBeLessThan(worker.indexOf("neon(process.env.DATABASE_URL)"));
  });

  it("expires reviewed drafts when current scoped facts no longer match", () => {
    const reviewRoute = read("app/api/admin/copilot/drafts/[draftKey]/route.ts");
    expect(reviewRoute).toContain("leadFactsFingerprint(currentFacts.facts)");
    expect(reviewRoute).toContain("stale_draft_facts");
    expect(reviewRoute).toContain("'expire'");
    expect(reviewRoute).toContain("sendsCommunication: false");
  });

  it("keeps search PII out of the URL and scopes reporting in SQL", () => {
    const search = read("app/admin/leads/lead-search-panel.tsx");
    const reporting = read("app/lib/persistence/neonAdminReportingView.ts");
    expect(search).toContain('method: "POST"');
    expect(search).toContain("not placed in the URL");
    expect(reporting).toContain("l.assigned_agent_id = $2::uuid");
    expect(reporting).toContain("first_touch_source");
    expect(reporting).toContain("outcome_types");
  });

  it("fails closed when a Neon admin read has no authenticated principal", () => {
    const sources = [
      read("app/lib/persistence/neonAdminTodayView.ts"),
      read("app/lib/persistence/neonAdminLeadView.ts"),
      read("app/lib/persistence/neonAdminActivityView.ts"),
      read("app/lib/persistence/neonAdminReportingView.ts"),
    ];
    for (const source of sources) expect(source).toContain("lead_center_principal_required");
  });

  it("does not hide a missing Today review store as an empty successful queue", () => {
    const today = read("app/lib/persistence/neonAdminTodayView.ts");
    expect(today).toContain("public.lead_action_reviews");
    expect(today).not.toContain(").catch(() => [])");
  });
});
