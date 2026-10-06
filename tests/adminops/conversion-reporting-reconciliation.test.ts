// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeReportingLeadRow, reconcileConversionReporting, summarizeReportingRows,
  REPORTING_APPOINTMENT_STATES, parseReportingDrillthroughCursor,
} from "../../app/lib/adminReportingView";
import { loadNeonAdminReportingSummary, loadNeonAdminReportingDrillthrough } from "../../app/lib/persistence/neonAdminReportingView";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

const query = vi.hoisted(() => vi.fn());
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));

const NOW = new Date("2026-10-06T16:00:00.000Z");
const complete = { complete: true, scope: "all_live_leads" as const };
const administrator: LeadCenterPrincipal = {
  userId: "synthetic-admin", role: "administrator", agentId: null,
  email: "admin@example.test", name: "Synthetic administrator",
};
function lead(id: string, extra: Record<string, unknown> = {}) {
  return normalizeReportingLeadRow({ id, created_at: "2026-10-05T12:00:00.000Z", first_touch_source: "owned", ...extra });
}
function appointment(id: string, leadId: string, status: string) {
  return { id, lead_id: leadId, status, created_at: "2026-10-05T13:00:00.000Z" };
}

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); query.mockReset(); });

describe("conversion reporting: pure canonical reconciliation", () => {
  it("reconciles driver-decoded Date values without silently losing a real cohort, appointment or due task", () => {
    const row=lead("driver-date",{created_at:new Date("2026-10-05T12:00:00Z"),assigned_at:new Date("2026-10-05T12:01:00Z")});
    const summary=summarizeReportingRows([row],NOW,30,new Map(),
      [{...appointment("date-appointment",row.id,"requested"),created_at:new Date("2026-10-05T13:00:00Z")}],
      [{id:"date-task",lead_id:row.id,status:"open",due_at:new Date("2026-10-06T12:00:00Z")}],{},complete);
    expect(summary.conversionReporting.totals).toMatchObject({captured:1,appointments:1,appointmentStates:{requested:1}});
    expect(summary.followupOps).toMatchObject({open:1,overdue:1,dueToday:1});
    expect(row.assigned_at).toBe("2026-10-05T12:01:00.000Z");
    expect(lead("bad-date",{created_at:new Date("invalid")}).created_at).toBeNull();
    expect(lead("precise-date",{created_at:"2026-10-05T12:00:00.123456Z"}).created_at).toBe("2026-10-05T12:00:00.123456Z");
  });
  it("declares an inclusive/exclusive UTC lead-capture cohort, dedupes leads, and excludes aliases and non-live rows", () => {
    const rows = [lead("one"), lead("one"), lead("edge", { created_at: "2026-09-06T16:00:00.000Z" }),
      lead("old", { created_at: "2026-09-06T15:59:59.999Z" }), lead("future", { created_at: NOW.toISOString() }),
      lead("test", { is_test: true }), lead("suppressed", { communication_suppressed: true }),
      lead("alias", { is_duplicate: true }), lead("alias-pointer", { duplicate_of_lead_id: "one" }),
      lead("spam", { status: "spam" }), lead("missing-date", { created_at: null })];
    const report = reconcileConversionReporting(rows, NOW, 30, [], complete);
    expect(report.cohort).toEqual({ basis: "lead_created_at", timezone: "UTC", startInclusive: "2026-09-06T16:00:00.000Z",
      endExclusive: NOW.toISOString(), denominator: 2, scope: "all_live_leads", totals: "complete", calculation: "full_scoped_cohort_in_memory" });
    expect(report.sources.reduce((sum, row) => sum + row.captured, 0)).toBe(2);
    expect(report.totals?.appointmentEvidenceUnknown).toBe(2);
  });

  it("counts six exact appointment states by distinct lead, without inferred historical milestones", () => {
    const rows = REPORTING_APPOINTMENT_STATES.map((state) => lead(state));
    const appointments = REPORTING_APPOINTMENT_STATES.map((state) => appointment(`record-${state}`, state, state));
    appointments.push(appointment("completed-again", "completed", "completed"));
    appointments.push(appointment("old-orphan", "out-of-cohort", "completed"));
    appointments.push(appointment("invalid", "requested", "made_up"));
    appointments.push({ ...appointment("future", "requested", "completed"), created_at: NOW.toISOString() });
    appointments.push({ ...appointment("before-capture", "requested", "completed"), created_at: "2026-10-04T12:00:00.000Z" });
    const report = reconcileConversionReporting(rows, NOW, 30, appointments, complete);
    expect(report.totals?.appointmentStates).toEqual({ requested: 1, scheduled: 1, confirmed: 1,
      completed: 1, no_show: 1, canceled: 1 });
    expect(report.totals?.appointments).toBe(6);
    expect(report.totals?.appointmentEvidenceUnknown).toBe(0);
    const completedOnly = reconcileConversionReporting([lead("completed")], NOW, 30,
      [appointment("terminal", "completed", "completed")], complete);
    expect(completedOnly.totals?.appointmentStates).toMatchObject({ requested: 0, scheduled: 0, confirmed: 0, completed: 1 });
  });

  it("reconciles source totals, preserves unknown attribution, and never fabricates contact, appointments, or commission", () => {
    const rows = [lead("closed", { outcome_types: ["closed", "closed"], first_human_response_recorded: true }),
      lead("snapshot-only", { status: "converted", last_contacted_at: "2026-10-05T14:00:00Z" }),
      lead("unattributed", { first_touch_source: null, source: "widget", outcome_types: ["referral_paid"] })];
    const report = reconcileConversionReporting(rows, NOW, 30, [], complete);
    expect(report.totals).toMatchObject({ captured: 3, closedWon: 1, appointments: 0,
      firstHumanResponse: 1, manualAttempted: 0, twoWayContact: 0, manualEvidenceUnknown: 3, commissions: null, outcomeEvidenceUnknown: 1 });
    expect(report.sources.find((row) => row.source === "Unknown first touch")?.captured).toBe(1);
    for (const key of ["captured", "qualified", "firstHumanResponse", "appointments", "closedWon"] as const) {
      expect(report.sources.reduce((sum, row) => sum + row[key], 0)).toBe(report.totals![key]);
    }
    const summary = summarizeReportingRows(rows, NOW, 30, new Map(), [],
      [{ id: "done", lead_id: "snapshot-only", status: "done", category: "followup:manual_callback" }], {}, complete);
    expect(summary.funnel).toMatchObject({ captured: 3, contacted: 1, appointment: 0, converted: 1 });
    expect(summary.sourceConversion[0].commissions).toBeNull();
    expect(summary.appointmentOps.requestToScheduledRate).toBeNull();
    expect(summary.appointmentOps.scheduledToCompletedRate).toBeNull();
  });

  it("counts manual results independently of first-response evidence and dedupes them per lead", () => {
    const rows = [lead("attempt", { manual_attempt_recorded: true }),
      lead("two-way", { manual_attempt_recorded: true, two_way_contact_recorded: true, first_human_response_recorded: true }),
      lead("response-only", { first_human_response_recorded: true })];
    const report = reconcileConversionReporting(rows, NOW, 30, [], complete);
    expect(report.totals).toMatchObject({ captured: 3, manualAttempted: 2, twoWayContact: 1,
      firstHumanResponse: 2, manualEvidenceUnknown: 1 });
  });

  it("supports multiple terminal states for a lead without adding it twice to the appointment denominator", () => {
    const report = reconcileConversionReporting([lead("repeat")], NOW, 30, [
      appointment("canceled", "repeat", "canceled"), appointment("held", "repeat", "completed"),
      appointment("reschedule", "repeat", "reschedule_requested"),
    ], complete);
    expect(report.totals).toMatchObject({ appointments: 1, otherAppointmentStates: 1,
      appointmentStates: { completed: 1, canceled: 1 }, appointmentEvidenceUnknown: 0 });
  });

  it("keeps absent/incomplete evidence distinct from measured zero and undefined rates", () => {
    const unavailable = reconcileConversionReporting([lead("legacy")], NOW, 30);
    expect(unavailable).toMatchObject({ available: false, totals: null, sources: [], cohort: { denominator: null, totals: "unavailable" } });
    const empty = reconcileConversionReporting([], NOW, 30, [], complete);
    expect(empty).toMatchObject({ available: true, cohort: { denominator: 0, totals: "complete" }, totals: { captured: 0, closedWon: 0, conversionRate: null } });
    expect(reconcileConversionReporting([lead("observed")], NOW, 30, [], complete).totals?.conversionRate).toBe(0);
  });

  it("does not cap authoritative totals at 1000 leads or the 50-record UI display", () => {
    const rows = Array.from({ length: 1_205 }, (_, i) => lead(`lead-${i}`));
    const report = reconcileConversionReporting(rows, NOW, 30, [], complete);
    expect(report.cohort.denominator).toBe(1_205);
    expect(report.sources[0].captured).toBe(1_205);
  });

  it("validates stable cursor keys and rejects malformed, expired, future, and different-window cursors", () => {
    const valid = `30~${NOW.toISOString()}~2026-10-05T12:00:00.000Z~00000000-0000-4000-8000-000000000001`;
    expect(parseReportingDrillthroughCursor(valid, 30, NOW)).toMatchObject({ end: NOW, createdAt: "2026-10-05T12:00:00.000Z" });
    for (const token of ["private@example.test", valid + "~extra", valid.replace("30~", "7~"),
      valid.replace(NOW.toISOString(), "2026-10-07T16:00:00.000Z"), valid.replace(NOW.toISOString(), "2026-10-03T16:00:00.000Z")]) {
      expect(parseReportingDrillthroughCursor(token, 30, NOW)).toBeNull();
    }
  });
});

describe("conversion reporting: scoped canonical SQL and protected display", () => {
  function prepare() {
    vi.stubEnv("DATABASE_URL", "postgres://synthetic-only.invalid/not-a-real-db");
    vi.useFakeTimers(); vi.setSystemTime(NOW);
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("AS first_human_response_recorded")) return [lead("one", { has_contact: true })];
      if (sql.includes("AS excluded_test")) return [{ excluded_test: 0, excluded_suppressed: 0, excluded_duplicate: 0 }];
      if (sql.includes("AS canonical_leads")) return [{ canonical_leads: 1 }];
      return [];
    });
  }

  it("refuses missing principals, unauthorized report roles, and missing assignment scopes before querying", async () => {
    prepare();
    expect((await loadNeonAdminReportingSummary(30)).error).toBe("lead_center_principal_required");
    expect((await loadNeonAdminReportingSummary(30, { ...administrator, role: "approved_agent" })).error).toBe("lead_center_report_permission_required");
    const unscoped = await loadNeonAdminReportingSummary(30, { ...administrator, role: "primary_lead_owner" });
    expect(unscoped.error).toBe("lead_center_agent_scope_required");
    expect(unscoped.conversionReporting.cohort.denominator).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("applies owner role scope and the same captured-lead window in every parent SQL query", async () => {
    prepare();
    const owner = { ...administrator, role: "primary_lead_owner" as const, agentId: "00000000-0000-4000-8000-000000009901" };
    const report = await loadNeonAdminReportingSummary(30, owner);
    expect(report.error).toBeUndefined();
    expect(report.conversionReporting.cohort.scope).toBe("assigned_live_leads");
    for (const [sql, params] of query.mock.calls) {
      expect(sql).toContain("l.assigned_agent_id = $2::uuid");
      expect(sql).toContain("l.created_at >= $1::timestamptz AND l.created_at < $3::timestamptz");
      expect(params).toEqual(["2026-09-06T16:00:00.000Z", owner.agentId, NOW.toISOString()]);
    }
    const appointmentSql = query.mock.calls.find(([sql]) => sql.includes("FROM public.lead_appointments"))![0];
    expect(appointmentSql).not.toContain("a.created_at >= $1");
    expect(appointmentSql).not.toMatch(/LIMIT\s+\d+/i);
    expect(query.mock.calls[0][0]).toContain("o.is_test = false AND o.communication_suppressed = false");
  });

  it("keeps analysts aggregate-only at SQL projection and return boundaries", async () => {
    prepare();
    const report = await loadNeonAdminReportingSummary(30, { ...administrator, role: "read_only_analyst" });
    expect(report.conversionReporting.cohort.denominator).toBe(1);
    expect(report.kpis.contactableRate).toBe(100);
    expect(report.rows).toEqual([]); expect(report.hotLeads).toEqual([]);
    expect(report.topPages).toEqual([]); expect(report.agentPerformance).toEqual([]);
    const sql = query.mock.calls[0][0];
    for (const field of ["address_raw", "email", "phone", "page_url", "source_detail", "widget_session_id"]) {
      expect(sql).toContain(`NULL::text AS ${field}`);
    }
    expect(query.mock.calls.some(([sql]) => sql.includes("FROM public.agents"))).toBe(false);
  });

  it("refuses analyst drill-through and scopes a bounded stable keyset query for owners", async () => {
    prepare();
    expect((await loadNeonAdminReportingDrillthrough({ principal: { ...administrator, role: "read_only_analyst" } })).error)
      .toBe("lead_center_drillthrough_permission_required");
    expect(query).not.toHaveBeenCalled();
    const cursor = `30~${NOW.toISOString()}~2026-10-05T12:00:00.000Z~00000000-0000-4000-8000-000000000001`;
    await loadNeonAdminReportingDrillthrough({ principal: { ...administrator, role: "primary_lead_owner", agentId: "00000000-0000-4000-8000-000000009901" }, cursor });
    expect(query.mock.calls[0][0]).toContain("AND l.assigned_agent_id = $2::uuid");
    expect(query.mock.calls[0][0]).toContain("(l.created_at, l.id) < ($4::timestamptz, $5::uuid)");
    expect(query.mock.calls[0][0]).toContain("ORDER BY l.created_at DESC, l.id DESC LIMIT $6::integer");
    expect(query.mock.calls[0][1].at(-1)).toBe(51);
    expect((await loadNeonAdminReportingDrillthrough({ principal: administrator, cursor: "invalid" })).error).toBe("invalid_reporting_cursor");
  });

  it("reports failed reads as unavailable rather than zero, without database error details", async () => {
    prepare(); query.mockRejectedValue(new Error("private database detail and credentials"));
    const report = await loadNeonAdminReportingSummary(30, administrator);
    expect(report.error).toBe("Canonical Neon reporting query failed");
    expect(report.conversionReporting).toMatchObject({ available: false, totals: null, cohort: { denominator: null } });
    expect(JSON.stringify(report)).not.toContain("private database detail");
  });

  it("keeps drill-through permission-bound, hides analyst private sections, and hides fake-zero cards on errors", () => {
    const page = readFileSync("app/admin/reporting/page.tsx", "utf8");
    expect(page).toContain("canAccessAssignedLead(principal, row.assigned_agent_id)");
    expect(page).toContain('if (!principal) redirect("/lead-center-login?error=session")');
    expect(page.indexOf("if (!principal) redirect")).toBeLessThan(page.indexOf("await loadAdminReportingSummary"));
    expect(page).toContain("encodeURIComponent(row.id)");
    expect(page).toContain("!conversion.available ? <EmptyNotice");
    expect(page).toContain("canViewLeads ? <Panel");
    expect(page).toContain("This display limit does not cap any reporting total");
    expect(page).not.toContain("Request → scheduled");
    expect(page).not.toContain("row.page_url || row.id");
  });
});
