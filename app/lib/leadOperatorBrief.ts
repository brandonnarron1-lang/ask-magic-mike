import type { AdminLeadDetailResult } from "./adminLeadView";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
import { canAccessAssignedLead, hasLeadCenterPermission } from "../../src/lib/admin/rbac-policy";
import { leadOwnership } from "./leadOwnership";
import { isTerminalContactRecord } from "./manualContactReview";

/** Read-only explanation from an already-authorized inquiry detail. No queue,
 * model, new query, permission grant, write or inference from identity. */
export function buildOperatorBrief(detail: AdminLeadDetailResult, principal:LeadCenterPrincipal|null, now = new Date()) {
  const lead=detail.lead;
  if (!lead) return null;
  const ownership=leadOwnership(lead);
  const noContact=!lead.email && !lead.phone;
  const held=noContact || lead.is_test || lead.communication_suppressed || isTerminalContactRecord(lead.status,lead.conversion_stage)
    || ["no_follow_up","do_not_contact"].includes(lead.closed_lost_reason?.toLowerCase() || "");
  const canMaintain=Boolean(principal && hasLeadCenterPermission(principal.role,"lead:update_assigned") &&
    canAccessAssignedLead(principal,lead.assigned_agent_id));
  const due=detail.followupTasks.filter(t=>["open","in_progress"].includes(t.status) && t.due_at && Number.isFinite(Date.parse(t.due_at)))
    .sort((a,b)=>Date.parse(a.due_at!)-Date.parse(b.due_at!) || a.id.localeCompare(b.id))[0];
  const request=detail.appointments.find(a=>["requested","reschedule_requested"].includes(a.status));
  let recommendation="Review the request and current permission before any human contact.",anchor="contact-readiness";
  if (held) { recommendation=noContact?"Review this question internally. No contact method is recorded; do not guess a destination.":"Internal record review only. Do not contact or recreate canceled follow-up."; anchor="qualification-review"; }
  else if (!canMaintain) { recommendation="Read-only record review. Current assignment does not grant this account mutation authority."; anchor="qualification-review"; }
  else if (due?.due_at && Date.parse(due.due_at)<now.getTime()) { recommendation="Review the overdue existing task and record only work that actually occurred."; anchor="follow-up"; }
  else if (request) { recommendation="Review the saved conversation request and preferences; availability is not confirmed."; anchor="appointment-review"; }
  else if (due) { recommendation="Review the existing task and record only work that actually occurred."; anchor="follow-up"; }
  const captured=Date.parse(lead.created_at || ""),response=Date.parse(detail.firstResponse?.first_human_response_at || "");
  return { ownership,held,canMaintain,recommendation,anchor,due:due?.due_at||null,
    overdue:Boolean(!held&&due?.due_at&&Date.parse(due.due_at)<now.getTime()),
    firstHumanResponseAt:detail.firstResponse?.first_human_response_at||null,
    responseMinutes:Number.isFinite(captured)&&Number.isFinite(response)&&response>=captured?Math.floor((response-captured)/60000):null,
    responseProvenance:detail.firstResponse?.source_system||null };
}
