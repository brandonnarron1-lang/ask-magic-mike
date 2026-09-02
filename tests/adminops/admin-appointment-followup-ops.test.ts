import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDailyActionQueue,
  buildDailyActionQueueWithCoverage,
  canTransitionAppointment,
  createAppointment,
  createFollowupTask,
  disabledCalendarAdapter,
  transitionAppointment,
  updateFollowupTask,
  validateAppointmentWindow,
} from "../../app/lib/adminAppointmentFollowupOps";

const NOW = new Date("2026-07-12T14:00:00.000Z");
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const APPOINTMENT_ID = "22222222-2222-4222-8222-222222222222";
const TASK_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
  delete (process.env as Record<string, string | undefined>).VERCEL_ENV;
  delete (process.env as Record<string, string | undefined>).DATABASE_ENV;
  delete (process.env as Record<string, string | undefined>).PREVIEW_DATA_MODE;
  delete (process.env as Record<string, string | undefined>).ALLOW_PREVIEW_DB_MUTATION;
});

describe("AdminOps appointment and follow-up operations", () => {
  it("refuses appointment and follow-up mutations in Preview read-only mode before Supabase calls", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = ["fake", "service", "role"].join("-");
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(createAppointment({ leadId: LEAD_ID })).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });
    await expect(transitionAppointment({ appointmentId: APPOINTMENT_ID, status: "scheduled" })).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });
    await expect(createFollowupTask({
      leadId: LEAD_ID,
      taskType: "appointment_confirmation",
      dueAt: "2026-07-12T16:00:00.000Z",
    })).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });
    await expect(updateFollowupTask({ taskId: TASK_ID, action: "complete" })).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("defines the canonical appointment transition map", () => {
    expect(canTransitionAppointment("requested", "scheduled")).toBe(true);
    expect(canTransitionAppointment("scheduled", "confirmed")).toBe(true);
    expect(canTransitionAppointment("confirmed", "completed")).toBe(true);
    expect(canTransitionAppointment("confirmed", "no_show")).toBe(true);
    expect(canTransitionAppointment("canceled", "reschedule_requested")).toBe(true);
    expect(canTransitionAppointment("reschedule_requested", "scheduled")).toBe(true);
    expect(canTransitionAppointment("completed", "scheduled")).toBe(false);
    expect(canTransitionAppointment("no_show", "completed")).toBe(false);
  });

  it("validates appointment date ranges and timezone server-side", () => {
    expect(validateAppointmentWindow({
      status: "scheduled",
      startsAt: null,
      endsAt: null,
      timezone: "America/New_York",
    })).toBe("appointment_start_required");
    expect(validateAppointmentWindow({
      status: "scheduled",
      startsAt: "2026-07-12T15:00:00.000Z",
      endsAt: "2026-07-12T14:00:00.000Z",
      timezone: "America/New_York",
    })).toBe("appointment_end_before_start");
    expect(validateAppointmentWindow({
      status: "requested",
      startsAt: null,
      endsAt: null,
      timezone: "Not/AZone",
    })).toBe("invalid_timezone");
    expect(validateAppointmentWindow({
      status: "confirmed",
      startsAt: "2026-07-12T15:00:00.000Z",
      endsAt: "2026-07-12T16:00:00.000Z",
      timezone: "America/New_York",
    })).toBeNull();
  });

  it("keeps the external calendar adapter disabled by default", async () => {
    const appointment = {
      id: "appointment-disabled",
      lead_id: "lead-1",
      assigned_agent_id: "agent-1",
      status: "scheduled" as const,
      starts_at: "2026-07-12T15:00:00.000Z",
      ends_at: "2026-07-12T16:00:00.000Z",
      timezone: "America/New_York",
      location_type: "office",
      location_label: "Notification Sandbox office",
      meeting_url: null,
      requested_at: "2026-07-12T12:00:00.000Z",
      confirmed_at: null,
      completed_at: null,
      canceled_at: null,
      cancellation_reason: null,
      created_at: "2026-07-12T12:00:00.000Z",
      updated_at: "2026-07-12T12:00:00.000Z",
    };

    await expect(disabledCalendarAdapter.createOrUpdate({
      appointment,
      idempotencyKey: "appointment-disabled:scheduled",
    })).resolves.toEqual({ ok: true, external_event_id: null, status: "disabled" });
    await expect(disabledCalendarAdapter.cancel({
      appointment,
      idempotencyKey: "appointment-disabled:cancel",
    })).resolves.toEqual({ ok: true, external_event_id: null, status: "disabled" });
  });

  it("orders the daily queue by overdue follow-ups, appointment work, stalled leads, and retry review", () => {
    const items = buildDailyActionQueue({
      now: NOW,
      leads: [
        {
          id: "lead-overdue",
          status: "qualified",
          created_at: "2026-07-11T12:00:00.000Z",
          assigned_agent_id: "agent-1",
          address_raw: "100 Fictional Oak Lane",
        },
        {
          id: "lead-requested",
          status: "appointment_requested",
          created_at: "2026-07-10T12:00:00.000Z",
          last_contacted_at: "2026-07-09T12:00:00.000Z",
          address_raw: "200 Fictional Pine Court",
        },
        {
          id: "lead-stalled",
          status: "assigned",
          created_at: "2026-07-10T12:00:00.000Z",
          assigned_agent_id: "agent-2",
          assigned_at: "2026-07-12T08:00:00.000Z",
          address_raw: "300 Fictional Maple Street",
        },
      ],
      appointments: [
        {
          id: "appointment-request",
          lead_id: "lead-requested",
          assigned_agent_id: null,
          status: "requested",
          starts_at: null,
          ends_at: null,
          timezone: "America/New_York",
          location_type: "office",
          location_label: null,
          meeting_url: null,
          requested_at: "2026-07-12T12:00:00.000Z",
          confirmed_at: null,
          completed_at: null,
          canceled_at: null,
          cancellation_reason: null,
          created_at: "2026-07-12T12:00:00.000Z",
          updated_at: "2026-07-12T12:00:00.000Z",
        },
      ],
      tasks: [
        {
          id: "task-overdue",
          lead_id: "lead-overdue",
          agent_id: "agent-1",
          title: "appointment confirmation",
          body: null,
          due_at: "2026-07-12T12:00:00.000Z",
          status: "open",
          priority: "urgent",
          category: "followup:appointment_confirmation",
          created_at: "2026-07-11T12:00:00.000Z",
          updated_at: "2026-07-11T12:00:00.000Z",
        },
      ],
      notifications: [
        {
          id: "notification-retry",
          lead_id: "lead-overdue",
          agent_id: "agent-1",
          status: "retry_scheduled",
          next_attempt_at: "2026-07-12T18:00:00.000Z",
        },
      ],
    });

    expect(items.map((item) => item.type)).toEqual([
      "overdue_followup",
      "appointment_request_unscheduled",
      "stalled_lead",
      "notification_retry",
    ]);
    expect(items[0]).toMatchObject({
      lead_label: "100 Fictional Oak Lane",
      owner: "agent-1",
      assigned_agent_id: "agent-1",
      recommended_action: "Complete or reschedule overdue follow-up",
    });
  });

  it("surfaces the canonical 15-minute first-response risk without waiting for legacy stalled thresholds", () => {
    const items = buildDailyActionQueue({
      now: NOW,
      leads: [{
        id: "lead-response-risk",
        status: "assigned",
        created_at: "2026-07-12T13:40:00.000Z",
        assigned_agent_id: "agent-1",
        assigned_at: "2026-07-12T13:40:00.000Z",
        first_response_evidence_available: true,
        first_human_response_at: null,
        last_contacted_at: null,
        is_test: false,
        communication_suppressed: false,
      }],
      appointments: [],
      tasks: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(expect.objectContaining({
      id: "first-response-lead-response-risk",
      type: "first_response_overdue",
      priority: 1,
      lead_id: "lead-response-risk",
      assigned_agent_id: "agent-1",
      owner: "agent-1",
      due_at: "2026-07-12T13:55:00.000Z",
      status: "overdue",
      recommended_action: "Complete one-to-one follow-up and record the immutable first-response milestone",
    }));
  });

  it("proves every first-response risk is covered by a direct or existing operator action", () => {
    const direct = buildDailyActionQueueWithCoverage({
      now: NOW,
      firstResponseEvidenceAvailable: true,
      leads: [{
        id: "lead-direct-coverage",
        status: "assigned",
        created_at: "2026-07-12T13:30:00.000Z",
        assigned_agent_id: "agent-1",
        first_response_evidence_available: true,
        first_human_response_at: null,
        last_contacted_at: null,
        is_test: false,
        communication_suppressed: false,
      }],
      appointments: [],
      tasks: [],
    });

    expect(direct.firstResponseCoverage).toEqual({
      evidenceAvailable: true,
      riskCount: 1,
      coveredCount: 1,
      directQueueCount: 1,
      coveredByExistingActionCount: 0,
      uncoveredCount: 0,
    });

    const existing = buildDailyActionQueueWithCoverage({
      now: NOW,
      firstResponseEvidenceAvailable: true,
      leads: [{
        id: "lead-existing-coverage",
        status: "assigned",
        created_at: "2026-07-12T13:30:00.000Z",
        assigned_agent_id: "agent-1",
        first_response_evidence_available: true,
        first_human_response_at: null,
        last_contacted_at: null,
        is_test: false,
        communication_suppressed: false,
      }],
      appointments: [],
      tasks: [{
        id: "task-existing-coverage",
        lead_id: "lead-existing-coverage",
        agent_id: "agent-1",
        title: "first contact",
        body: null,
        due_at: "2026-07-12T13:45:00.000Z",
        status: "open",
        priority: "urgent",
        category: "followup:first_contact",
        created_at: "2026-07-12T13:30:00.000Z",
        updated_at: "2026-07-12T13:30:00.000Z",
      }],
    });

    expect(existing.firstResponseCoverage).toEqual({
      evidenceAvailable: true,
      riskCount: 1,
      coveredCount: 1,
      directQueueCount: 0,
      coveredByExistingActionCount: 1,
      uncoveredCount: 0,
    });
    expect(existing.items.map((item) => item.type)).toEqual(["overdue_followup"]);
  });

  it("fails closed instead of claiming response coverage when immutable evidence is unavailable", () => {
    const built = buildDailyActionQueueWithCoverage({
      now: NOW,
      firstResponseEvidenceAvailable: false,
      leads: [{
        id: "lead-unverifiable-coverage",
        status: "assigned",
        created_at: "2026-07-12T13:30:00.000Z",
        first_response_evidence_available: false,
        first_human_response_at: null,
        last_contacted_at: null,
      }],
      appointments: [],
      tasks: [],
    });

    expect(built.firstResponseCoverage).toEqual({
      evidenceAvailable: false,
      riskCount: 0,
      coveredCount: 0,
      directQueueCount: 0,
      coveredByExistingActionCount: 0,
      uncoveredCount: 0,
    });
    expect(built.items).toEqual([]);
  });

  it("fails closed for excluded, terminal, contacted, responded, stale, or unverifiable response evidence", () => {
    const base = {
      status: "new",
      created_at: "2026-07-12T13:30:00.000Z",
      first_response_evidence_available: true,
      first_human_response_at: null,
      last_contacted_at: null,
      is_test: false,
      communication_suppressed: false,
    };
    const items = buildDailyActionQueue({
      now: NOW,
      leads: [
        { ...base, id: "responded", first_human_response_at: "2026-07-12T13:35:00.000Z" },
        { ...base, id: "contacted", last_contacted_at: "2026-07-12T13:36:00.000Z" },
        { ...base, id: "test", is_test: true },
        { ...base, id: "suppressed", communication_suppressed: true },
        { ...base, id: "terminal", status: "converted" },
        { ...base, id: "unverifiable", first_response_evidence_available: false },
      ],
      appointments: [],
      tasks: [],
    });

    expect(items).toEqual([]);
  });

  it("does not duplicate an existing immediate action for the same lead", () => {
    const items = buildDailyActionQueue({
      now: NOW,
      leads: [{
        id: "lead-existing-action",
        status: "assigned",
        created_at: "2026-07-12T11:30:00.000Z",
        assigned_agent_id: "agent-1",
        assigned_at: "2026-07-12T11:30:00.000Z",
        first_response_evidence_available: true,
        first_human_response_at: null,
        last_contacted_at: null,
      }],
      appointments: [],
      tasks: [{
        id: "task-existing-action",
        lead_id: "lead-existing-action",
        agent_id: "agent-1",
        title: "first contact",
        body: null,
        due_at: "2026-07-12T13:45:00.000Z",
        status: "open",
        priority: "urgent",
        category: "followup:first_contact",
        created_at: "2026-07-12T13:30:00.000Z",
        updated_at: "2026-07-12T13:30:00.000Z",
      }],
    });

    expect(items.map((item) => item.type)).toEqual(["overdue_followup"]);
  });
});
