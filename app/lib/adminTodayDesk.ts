import type { AdminTodayAction, AdminTodayQueueResult } from "./adminTodayQueue";

/** Presentation of the existing authorized action queue, not a second writer,
 * eligibility engine, contact grant or prediction. Legacy score/grade actions
 * never determine this desk's priority. Missing optional facts are not penalties. */
export const DESK_RUBRIC_VERSION = "operator_action_v1";
export const DESK_FILTERS = ["attention", "overdue", "delivery", "waiting", "held"] as const;
export type DeskFilter = typeof DESK_FILTERS[number];
export type DeskRequest = {
  leadId: string; primary: AdminTodayAction; actions: AdminTodayAction[];
  held: boolean; overdue: boolean; delivery: boolean; waiting: boolean;
  reason: string; next: string; anchor: string; rank: number;
};
export function deskFilter(value: unknown): DeskFilter {
  return DESK_FILTERS.includes(value as DeskFilter) ? value as DeskFilter : "attention";
}
export const DESK_PAGE_SIZE = 25;
export function deskPage(value: unknown) {
  const page=typeof value==="string" && /^\d{1,3}$/.test(value) ? Number(value) : 1;
  return Math.max(1,Math.min(40,page));
}
const stamp = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : Infinity;
const held = (a: AdminTodayAction) => Boolean(a.readOnly || a.facts?.contactHeld || a.facts?.hasContact === false ||
  a.actionKind==="review_hold" || a.blockers.some(b => b === "test_record" || b === "communication_suppressed" || b === "contact_permission_missing"));
function rank(a: AdminTodayAction, at: number) {
  if (held(a)) return 9;
  if (a.taskId && stamp(a.dueAt) < at) return 0;
  if (a.notificationId) return 1;
  if (a.actionKind === "assign_lead") return 2;
  if (a.appointmentId) return 3;
  if (a.taskId) return 4;
  return 5;
}
export function buildTodayDesk(queue: AdminTodayQueueResult) {
  const at = Date.parse(queue.generatedAt);
  const groups = new Map<string, AdminTodayAction[]>();
  for (const item of queue.items) {
    // This retained legacy score action is not an explainable customer fact.
    if (item.actionKey === "hot-review") continue;
    const items = groups.get(item.leadId) || [];
    if (!items.some(a => a.id === item.id)) items.push(item);
    groups.set(item.leadId, items);
  }
  const requests: DeskRequest[] = [...groups.entries()].map(([leadId, actions]) => {
    actions.sort((a,b) => rank(a,at)-rank(b,at) || Number(!a.taskId)-Number(!b.taskId) || stamp(a.dueAt)-stamp(b.dueAt) || a.id.localeCompare(b.id));
    const primary = actions[0], isHeld = held(primary);
    const overdue = !isHeld && actions.some(a => !held(a) && a.taskId && stamp(a.dueAt) < at);
    const delivery = actions.some(a => a.notificationId);
    const waiting = !isHeld && !primary.facts?.firstHumanResponseAt && actions.some(a=>!held(a)&&!a.notificationId&&a.actionKind!=="assign_lead");
    let reason = "No first human-response milestone is recorded.";
    let next = "Review this request and its current contact permission.";
    let anchor = "contact-readiness";
    if (primary.taskId) { reason = overdue ? "An existing unsatisfied follow-up task is overdue." : "An existing follow-up task is due today."; next = "Review the task; record only work that actually happened."; anchor = "follow-up"; }
    else if (primary.notificationId) { reason = "A saved notification has a delivery exception."; next = "Inspect recipient evidence; reconcile UNKNOWN before any retry."; anchor = "activity"; }
    else if (primary.actionKind === "assign_lead") { reason = "No current responsible owner is recorded."; next = "Review assignment prerequisites. No assignment is made here."; anchor = "qualification-review"; }
    else if (primary.appointmentId) { reason = primary.reasonCodes.includes("appointment_unscheduled") ? "A conversation request still needs human review." : "An existing appointment is recorded for today."; next = "Review the actual request and recorded status; no availability is promised."; anchor = "appointment-review"; }
    else if (primary.facts?.firstHumanResponseAt) { reason = "A human-response milestone is recorded; current work remains open."; next = "Review current facts and the existing next action."; anchor = "follow-up"; }
    if (isHeld) {
      reason = primary.readOnly ? "Inherited ownership gives read access, not mutation authority."
        : primary.facts?.hasContact === false ? "No contact method is recorded; this is not a contactable inquiry."
        : primary.blockers.includes("contact_permission_missing") ? "Current contact permission is not established in this queue. Review the inquiry's retained evidence."
        : "Contact is held. Internal record review only.";
      next = "Inspect the protected record without contacting or reopening follow-up. Do not complete contact work while permission is held.";
      anchor = primary.blockers.includes("contact_permission_missing")?"contact-readiness":"qualification-review";
    }
    return { leadId, primary, actions, held:isHeld, overdue, delivery, waiting, reason, next, anchor, rank:rank(primary,at) };
  }).sort((a,b) => a.rank-b.rank || stamp(a.primary.dueAt)-stamp(b.primary.dueAt) || a.leadId.localeCompare(b.leadId));
  const counts = {
    attention: requests.filter(r => !r.held).length,
    overdue: requests.filter(r => r.overdue).length,
    delivery: requests.filter(r => !r.held && r.delivery).length,
    waiting: requests.filter(r => r.waiting).length,
    held: requests.filter(r => r.held).length,
  };
  return { version: DESK_RUBRIC_VERSION, requests, counts };
}
export function deskRequests(requests: DeskRequest[], filter: DeskFilter) {
  return requests.filter(r => filter === "held" ? r.held : !r.held &&
    (filter === "attention" || (filter === "overdue" ? r.overdue : filter === "delivery" ? r.delivery : r.waiting)));
}
export function deskDate(value: string | null | undefined, timezone = "America/New_York") {
  if (stamp(value) === Infinity) return "Not recorded";
  try { return new Intl.DateTimeFormat("en-US", { timeZone:timezone, month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" }).format(new Date(value!)); }
  catch { return "Timezone unavailable · "+new Date(value!).toISOString(); }
}
export function elapsedSince(value: string | null | undefined, at: string) {
  const minutes = Math.floor((Date.parse(at)-stamp(value))/60000);
  if (!Number.isFinite(minutes) || minutes < 0) return "Age unknown";
  return minutes < 60 ? `${minutes}m since capture` : minutes < 1440 ? `${Math.floor(minutes/60)}h since capture` : `${Math.floor(minutes/1440)}d since capture`;
}
