"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  statusActionFor,
  updateAdminLeadStatus,
} from "../../lib/adminLeadActions";
import {
  createAppointment,
  createFollowupTask,
  transitionAppointment,
  updateFollowupTask,
} from "../../lib/adminAppointmentFollowupOps";

function safeReturnTo(value: string) {
  return value === "/admin/leads" || value.startsWith("/admin/leads/")
    ? value
    : "/admin/leads";
}

export async function updateLeadStatusAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "") || null;
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? "/admin/leads"));
  const confirm = formData.get("confirm") === "yes";
  const action = statusActionFor(status);

  if (action?.requiresConfirmation && !confirm) {
    redirect(returnTo + "?status_action=confirmation_required");
  }

  const result = await updateAdminLeadStatus(leadId, status, { reason });
  revalidatePath("/admin/leads");
  if (returnTo.startsWith("/admin/leads/")) {
    revalidatePath(returnTo);
  }

  if (!result.ok) {
    redirect(returnTo + "?status_action=" + result.error);
  }

  redirect(returnTo + "?status_action=" + (result.warning || "updated"));
}

export async function createAppointmentAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") ?? "");
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? `/admin/leads/${leadId}`));
  const result = await createAppointment({
    leadId,
    status: String(formData.get("status") ?? "requested"),
    startsAt: String(formData.get("starts_at") ?? "") || null,
    endsAt: String(formData.get("ends_at") ?? "") || null,
    timezone: String(formData.get("timezone") ?? "") || "America/New_York",
    locationType: String(formData.get("location_type") ?? "") || "office",
    locationLabel: String(formData.get("location_label") ?? "") || null,
    meetingUrl: String(formData.get("meeting_url") ?? "") || null,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/action-queue");
  revalidatePath("/admin/reporting");
  if (returnTo.startsWith("/admin/leads/")) revalidatePath(returnTo);
  redirect(returnTo + "?appointment_action=" + (result.ok ? result.warning || "updated" : result.error));
}

export async function transitionAppointmentAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") ?? "");
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? `/admin/leads/${leadId}`));
  const result = await transitionAppointment({
    appointmentId: String(formData.get("appointment_id") ?? ""),
    status: String(formData.get("status") ?? ""),
    startsAt: String(formData.get("starts_at") ?? "") || null,
    endsAt: String(formData.get("ends_at") ?? "") || null,
    timezone: String(formData.get("timezone") ?? "") || null,
    cancellationReason: String(formData.get("cancellation_reason") ?? "") || null,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/action-queue");
  revalidatePath("/admin/reporting");
  if (returnTo.startsWith("/admin/leads/")) revalidatePath(returnTo);
  redirect(returnTo + "?appointment_action=" + (result.ok ? result.warning || "updated" : result.error));
}

export async function createFollowupTaskAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") ?? "");
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? `/admin/leads/${leadId}`));
  const result = await createFollowupTask({
    leadId,
    taskType: String(formData.get("task_type") ?? ""),
    dueAt: String(formData.get("due_at") ?? "") || null,
    priority: String(formData.get("priority") ?? "normal"),
    note: String(formData.get("note") ?? "") || null,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/action-queue");
  if (returnTo.startsWith("/admin/leads/")) revalidatePath(returnTo);
  redirect(returnTo + "?followup_action=" + (result.ok ? result.warning || "updated" : result.error));
}

export async function updateFollowupTaskAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") ?? "");
  const returnTo = safeReturnTo(String(formData.get("return_to") ?? `/admin/leads/${leadId}`));
  const result = await updateFollowupTask({
    taskId: String(formData.get("task_id") ?? ""),
    action: String(formData.get("task_action") ?? "complete") as "complete" | "cancel" | "reschedule",
    dueAt: String(formData.get("due_at") ?? "") || null,
    outcome: String(formData.get("outcome") ?? "") || null,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/action-queue");
  if (returnTo.startsWith("/admin/leads/")) revalidatePath(returnTo);
  redirect(returnTo + "?followup_action=" + (result.ok ? result.warning || "updated" : result.error));
}
