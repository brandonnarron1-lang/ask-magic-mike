"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasLeadCenterPermission } from "../../../src/lib/admin/rbac-policy";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { loadAdminTodayQueue, mutateTodayActionReview } from "../../lib/adminTodayView";
import { updateFollowupTask } from "../../lib/adminAppointmentFollowupOps";
import type { ConversionMutationResult } from "../../components/admin/ConversionMutationForm";

function safeAction(value: unknown): "snoozed" | "dismissed" | null {
  return value === "snoozed" || value === "dismissed" ? value : null;
}

function finish(code: string, formData: FormData, responseMode?: "inline", ok = false): ConversionMutationResult {
  revalidatePath("/admin/today");
  revalidatePath("/admin/action-queue");
  if (responseMode === "inline" && formData.get("response_mode") === "inline") {
    return ok ? { ok: true, ...(code === "completed" ? {} : { warning: code }) } : { ok: false, error: code };
  }
  redirect(`/admin/today?today_action=${encodeURIComponent(code)}`);
}

export async function reviewTodayAction(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function reviewTodayAction(formData: FormData): Promise<never>;
export async function reviewTodayAction(formData: FormData, responseMode?: "inline") {
  const principal = await requireLeadCenterPermission("lead:view_assigned");
  if (!principal) return finish("rbac_not_enabled", formData, responseMode);
  const actionId = String(formData.get("action_id") || "");
  const leadId = String(formData.get("lead_id") || "");
  const status = safeAction(formData.get("review_status"));
  const expectedReviewVersion = Number.parseInt(String(formData.get("review_version") || "0"), 10);
  const expectedRecordVersion = String(formData.get("record_version") || "");
  const reason = String(formData.get("reason") || "").trim().slice(0, 160);
  if (!status || !actionId || !leadId || !Number.isInteger(expectedReviewVersion) || expectedReviewVersion < 0) {
    return finish("invalid_action", formData, responseMode);
  }
  if (status === "dismissed" && reason.length < 3) return finish("dismissal_reason_required", formData, responseMode);

  const queue = await loadAdminTodayQueue(principal);
  const current = queue.items.find((item) => item.id === actionId && item.leadId === leadId);
  if (!current) return finish("stale_action", formData, responseMode);
  if (!hasLeadCenterPermission(principal.role, current.requiredPermission)) return finish("forbidden", formData, responseMode);
  if (current.recordVersion !== expectedRecordVersion || current.reviewVersion !== expectedReviewVersion) {
    return finish("stale_action", formData, responseMode);
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
  return finish(result.ok ? status : result.error, formData, responseMode, result.ok);
}

export async function completeTodayTask(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function completeTodayTask(formData: FormData): Promise<never>;
export async function completeTodayTask(formData: FormData, responseMode?: "inline") {
  const principal = await requireLeadCenterPermission("task:manage_assigned");
  if (!principal) return finish("rbac_not_enabled", formData, responseMode);
  const actionId = String(formData.get("action_id") || "");
  const leadId = String(formData.get("lead_id") || "");
  const expectedRecordVersion = String(formData.get("record_version") || "");
  const queue = await loadAdminTodayQueue(principal);
  const current = queue.items.find((item) => item.id === actionId && item.leadId === leadId);
  if (!current || current.actionKind !== "complete_task" || !current.taskId || current.blockers.length) return finish("stale_action", formData, responseMode);
  if (!hasLeadCenterPermission(principal.role, current.requiredPermission)) return finish("forbidden", formData, responseMode);
  if (current.recordVersion !== expectedRecordVersion) return finish("stale_action", formData, responseMode);
  const token = formData.get("idempotency_key");
  const input = {
    leadId,
    taskId: current.taskId,
    expectedUpdatedAt: current.recordVersion === "unknown" ? null : current.recordVersion,
    action: "complete" as const,
    actor: `lead_center:${principal.userId}`,
    idempotencyKey: typeof token === "string" && token.trim() ? token.trim() : undefined,
  };
  const result = await updateFollowupTask(input);
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/reporting");
    revalidatePath("/admin/growth");
  }
  // Task completion is not evidence of a human response; never infer that milestone.
  return finish(result.ok ? result.warning || "completed" : result.error, formData, responseMode, result.ok);
}
