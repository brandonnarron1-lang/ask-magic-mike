import { describe, expect, it } from "vitest";
import {
  buildLeadTimeline,
  buildLeadTimelinePage,
  normalizeAuditTimelineEvent,
  normalizeAppointmentTimelineEvent,
  normalizeFollowupTimelineEvent,
  normalizeNotificationTimelineEvent,
  normalizeOutcomeTimelineEvent,
} from "../../app/lib/adminLeadTimeline";

describe("AdminOps lead timeline", () => {
  it("renders canonical QA suppression evidence with a stable protected timeline identity", () => {
    const result = normalizeAuditTimelineEvent({ id: "qa-audit", action: "lead.qa_suppressed", actor: "system/public_lead_capture", after_state: { is_test: true, email: "private@example.test" }, metadata: { raw_provider_payload: "never render" } });
    expect(result).toMatchObject({ id: "audit:qa-audit", event_type: "lead.qa_suppressed", snapshot: false, label: "QA capture suppressed", actor: "system/public_lead_capture" });
    expect(JSON.stringify(result)).not.toContain("private@example.test");
    expect(JSON.stringify(result)).not.toContain("raw_provider_payload");
  });
  it("normalizes lifecycle, assignment, and notification events without raw payloads", () => {
    const lifecycle = normalizeAuditTimelineEvent({
      id: "audit-life",
      created_at: "2026-07-12T12:00:00.000Z",
      actor: "system/admin_basic_auth",
      action: "lead.lifecycle_changed",
      before_state: { status: "qualified", email: "agent@example.test" },
      after_state: { status: "dead", reason: "unresponsive", phone: "2525550100" },
      metadata: { raw_provider_payload: { secret: "not shown" } },
    });

    expect(lifecycle).toMatchObject({
      id: "audit:audit-life",
      source_id: "audit-life",
      source_type: "audit",
      event_type: "lead.lifecycle_changed",
      occurred_at: "2026-07-12T12:00:00.000Z",
      recorded_at: "2026-07-12T12:00:00.000Z",
      type: "lifecycle",
      label: "Lifecycle changed to dead",
      summary: "Lifecycle changed to dead",
      actor: "system/admin_basic_auth",
      detail: "Reason: unresponsive",
      snapshot: false,
    });

    const assignment = normalizeAuditTimelineEvent({
      id: "audit-assign",
      created_at: "2026-07-12T11:00:00.000Z",
      actor: "agent@example.test",
      action: "lead.assigned",
      before_state: { assigned_agent_id: null },
      after_state: { assigned_agent_id: "agent-1", assignment_status: "assigned to 2525550100" },
      metadata: { assignment_action: "assigned", Authorization: "Bearer service-role-value" },
    });
    expect(assignment?.label).toBe("Lead assigned");
    expect(assignment?.actor).toBe("Protected actor");
    expect(assignment?.detail).toBe("assigned to [redacted phone]");

    const notification = normalizeNotificationTimelineEvent({
      id: "notification-1",
      created_at: "2026-07-12T11:05:00.000Z",
      status: "retry_scheduled",
      type: "agent_assignment",
      channel: "email",
      provider: "authorization: Bearer service-role-value",
      provider_response: { raw: "not shown" },
    });
    expect(notification).toMatchObject({
      id: "notification:notification-1:snapshot",
      source_type: "notification",
      occurred_at: "2026-07-12T11:05:00.000Z",
      type: "notification",
      label: "Notification retry scheduled",
      actor: "Protected actor",
      detail: "agent assignment / email",
      snapshot: true,
    });
    expect(JSON.stringify([lifecycle, assignment, notification])).not.toContain("example.test");
    expect(JSON.stringify([lifecycle, assignment, notification])).not.toContain("2525550100");
    expect(JSON.stringify([lifecycle, assignment, notification])).not.toContain("raw_provider_payload");
  });

  it("renders first-response evidence without exposing milestone metadata", () => {
    const response = normalizeAuditTimelineEvent({
      id: "audit-response",
      created_at: "2026-08-20T12:07:00.000Z",
      actor: "lead_center:operator-1",
      action: "lead.first_human_response_recorded",
      after_state: { first_human_response_at: "2026-08-20T12:07:00.000Z" },
      metadata: { private_note: "do not render", source: "admin_lead_detail" },
    });
    expect(response).toMatchObject({
      id: "audit:audit-response",
      source_type: "audit",
      occurred_at: "2026-08-20T12:07:00.000Z",
      type: "response",
      label: "First human response recorded",
      actor: "lead_center:operator-1",
      detail: "Immutable speed-to-lead evidence recorded",
    });
    expect(JSON.stringify(response)).not.toContain("private_note");
  });

  it("builds newest-first timeline and preserves distinct stable source events", () => {
    const timeline = buildLeadTimeline({
      lead: {
        id: "lead-1",
        created_at: "2026-07-10T12:00:00.000Z",
        attribution_summary: "widget / jane@example.test / 2525550100 / Authorization: Bearer service-role-value",
        lead_source_surface: "widget jane@example.test",
      },
      auditRows: [
        {
          id: "audit-1",
          created_at: "2026-07-12T12:00:00.000Z",
          action: "lead.lifecycle_changed",
          before_state: { status: "contacted" },
          after_state: { status: "qualified" },
          metadata: {},
        },
        {
          id: "audit-dupe",
          created_at: "2026-07-12T12:00:00.000Z",
          action: "lead.lifecycle_changed",
          before_state: { status: "contacted" },
          after_state: { status: "qualified" },
          metadata: {},
        },
      ],
      notificationRows: [],
    });

    expect(timeline.map((event) => event.label)).toEqual([
      "Lifecycle changed to qualified",
      "Lifecycle changed to qualified",
      "Attribution captured",
      "Lead captured",
    ]);
    expect(JSON.stringify(timeline)).not.toContain("jane@example.test");
    expect(JSON.stringify(timeline)).not.toContain("2525550100");
    expect(JSON.stringify(timeline)).not.toContain("service-role");
  });

  it("keeps delayed events and page boundaries deterministic while exposing partial sources", () => {
    const input = {
      lead: {
        id: "lead-page",
        created_at: "2026-07-10T10:00:00.000Z",
        attribution_summary: "No attribution captured",
        lead_source_surface: "home value",
      },
      auditRows: [
        {
          id: "audit-equal-b",
          created_at: "2026-07-12T13:00:00.000Z",
          action: "lead.lifecycle_changed",
          after_state: { status: "qualified" },
          metadata: { occurred_at: "2026-07-12T12:00:00.000Z" },
        },
        {
          id: "audit-equal-a",
          created_at: "2026-07-12T13:00:00.000Z",
          action: "lead.lifecycle_changed",
          after_state: { status: "qualified" },
          metadata: { occurred_at: "2026-07-12T12:00:00.000Z" },
        },
        {
          id: "audit-delayed",
          created_at: "2026-07-13T13:00:00.000Z",
          action: "lead.lifecycle_changed",
          after_state: { status: "contacted" },
          metadata: { occurred_at: "2026-07-11T12:00:00.000Z" },
        },
        {
          id: "audit-delayed",
          created_at: "2026-07-13T13:00:00.000Z",
          action: "lead.lifecycle_changed",
          after_state: { status: "contacted" },
          metadata: { occurred_at: "2026-07-11T12:00:00.000Z" },
        },
      ],
      incompleteSources: ["communications", "communications"],
    };

    const first = buildLeadTimelinePage(input, { offset: 0, limit: 2 });
    const second = buildLeadTimelinePage(input, { offset: 2, limit: 2 });

    expect(first.events.map((item) => item.id)).toEqual([
      "audit:audit-equal-a",
      "audit:audit-equal-b",
    ]);
    expect(second.events.map((item) => item.id)).toEqual([
      "audit:audit-delayed",
      "lead:lead-page:captured",
    ]);
    expect(new Set([...first.events, ...second.events].map((item) => item.id)).size).toBe(4);
    expect(first).toMatchObject({
      hasMore: true,
      complete: false,
      incompleteSources: ["communications"],
      loadedCount: 4,
    });
    expect(second.hasMore).toBe(false);
  });

  it("normalizes appointment and follow-up events without exposing unsafe metadata", () => {
    const appointment = normalizeAppointmentTimelineEvent({
      id: "appointment-1",
      status: "confirmed",
      starts_at: "2026-07-12T15:00:00.000Z",
      timezone: "America/New_York",
      meeting_url: "https://calendar.example.test/secret-token",
      location_label: "Private customer address",
      updated_at: "2026-07-12T14:00:00.000Z",
    });
    expect(appointment).toMatchObject({
      id: "appointment:appointment-1:snapshot",
      source_type: "appointment",
      occurred_at: "2026-07-12T14:00:00.000Z",
      type: "appointment",
      label: "Appointment confirmed",
      actor: "Unknown actor",
      detail: "Starts 2026-07-12T15:00:00.000Z (America/New_York)",
      snapshot: true,
    });

    const followup = normalizeFollowupTimelineEvent({
      id: "task-1",
      status: "open",
      category: "followup:appointment_confirmation",
      due_at: "2026-07-12T16:00:00.000Z",
      created_by: "agent@example.test",
      body: "Call +1 252-555-0100 with Authorization: Bearer token",
      updated_at: "2026-07-12T12:00:00.000Z",
    });
    expect(followup).toMatchObject({
      id: "task:task-1:snapshot",
      source_type: "task",
      occurred_at: "2026-07-12T12:00:00.000Z",
      type: "followup",
      label: "Follow-up open",
      actor: "Protected actor",
      detail: "appointment confirmation due 2026-07-12T16:00:00.000Z",
      snapshot: true,
    });
    expect(JSON.stringify([appointment, followup])).not.toContain("secret-token");
    expect(JSON.stringify([appointment, followup])).not.toContain("agent@example.test");
    expect(JSON.stringify([appointment, followup])).not.toContain("252-555-0100");
    expect(JSON.stringify([appointment, followup])).not.toContain("Authorization");
  });

  it("shows an outcome milestone without leaking revenue or metadata into the timeline", () => {
    const outcome = normalizeOutcomeTimelineEvent({
      id: "outcome-1",
      outcome_type: "closed",
      amount_usd: 15000.25,
      source_system: "admin_lead_lifecycle",
      metadata: { actor: "agent@example.test", note: "Private commission note" },
      occurred_at: "2026-08-19T20:05:00.000Z",
    });
    expect(outcome).toMatchObject({
      id: "outcome:outcome-1",
      source_type: "outcome",
      occurred_at: "2026-08-19T20:05:00.000Z",
      type: "outcome",
      label: "Outcome closed",
      actor: "Unknown actor",
      detail: "Canonical business outcome recorded",
      snapshot: false,
    });
    expect(JSON.stringify(outcome)).not.toContain("15000");
    expect(JSON.stringify(outcome)).not.toContain("example.test");
    expect(JSON.stringify(outcome)).not.toContain("commission");
  });
});
