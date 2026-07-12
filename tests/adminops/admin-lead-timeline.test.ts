import { describe, expect, it } from "vitest";
import {
  buildLeadTimeline,
  normalizeAuditTimelineEvent,
  normalizeAppointmentTimelineEvent,
  normalizeFollowupTimelineEvent,
  normalizeNotificationTimelineEvent,
} from "../../app/lib/adminLeadTimeline";

describe("AdminOps lead timeline", () => {
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

    expect(lifecycle).toEqual({
      id: "audit-life",
      occurred_at: "2026-07-12T12:00:00.000Z",
      type: "lifecycle",
      label: "Lifecycle changed to dead",
      actor: "system/admin_basic_auth",
      detail: "Reason: unresponsive",
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
    expect(assignment?.actor).toBe("AdminOps");
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
    expect(notification).toEqual({
      id: "notification-1",
      occurred_at: "2026-07-12T11:05:00.000Z",
      type: "notification",
      label: "Notification retry scheduled",
      actor: "AdminOps",
      detail: "agent assignment / email",
    });
    expect(JSON.stringify([lifecycle, assignment, notification])).not.toContain("example.test");
    expect(JSON.stringify([lifecycle, assignment, notification])).not.toContain("2525550100");
    expect(JSON.stringify([lifecycle, assignment, notification])).not.toContain("raw_provider_payload");
  });

  it("builds newest-first timeline and suppresses duplicate events", () => {
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
      "Lead captured",
      "Attribution captured",
    ]);
    expect(JSON.stringify(timeline)).not.toContain("jane@example.test");
    expect(JSON.stringify(timeline)).not.toContain("2525550100");
    expect(JSON.stringify(timeline)).not.toContain("service-role");
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
    expect(appointment).toEqual({
      id: "appointment-appointment-1-confirmed",
      occurred_at: "2026-07-12T14:00:00.000Z",
      type: "appointment",
      label: "Appointment confirmed",
      actor: "AdminOps",
      detail: "Starts 2026-07-12T15:00:00.000Z (America/New_York)",
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
    expect(followup).toEqual({
      id: "followup-task-1-open",
      occurred_at: "2026-07-12T12:00:00.000Z",
      type: "followup",
      label: "Follow-up open",
      actor: "AdminOps",
      detail: "appointment confirmation due 2026-07-12T16:00:00.000Z",
    });
    expect(JSON.stringify([appointment, followup])).not.toContain("secret-token");
    expect(JSON.stringify([appointment, followup])).not.toContain("agent@example.test");
    expect(JSON.stringify([appointment, followup])).not.toContain("252-555-0100");
    expect(JSON.stringify([appointment, followup])).not.toContain("Authorization");
  });
});
