"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  statusActionFor,
  updateAdminLeadStatus,
} from "../../lib/adminLeadActions";

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
