import type { CommunicationPermissionDecision } from "../../src/lib/messaging/permission-engine";

export type ManualContactReview = {
  ok?: boolean;
  lead?: { isTest: boolean; suppressed: boolean };
  manualContact?: { canReview: boolean; terminal: boolean; phone: string | null; email: string | null };
  reviewMatrix?: Array<{ channel: string; purpose: string; decision: Pick<CommunicationPermissionDecision, "allowed" | "code" | "requiresHumanApproval"> }>;
};

export function isTerminalContactRecord(status?: string | null, stage?: string | null) {
  const terminal = ["closed", "closed_won", "closed_lost", "lost", "disqualified", "duplicate", "converted", "dead", "spam"];
  return terminal.includes(status || "") || terminal.includes(stage || "");
}

/** Native dialer/composer only, after an explicit human review. Never a send,
 * consent grant, completed-contact event or a substitute for server permission. */
export function manualContactReviewTarget(review: ManualContactReview, channel: "phone" | "email") {
  const contact = review.manualContact;
  if (!review.ok || !review.lead || review.lead.isTest || review.lead.suppressed || !contact?.canReview || contact.terminal) return null;
  const decision = review.reviewMatrix?.find(row => row.channel === channel && row.purpose === "manual_one_to_one")?.decision;
  if (!decision || !(decision.allowed || (decision.requiresHumanApproval && ["auto_send_disabled", "human_approval_required"].includes(decision.code)))) return null;
  if (channel === "phone") {
    const value = contact.phone?.trim();
    if (!value || !/^[+()\d .-]{7,40}$/.test(value)) return null;
    const digits = value.replace(/[^\d+]/g, "");
    return /^\+?\d{7,15}$/.test(digits) ? `tel:${digits}` : null;
  }
  const value = contact.email?.trim();
  return value && /^[^\s@<>?&#]+@[^\s@<>?&#]+\.[^\s@<>?&#]+$/.test(value) ? `mailto:${value}` : null;
}
