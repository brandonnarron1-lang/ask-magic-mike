"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasLeadCenterPermission } from "../../../src/lib/admin/rbac-policy";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { loadAdminTodayQueue, mutateTodayActionReview } from "../../lib/adminTodayView";
import { updateFollowupTask } from "../../lib/adminAppointmentFollowupOps";

function safeAction(value: unknown): "snoozed" | "dismissed" | null {
  return value === "snoozed" || value === "dismissed" ? value : null;
}

function finish(code: string): never {
  revalidatePath("/admin/today");
  revalidatePath("/admin/action-queue");
  redirect(`/admin/today?today_action=${encodeURIComponent(code)}`);
}

export async function reviewTodayAction(formData: FormData) {
  const principal = await requireLeadCenterPermission("lead:view_assigned");
  if (!principal) finish("rbac_not_enabled");
  const actionId = String(formData.get("action_id") || "");
  const leadId = String(formData.get("lead_id") || "");
  const status = safeAction(formData.get("review_status"));
  const expectedReviewVersion = Number.parseInt(String(formData.get("review_version") || "0"), 10);
  const expectedRecordVersion = String(formData.get("record_version") || "");
  const reason = String(formData.get("reason") || "").trim().slice(0, 160);
  if (!status || !actionId || !leadId || !Number.isInteger(expectedReviewVersion) || expectedReviewVersion < 0) {
    finish("invalid_action");
  }
  if (status === "dismissed" && reason.length < 3) finish("dismissal_reason_required");

  const queue = await loadAdminTodayQueue(principal);
  const current = queue.items.find((item) => item.id === actionId && item.leadId === leadId);
  if (!current) finish("stale_action");
  if (!hasLeadCenterPermission(principal.role, current.requiredPermission)) finish("forbidden");
  if (current.recordVersion !== expectedRecordVersion || current.reviewVersion !== expectedReviewVersion) {
    finish("stale_action");
  }

  const result = await mutateTodayActionReview({
    leadId,
    actionKey: current.actionKey,
    status,
    reason: reason || (status === "snoozed" ? "Operator snoozed for one day" : null),
    snoozeUntil: status === "snoozed" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    expectedVersion: expectedReviewVersion,
    actorUserId: principal.userId,
  });
  finish(result.ok ? status : result.error);
}

export async function completeTodayTask(formData: FormData) {
  const principal = await requireLeadCenterPermission("task:manage_assigned");
  if (!principal) finish("rbac_not_enabled");
  const actionId = String(formData.get("action_id") || "");
  const leadId = String(formData.get("lead_id") || "");
  const expectedRecordVersion = String(formData.get("record_version") || "");
  const queue = await loadAdminTodayQueue(principal);
  const current = queue.items.find((item) => item.id === actionId && item.leadId === leadId);
  if (!current || current.actionKind !== "complete_task" || !current.taskId || current.blockers.length) finish("stale_action");
  if (!hasLeadCenterPermission(principal.role, current.requiredPermission)) finish("forbidden");
  if (current.recordVersion !== expectedRecordVersion) finish("stale_action");
  const result = await updateFollowupTask({
    leadId,
    taskId: current.taskId,
    expectedUpdatedAt: current.recordVersion === "unknown" ? null : current.recordVersion,
    action: "complete",
    actor: `lead_center:${principal.userId}`,
  });
  revalidatePath(`/admin/leads/${leadId}`);
  finish(result.ok ? "completed" : result.error);
}
