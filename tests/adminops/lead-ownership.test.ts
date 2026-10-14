import { describe, expect, it } from "vitest";
import { leadOwnership } from "../../app/lib/leadOwnership";
import { normalizeAdminLeadRow } from "../../app/lib/persistence/supabase/adminLeadView";
import { lockScreenPresentation, presentLead } from "../../app/lib/leadPresentation";
import { normalizeAuditTimelineEvent } from "../../app/lib/adminLeadTimeline";

const principal = { userId: "synthetic", role: "approved_agent" as const, name: "Synthetic", email: "agent@example.test", agentId: "owner" };
const fixture = (values: Record<string, unknown> = {}) => normalizeAdminLeadRow({ id: "synthetic-inquiry", inquiry_owner_agent_id: "owner", inquiry_owner_agent_name: "SYNTHETIC OWNER", ...values });
describe("read ownership, never a fabricated assignment", () => {
  it("direct assignment uses the directory name", () => {
    expect(leadOwnership(fixture({ assigned_agent_id: "owner" }))).toMatchObject({ state: "Assigned", inherited: false, label: "SYNTHETIC OWNER · directly assigned" });
  });
  it("inherited read ownership does not complete a direct assignment event or grant contact/update", () => {
    const lead = fixture(); const before = JSON.stringify(lead);
    const view = presentLead({ lead, principal, tier: "assigned" });
    expect(view.custodian).toBe("SYNTHETIC OWNER · inherited from canonical lead");
    expect(view.identity).toBeDefined();
    expect(view.steps.find(s => s.label === "Assignment")?.state).toBe("pending");
    expect(view.actions.filter(a => a.id !== "open").every(a => !a.href && a.disabledReason)).toBe(true);
    expect(JSON.stringify(lead)).toBe(before);
  });
  it("absent ownership is Unassigned, not a guessed Mike", () => {
    expect(leadOwnership(fixture({ inquiry_owner_agent_id: null }))).toMatchObject({ id: null, state: "Unassigned", label: "Unassigned" });
  });
  it("unresolved name does not discard recorded ownership", () => {
    expect(leadOwnership(fixture({ inquiry_owner_agent_name: null })).label).toBe("Ownership recorded — name unavailable · inherited from canonical lead");
  });
  it("denied role/other agent cannot project identity or owner; lock screen redacts owner name", () => {
    for (const p of [{ ...principal, agentId: "other" }, { ...principal, role: "read_only_analyst" as const }]) {
      expect(() => presentLead({ lead: fixture(), principal: p, tier: "assigned" })).toThrow("lead_presentation_forbidden");
    }
    expect(lockScreenPresentation(presentLead({ lead: fixture(), principal, tier: "assigned" })).custodian).toBe("Private in Lead Center");
  });
  it("immutable incident is reachable in the existing timeline without claiming receipt", () => {
    const event = normalizeAuditTimelineEvent({ id: "synthetic-audit", action: "lead.first_live_escalation", actor: "system:first-live-monitor", metadata: { reasons: ["missing_assignment"], raw_payload: "not displayed" } });
    expect(event?.summary).toContain("operator review required");
    expect(event?.detail).toContain("not proof an alert was received");
    expect(JSON.stringify(event)).not.toContain("not displayed");
  });
});
