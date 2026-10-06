"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  recordAdminFirstHumanResponse,
  statusActionFor,
  updateAdminLeadStatus,
} from "../../lib/adminLeadActions";
import {
  createAppointment,
  createFollowupTask,
  recordHumanFollowthrough,
  transitionAppointment,
  updateFollowupTask,
} from "../../lib/adminAppointmentFollowupOps";
import { requireLeadCenterLeadPermission } from "../../../src/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "../../../src/lib/admin/rbac-policy";
import type { ConversionMutationResult } from "../../components/admin/ConversionMutationForm";
import { resolveConversionDateTime } from "../../lib/conversionTime";

function safeReturnTo(value: string) {
  return /^\/admin\/leads(?:\/[a-zA-Z0-9_-]+)?$/.test(value)
    ? value
    : "/admin/leads";
}

function finish(
  formData: FormData,
  returnTo: string,
  parameter: string,
  result: ConversionMutationResult,
  responseMode?: "inline",
  successCode = "updated",
): ConversionMutationResult {
  // Return only a small result, never the persistence row or submitted draft.
  const response: ConversionMutationResult = result.ok
    ? { ok: true, ...(result.warning ? { warning: result.warning } : {}) }
    : { ok: false, error: result.error };
  if (responseMode === "inline" && formData.get("response_mode") === "inline") return response;
  const code = response.ok ? response.warning || successCode : response.error;
  redirect(`${returnTo}?${parameter}=${encodeURIComponent(code)}`);
}

function refreshConversionViews(leadId: string, result: ConversionMutationResult) {
  if (!result.ok) return;
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/action-queue");
  revalidatePath("/admin/today");
  // Source cohorts depend on lifecycle, appointment, follow-up and response evidence.
  revalidatePath("/admin/reporting");
  revalidatePath("/admin/growth");
}

function idempotencyKey(formData: FormData) {
  const value = formData.get("idempotency_key");
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resolveFormTimes(formData: FormData, names: string[]):
  | { ok: true; timezone: string; times: Record<string, string | null> }
  | { ok: false; error: string } {
  const timezone = String(formData.get("timezone") || "America/New_York");
  try {
    const times: Record<string, string | null> = {};
    for (const name of names) times[name] = resolveConversionDateTime(String(formData.get(name) || ""), timezone);
    return { ok: true, timezone, times };
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_conversion_time";
    return { ok: false, error: ["invalid_appointment_timezone", "invalid_conversion_time", "ambiguous_conversion_time", "nonexistent_conversion_time"].includes(code) ? code : "invalid_conversion_time" };
  }
}

export async function updateLeadStatusAction(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function updateLeadStatusAction(formData: FormData): Promise<never>;
export async function updateLeadStatusAction(formData: FormData, responseMode?: "inline") {
  const leadId = String(formData.get("lead_id") ?? "");
  const principal = await requireLeadCenterLeadPermission(leadId, "lead:update_assigned");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "") || null;
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? "/admin/leads"));
  const confirm = formData.get("confirm") === "yes";
  const action = statusActionFor(status);
  const outcomeAmountUsd = String(formData.get("outcome_amount_usd") ?? "").trim();
  if (!principal) return finish(formData, returnTo, "status_action", { ok: false, error: "rbac_not_enabled" }, responseMode);

  if (
    outcomeAmountUsd &&
    !hasLeadCenterPermission(principal.role, "lead:record_revenue")
  ) {
    return finish(formData, returnTo, "status_action", { ok: false, error: "revenue_permission_required" }, responseMode);
  }

  if (action?.requiresConfirmation && !confirm) {
    return finish(formData, returnTo, "status_action", { ok: false, error: "confirmation_required" }, responseMode);
  }

  const result = await updateAdminLeadStatus(leadId, status, {
    reason,
    outcomeAmountUsd,
    actor: `lead_center:${principal.userId}`,
  });
  refreshConversionViews(leadId, result);
  return finish(formData, returnTo, "status_action", result, responseMode);
}

export async function recordFirstHumanResponseAction(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function recordFirstHumanResponseAction(formData: FormData): Promise<never>;
export async function recordFirstHumanResponseAction(formData: FormData, responseMode?: "inline") {
  const leadId = String(formData.get("lead_id") ?? "");
  const principal = await requireLeadCenterLeadPermission(leadId, "lead:update_assigned");
  const returnTo = safeReturnTo(
    String(formData.get("return_to") ?? `/admin/leads/${leadId}`),
  );
  if (!principal) return finish(formData, returnTo, "response_action", { ok: false, error: "rbac_not_enabled" }, responseMode);
  if (formData.get("confirm") !== "yes") {
    return finish(formData, returnTo, "response_action", { ok: false, error: "confirmation_required" }, responseMode);
  }
  const result = await recordAdminFirstHumanResponse(leadId, {
    actor: `lead_center:${principal.userId}`,
  });
  refreshConversionViews(leadId, result);
  return finish(formData, returnTo, "response_action", result, responseMode, "recorded");
}

export async function createAppointmentAction(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function createAppointmentAction(formData: FormData): Promise<never>;
export async function createAppointmentAction(formData: FormData, responseMode?: "inline") {
  const leadId = String(formData.get("lead_id") ?? "");
  const principal = await requireLeadCenterLeadPermission(leadId, "lead:update_assigned");
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? `/admin/leads/${leadId}`));
  if (!principal) return finish(formData, returnTo, "appointment_action", { ok: false, error: "rbac_not_enabled" }, responseMode);
  if (formData.get("confirm") !== "yes") return finish(formData, returnTo, "appointment_action", { ok: false, error: "confirmation_required" }, responseMode);
  const resolved = resolveFormTimes(formData, ["starts_at", "ends_at"]);
  if (!resolved.ok) return finish(formData, returnTo, "appointment_action", resolved, responseMode);
  const input = {
    leadId,
    status: String(formData.get("status") ?? "requested"),
    startsAt: resolved.times.starts_at,
    endsAt: resolved.times.ends_at,
    timezone: resolved.timezone,
    locationType: String(formData.get("location_type") ?? "") || "office",
    locationLabel: String(formData.get("location_label") ?? "") || null,
    meetingUrl: String(formData.get("meeting_url") ?? "") || null,
    actor: `lead_center:${principal.userId}`,
    idempotencyKey: idempotencyKey(formData),
  };
  const result = await createAppointment(input);
  refreshConversionViews(leadId, result);
  return finish(formData, returnTo, "appointment_action", result, responseMode);
}

export async function transitionAppointmentAction(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function transitionAppointmentAction(formData: FormData): Promise<never>;
export async function transitionAppointmentAction(formData: FormData, responseMode?: "inline") {
  const leadId = String(formData.get("lead_id") ?? "");
  const principal = await requireLeadCenterLeadPermission(leadId, "lead:update_assigned");
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? `/admin/leads/${leadId}`));
  if (!principal) return finish(formData, returnTo, "appointment_action", { ok: false, error: "rbac_not_enabled" }, responseMode);
  if (formData.get("confirm") !== "yes") return finish(formData, returnTo, "appointment_action", { ok: false, error: "confirmation_required" }, responseMode);
  const resolved = resolveFormTimes(formData, ["starts_at", "ends_at"]);
  if (!resolved.ok) return finish(formData, returnTo, "appointment_action", resolved, responseMode);
  const input = {
    leadId,
    appointmentId: String(formData.get("appointment_id") ?? ""),
    expectedUpdatedAt: String(formData.get("record_version") ?? "") || null,
    status: String(formData.get("status") ?? ""),
    startsAt: resolved.times.starts_at,
    endsAt: resolved.times.ends_at,
    timezone: String(formData.get("timezone") || "") || null,
    cancellationReason: String(formData.get("cancellation_reason") ?? "") || null,
    actor: `lead_center:${principal.userId}`,
    idempotencyKey: idempotencyKey(formData),
  };
  const result = await transitionAppointment(input);
  refreshConversionViews(leadId, result);
  return finish(formData, returnTo, "appointment_action", result, responseMode);
}

export async function createFollowupTaskAction(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function createFollowupTaskAction(formData: FormData): Promise<never>;
export async function createFollowupTaskAction(formData: FormData, responseMode?: "inline") {
  const leadId = String(formData.get("lead_id") ?? "");
  const principal = await requireLeadCenterLeadPermission(leadId, "task:manage_assigned");
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? `/admin/leads/${leadId}`));
  if (!principal) return finish(formData, returnTo, "followup_action", { ok: false, error: "rbac_not_enabled" }, responseMode);
  const resolved = resolveFormTimes(formData, ["due_at"]);
  if (!resolved.ok) return finish(formData, returnTo, "followup_action", resolved, responseMode);
  if (!resolved.times.due_at) return finish(formData, returnTo, "followup_action", { ok: false, error: "invalid_followup_due_at" }, responseMode);
  const input = {
    leadId,
    taskType: String(formData.get("task_type") ?? ""),
    dueAt: resolved.times.due_at,
    timezone: resolved.timezone,
    priority: String(formData.get("priority") ?? "normal"),
    note: String(formData.get("note") ?? "") || null,
    actor: `lead_center:${principal.userId}`,
    idempotencyKey: idempotencyKey(formData),
  };
  const result = await createFollowupTask(input);
  refreshConversionViews(leadId, result);
  return finish(formData, returnTo, "followup_action", result, responseMode);
}

export async function updateFollowupTaskAction(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function updateFollowupTaskAction(formData: FormData): Promise<never>;
export async function updateFollowupTaskAction(formData: FormData, responseMode?: "inline") {
  const leadId = String(formData.get("lead_id") ?? "");
  const principal = await requireLeadCenterLeadPermission(leadId, "task:manage_assigned");
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? `/admin/leads/${leadId}`));
  if (!principal) return finish(formData, returnTo, "followup_action", { ok: false, error: "rbac_not_enabled" }, responseMode);
  const resolved = resolveFormTimes(formData, ["due_at"]);
  if (!resolved.ok) return finish(formData, returnTo, "followup_action", resolved, responseMode);
  const input = {
    leadId,
    taskId: String(formData.get("task_id") ?? ""),
    expectedUpdatedAt: String(formData.get("record_version") ?? "") || null,
    action: String(formData.get("task_action") ?? "complete") as "complete" | "cancel" | "reschedule",
    dueAt: resolved.times.due_at,
    timezone: resolved.timezone,
    outcome: String(formData.get("outcome") ?? "") || null,
    actor: `lead_center:${principal.userId}`,
    idempotencyKey: idempotencyKey(formData),
  };
  const result = await updateFollowupTask(input);
  refreshConversionViews(leadId, result);
  return finish(formData, returnTo, "followup_action", result, responseMode);
}

export async function recordHumanFollowthroughAction(formData: FormData, responseMode: "inline"): Promise<ConversionMutationResult>;
export async function recordHumanFollowthroughAction(formData: FormData): Promise<never>;
export async function recordHumanFollowthroughAction(formData: FormData, responseMode?: "inline") {
  const leadId = String(formData.get("lead_id") || "");
  const principal = await requireLeadCenterLeadPermission(leadId, "lead:update_assigned");
  const taskPrincipal = await requireLeadCenterLeadPermission(leadId, "task:manage_assigned");
  const returnTo = safeReturnTo(String(formData.get("return_to") || `/admin/leads/${leadId}`));
  if (!principal || !taskPrincipal || principal.userId !== taskPrincipal.userId) {
    return finish(formData, returnTo, "followup_action", { ok: false, error: "rbac_not_enabled" }, responseMode);
  }
  if (formData.get("confirm") !== "yes") return finish(formData, returnTo, "followup_action", { ok: false, error: "confirmation_required" }, responseMode);
  const channel = String(formData.get("channel") || "");
  const interactionResult = String(formData.get("interaction_result") || "");
  if (!["phone", "email", "in_person", "other"].includes(channel)) return finish(formData, returnTo, "followup_action", { ok: false, error: "invalid_interaction_channel" }, responseMode);
  if (!["attempted", "no_answer", "two_way_conversation"].includes(interactionResult)) return finish(formData, returnTo, "followup_action", { ok: false, error: "invalid_interaction_result" }, responseMode);
  const recordResponse = formData.get("confirm_first_response") === "yes";
  if (recordResponse !== (interactionResult === "two_way_conversation")) return finish(formData, returnTo, "followup_action", { ok: false, error: "conversation_confirmation_required" }, responseMode);
  const note = String(formData.get("note") || "").trim();
  if (!note || note.length > 160) return finish(formData, returnTo, "followup_action", { ok: false, error: "invalid_human_interaction" }, responseMode);
  const resolved = resolveFormTimes(formData, ["due_at"]);
  if (!resolved.ok) return finish(formData, returnTo, "followup_action", resolved, responseMode);
  if (!resolved.times.due_at) return finish(formData, returnTo, "followup_action", { ok: false, error: "invalid_followup_due_at" }, responseMode);
  const result = await recordHumanFollowthrough({
    leadId,
    channel: channel as "phone" | "email" | "in_person" | "other",
    result: interactionResult as "attempted" | "no_answer" | "two_way_conversation",
    note,
    dueAt: resolved.times.due_at,
    timezone: resolved.timezone,
    taskType: String(formData.get("task_type") || ""),
    idempotencyKey: idempotencyKey(formData),
    actor: `lead_center:${principal.userId}`,
  });
  // The persistence transaction records confirmed conversation evidence and
  // the next task together. Never add a second, partly committed response write.
  refreshConversionViews(leadId, result);
  return finish(formData, returnTo, "followup_action", result, responseMode);
}
