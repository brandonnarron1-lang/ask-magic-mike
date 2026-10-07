import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

const transport = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({ neon: () => transport }));
import { loadNeonAdminLeadInbox, loadNeonAdminLeadDetail } from "../../app/lib/persistence/neonAdminLeadView";
import { loadNeonAdminTodayQueue } from "../../app/lib/persistence/neonAdminTodayView";
import { loadNeonAdminReportingSummary } from "../../app/lib/persistence/neonAdminReportingView";

const analyst: LeadCenterPrincipal = {
  userId: "synthetic-analyst", role: "read_only_analyst", name: "SYNTHETIC ANALYST",
  email: "analyst@example.test", agentId: "00000000-0000-4000-8000-000000009901",
};
describe("conversion repository permission checks precede all SQL", () => {
  beforeEach(() => {
    transport.query.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic-only.invalid/unused");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("an analyst with an agentId still cannot read an inbox", async () => {
    expect(await loadNeonAdminLeadInbox(50, analyst)).toMatchObject({ error: "lead_center_lead_permission_required", leads: [] });
    expect(transport.query).not.toHaveBeenCalled();
  });
  it("an analyst with an agentId still cannot read contact/detail/timeline", async () => {
    expect(await loadNeonAdminLeadDetail("00000000-0000-4000-8000-000000000001", analyst)).toMatchObject({ error: "lead_center_lead_permission_required", lead: null, timeline: [] });
    expect(transport.query).not.toHaveBeenCalled();
  });
  it("an analyst with an agentId still cannot obtain Today actions", async () => {
    expect(await loadNeonAdminTodayQueue(analyst)).toMatchObject({ error: "lead_center_lead_permission_required", items: [] });
    expect(transport.query).not.toHaveBeenCalled();
  });
  it("approved-agent role cannot bypass the report:view policy at the repository", async () => {
    expect(await loadNeonAdminReportingSummary(30, { ...analyst, role: "approved_agent" })).toMatchObject({ error: "lead_center_report_permission_required", rows: [] });
    expect(transport.query).not.toHaveBeenCalled();
  });
});
