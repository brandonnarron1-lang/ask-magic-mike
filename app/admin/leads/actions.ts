"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  statusActionFor,
  updateAdminLeadStatus,
} from "../../lib/adminLeadActions";

export async function updateLeadStatusAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const confirm = formData.get("confirm") === "yes";
  const action = statusActionFor(status);

  if (action?.requiresConfirmation && !confirm) {
    redirect("/admin/leads?status_action=confirmation_required");
  }

  const result = await updateAdminLeadStatus(leadId, status);
  revalidatePath("/admin/leads");

  if (!result.ok) {
    redirect("/admin/leads?status_action=" + result.error);
  }

  redirect("/admin/leads?status_action=updated");
}
