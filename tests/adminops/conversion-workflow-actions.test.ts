import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permission: vi.fn(), leadPermission: vi.fn(), revalidate: vi.fn(), redirect: vi.fn(),
  createAppointment: vi.fn(), transitionAppointment: vi.fn(), createFollowupTask: vi.fn(),
  updateFollowupTask: vi.fn(), recordHumanFollowthrough: vi.fn(), firstResponse: vi.fn(),
  updateStatus: vi.fn(), statusActionFor: vi.fn(), queue: vi.fn(), review: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../../src/lib/admin/rbac-session", () => ({ requireLeadCenterPermission: mocks.permission, requireLeadCenterLeadPermission: mocks.leadPermission }));
vi.mock("../../app/lib/adminAppointmentFollowupOps", () => ({
  createAppointment: mocks.createAppointment, transitionAppointment: mocks.transitionAppointment,
  createFollowupTask: mocks.createFollowupTask, updateFollowupTask: mocks.updateFollowupTask,
  recordHumanFollowthrough: mocks.recordHumanFollowthrough,
}));
vi.mock("../../app/lib/adminLeadActions", () => ({ recordAdminFirstHumanResponse: mocks.firstResponse, updateAdminLeadStatus: mocks.updateStatus, statusActionFor: mocks.statusActionFor }));
vi.mock("../../app/lib/adminTodayView", () => ({ loadAdminTodayQueue: mocks.queue, mutateTodayActionReview: mocks.review }));

import { createAppointmentAction, transitionAppointmentAction, createFollowupTaskAction, updateFollowupTaskAction, recordFirstHumanResponseAction, recordHumanFollowthroughAction, updateLeadStatusAction } from "../../app/admin/leads/actions";
import { completeTodayTask, reviewTodayAction } from "../../app/admin/today/actions";

const principal = { userId: "operator-1", role: "approved_agent", agentId: "agent-1", email: "qa@example.test", name: "QA operator" };
const leadId = "11111111-1111-4111-8111-111111111111";

function data(extra: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    lead_id: leadId, return_to: `/admin/leads/${leadId}`, response_mode: "inline",
    idempotency_key: "one-logical-action", confirm: "yes", timezone: "America/New_York", ...extra,
  })) form.set(key, value);
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue(principal);
  mocks.leadPermission.mockResolvedValue(principal);
  mocks.redirect.mockImplementation((url) => { throw new Error(`redirect:${url}`); });
  for (const mutation of [mocks.createAppointment, mocks.transitionAppointment, mocks.createFollowupTask, mocks.updateFollowupTask, mocks.recordHumanFollowthrough, mocks.firstResponse, mocks.updateStatus, mocks.review]) mutation.mockResolvedValue({ ok: true, id: "record-1", status: "done", internalEvidence: "must not escape" });
  mocks.statusActionFor.mockReturnValue({ requiresConfirmation: true });
  mocks.queue.mockResolvedValue({ items: [{ id: "action-1", leadId, taskId: "task-1", actionKind: "complete_task", blockers: [], requiredPermission: "task:manage_assigned", recordVersion: "version-1", reviewVersion: 0, actionKey: "task:task-1" }] });
});

describe("conversion workflow server action boundaries", () => {
  it("returns only a safe inline result, preserves permission scope, derives actor and passes token", async () => {
    await expect(createAppointmentAction(data({ status: "scheduled", starts_at: "2026-10-06T15:30" }), "inline")).resolves.toEqual({ ok: true });
    expect(mocks.leadPermission).toHaveBeenCalledWith(leadId, "lead:update_assigned");
    expect(mocks.createAppointment).toHaveBeenCalledWith(expect.objectContaining({ leadId, startsAt: "2026-10-06T19:30:00.000Z", actor: "lead_center:operator-1", idempotencyKey: "one-logical-action" }));
    expect(mocks.redirect).not.toHaveBeenCalled();
    for (const route of ["/admin/today", "/admin/reporting", "/admin/growth", `/admin/leads/${leadId}`]) expect(mocks.revalidate).toHaveBeenCalledWith(route);
  });

  it.each(["scheduled", "confirmed", "completed", "no_show", "canceled", "reschedule_requested"])("requires explicit server confirmation for appointment %s", async (status) => {
    await expect(transitionAppointmentAction(data({ status, confirm: "no" }), "inline")).resolves.toEqual({ ok: false, error: "confirmation_required" });
    expect(mocks.transitionAppointment).not.toHaveBeenCalled();
  });

  it.each([
    ["2026-03-08T02:30", "nonexistent_conversion_time"],
    ["2026-11-01T01:30", "ambiguous_conversion_time"],
  ])("rejects unsafe DST wall time %s before mutation", async (starts_at, error) => {
    await expect(createAppointmentAction(data({ starts_at }), "inline")).resolves.toEqual({ ok: false, error });
    expect(mocks.createAppointment).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("does not expose persistence details or redirect on conflict", async () => {
    mocks.transitionAppointment.mockResolvedValue({ ok: false, statusCode: 409, error: "stale_appointment_version", sensitive: "not returned" });
    await expect(transitionAppointmentAction(data({ appointment_id: "appointment-1", record_version: "version-1", status: "completed", actor: "attacker" }), "inline")).resolves.toEqual({ ok: false, error: "stale_appointment_version" });
    expect(mocks.transitionAppointment).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: "appointment-1", expectedUpdatedAt: "version-1", actor: "lead_center:operator-1", idempotencyKey: "one-logical-action" }));
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("retains redirects for old one-argument forms and refuses unsafe return locations", async () => {
    await expect(createFollowupTaskAction(data({ return_to: "/admin/leads/../../evil?contact=private", task_type: "manual_callback", due_at: "2026-10-07T10:00" }))).rejects.toThrow("redirect:/admin/leads?followup_action=updated");
  });

  it("uses the same safe result contract for known errors and warnings", async () => {
    mocks.createFollowupTask.mockResolvedValueOnce({ ok: false, statusCode: 400, error: "invalid_followup_type" });
    await expect(createFollowupTaskAction(data({ due_at: "2026-10-07T10:00" }), "inline")).resolves.toEqual({ ok: false, error: "invalid_followup_type" });
    mocks.updateFollowupTask.mockResolvedValueOnce({ ok: true, warning: "followup_status_already_current", id: "task-1" });
    await expect(updateFollowupTaskAction(data(), "inline")).resolves.toEqual({ ok: true, warning: "followup_status_already_current" });
  });

  it("converts task due time using declared timezone and never infers first response", async () => {
    await createFollowupTaskAction(data({ due_at: "2026-10-07T10:00", task_type: "first_contact" }), "inline");
    expect(mocks.createFollowupTask).toHaveBeenCalledWith(expect.objectContaining({ dueAt: "2026-10-07T14:00:00.000Z", idempotencyKey: "one-logical-action", actor: "lead_center:operator-1" }));
    await updateFollowupTaskAction(data({ task_id: "task-1", task_action: "complete", record_version: "version-1" }), "inline");
    expect(mocks.leadPermission).toHaveBeenCalledWith(leadId, "task:manage_assigned");
    expect(mocks.firstResponse).not.toHaveBeenCalled();
  });

  it("keeps first-human-response evidence explicitly confirmed and server-attributed", async () => {
    await expect(recordFirstHumanResponseAction(data({ confirm: "no" }), "inline")).resolves.toEqual({ ok: false, error: "confirmation_required" });
    expect(mocks.firstResponse).not.toHaveBeenCalled();
    await recordFirstHumanResponseAction(data({ actor: "forged" }), "inline");
    expect(mocks.firstResponse).toHaveBeenCalledWith(leadId, { actor: "lead_center:operator-1" });
  });

  it("preserves revenue permission checks", async () => {
    await expect(updateLeadStatusAction(data({ status: "converted", outcome_amount_usd: "100" }), "inline")).resolves.toEqual({ ok: false, error: "revenue_permission_required" });
    expect(mocks.updateStatus).not.toHaveBeenCalled();
  });

  it("does not mutate under a missing server principal", async () => {
    mocks.leadPermission.mockResolvedValue(null);
    await expect(createAppointmentAction(data(), "inline")).resolves.toEqual({ ok: false, error: "rbac_not_enabled" });
    expect(mocks.createAppointment).not.toHaveBeenCalled();
  });

  it("Today still rechecks its server queue, required permission, blockers, lead and version", async () => {
    const form = data({ action_id: "action-1", record_version: "stale" });
    await expect(completeTodayTask(form, "inline")).resolves.toEqual({ ok: false, error: "stale_action" });
    expect(mocks.updateFollowupTask).not.toHaveBeenCalled();
    form.set("record_version", "version-1");
    await expect(completeTodayTask(form, "inline")).resolves.toEqual({ ok: true });
    expect(mocks.updateFollowupTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: "task-1", expectedUpdatedAt: "version-1", action: "complete", actor: "lead_center:operator-1", idempotencyKey: "one-logical-action" }));
    expect(mocks.firstResponse).not.toHaveBeenCalled();
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/reporting");
  });

  it("Today retains old redirects and does not turn warnings into clean success", async () => {
    mocks.updateFollowupTask.mockResolvedValue({ ok: true, warning: "followup_status_already_current" });
    await expect(completeTodayTask(data({ action_id: "action-1", record_version: "version-1" }))).rejects.toThrow("redirect:/admin/today?today_action=followup_status_already_current");
  });

  it("Today dismissal still requires a reason and records operator identity", async () => {
    const form = data({ action_id: "action-1", record_version: "version-1", review_version: "0", review_status: "dismissed", reason: "" });
    await expect(reviewTodayAction(form, "inline")).resolves.toEqual({ ok: false, error: "dismissal_reason_required" });
    expect(mocks.review).not.toHaveBeenCalled();
    form.set("reason", "Not needed now");
    await reviewTodayAction(form, "inline");
    expect(mocks.review).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: "operator-1", expectedVersion: 0, reason: "Not needed now" }));
  });
});

describe("manual interaction with atomic next-task boundary", () => {
  const missingRequiredFields: Array<Record<string, string>> = [{ note: " " }, { due_at: "" }];
  function interaction(extra: Record<string, string> = {}) {
    return data({ channel: "phone", interaction_result: "attempted", task_type: "manual_callback", due_at: "2026-10-07T10:00", note: "Operator-entered note", ...extra });
  }

  it("passes explicit channel/result and one token to a single interaction-plus-task mutation", async () => {
    await expect(recordHumanFollowthroughAction(interaction(), "inline")).resolves.toEqual({ ok: true });
    expect(mocks.leadPermission).toHaveBeenCalledWith(leadId, "lead:update_assigned");
    expect(mocks.leadPermission).toHaveBeenCalledWith(leadId, "task:manage_assigned");
    expect(mocks.recordHumanFollowthrough).toHaveBeenCalledWith({ leadId, channel: "phone", result: "attempted", taskType: "manual_callback", dueAt: "2026-10-07T14:00:00.000Z", timezone: "America/New_York", note: "Operator-entered note", idempotencyKey: "one-logical-action", actor: "lead_center:operator-1" });
    expect(mocks.createFollowupTask).not.toHaveBeenCalled();
    expect(mocks.firstResponse).not.toHaveBeenCalled();
  });

  it.each(["attempted", "no_answer"])("rejects first-response confirmation for %s without saving", async (interaction_result) => {
    await expect(recordHumanFollowthroughAction(interaction({ interaction_result, confirm_first_response: "yes" }), "inline")).resolves.toEqual({ ok: false, error: "conversation_confirmation_required" });
    expect(mocks.recordHumanFollowthrough).not.toHaveBeenCalled();
    expect(mocks.firstResponse).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed two-way conversation before any mutation", async () => {
    await expect(recordHumanFollowthroughAction(interaction({ interaction_result: "two_way_conversation" }), "inline")).resolves.toEqual({ ok: false, error: "conversation_confirmation_required" });
    expect(mocks.recordHumanFollowthrough).not.toHaveBeenCalled();
    expect(mocks.firstResponse).not.toHaveBeenCalled();
  });

  it("passes confirmed conversation evidence to the one atomic mutation, never a separate response write", async () => {
    await recordHumanFollowthroughAction(interaction({ interaction_result: "two_way_conversation", confirm_first_response: "yes" }), "inline");
    expect(mocks.recordHumanFollowthrough).toHaveBeenCalledWith(expect.objectContaining({ result: "two_way_conversation", actor: "lead_center:operator-1" }));
    expect(mocks.firstResponse).not.toHaveBeenCalled();
  });

  it.each(missingRequiredFields)("rejects missing required note or due time before the atomic call", async (missing) => {
    await expect(recordHumanFollowthroughAction(interaction(missing), "inline")).resolves.toMatchObject({ ok: false });
    expect(mocks.recordHumanFollowthrough).not.toHaveBeenCalled();
  });

  it("does not record first response if the atomic interaction/task mutation failed", async () => {
    mocks.recordHumanFollowthrough.mockResolvedValue({ ok: false, error: "interaction_create_failed" });
    await expect(recordHumanFollowthroughAction(interaction({ interaction_result: "two_way_conversation", confirm_first_response: "yes" }), "inline")).resolves.toEqual({ ok: false, error: "interaction_create_failed" });
    expect(mocks.firstResponse).not.toHaveBeenCalled();
  });
});
