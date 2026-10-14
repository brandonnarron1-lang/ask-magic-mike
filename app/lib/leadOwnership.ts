import type { AdminLeadView } from "./persistence/supabase/adminLeadView";

/** Read projection only. Never use inherited ownership as mutation authority. */
export function leadOwnership(lead: Pick<AdminLeadView, "assigned_agent_id" | "inquiry_owner_agent_id" | "inquiry_owner_agent_name">) {
  const id = lead.assigned_agent_id || lead.inquiry_owner_agent_id || null;
  const inherited = Boolean(id && !lead.assigned_agent_id);
  const name = lead.inquiry_owner_agent_name?.trim() || null;
  return {
    id, inherited,
    state: !id ? "Unassigned" : inherited ? "Inherited ownership" : "Assigned",
    label: !id ? "Unassigned" : `${name || "Ownership recorded — name unavailable"}${inherited ? " · inherited from canonical lead" : " · directly assigned"}`,
  };
}
