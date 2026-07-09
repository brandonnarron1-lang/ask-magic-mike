"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignLeadToAgent,
  unassignLead,
} from "../../lib/adminAgentAllocationActions";

export async function assignLeadToAgentAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") ?? "");
  const agentId = String(formData.get("agent_id") ?? "");
  const result = await assignLeadToAgent(leadId, agentId);

  revalidatePath("/admin/allocation");

  if (!result.ok) {
    redirect("/admin/allocation?assignment_action=" + result.error);
  }

  redirect("/admin/allocation?assignment_action=assigned");
}

export async function unassignLeadAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") ?? "");
  const result = await unassignLead(leadId);

  revalidatePath("/admin/allocation");

  if (!result.ok) {
    redirect("/admin/allocation?assignment_action=" + result.error);
  }

  redirect("/admin/allocation?assignment_action=unassigned");
}
