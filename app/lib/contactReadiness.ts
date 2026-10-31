import { manualContactReviewTarget, type ManualContactReview } from "./manualContactReview";

export function contactReadiness(review: ManualContactReview, channel: "phone" | "email") {
  const restricted = (reason: string) => ({ ready: false, label: "Not available", reason });
  if (!review.ok) return restricted("Contact permission has not been verified. Internal review can continue; nothing has been sent.");
  if (review.lead?.isTest) return restricted("This is a test record. Consumer contact is not permitted.");
  if (review.lead?.suppressed) return restricted("Consumer contact is suppressed for this record. Internal review remains available.");
  if (review.manualContact?.terminal) return restricted("This request has a closed or duplicate lifecycle. Review that state without reopening it or contacting anyone.");
  if (!review.manualContact?.canReview) return restricted("This account has read-only access to this request. Use an account with current permission to handle it; the assigned owner need not be the person testing the system.");
  if (!review.manualContact[channel]) return restricted(`${channel === "email" ? "An email address" : "A phone number"} was not provided.`);
  const decision = review.reviewMatrix?.find(row => row.channel === channel && row.purpose === "manual_one_to_one")?.decision;
  if (manualContactReviewTarget(review, channel)) return { ready: true, label: "Ready for your review", reason: decision?.decisionSource === "canonical_request_consent"
    ? "Recorded consent covers a human reply about this request only. Review it, then open your app; nothing sends automatically."
    : "The recorded permission supports this action. Review the request before opening your app; nothing sends automatically." };
  if (decision?.code === "channel_opt_out") return restricted(`${channel === "email" ? "Email" : "Phone"} opt-out is recorded. Do not use this method.`);
  if (decision?.code === "consent_denied") return restricted("Permission for this method and purpose is denied. A review or checkbox cannot turn that denial into consent.");
  if (decision?.code === "legal_hold" || decision?.code === "bic_hold") return restricted("A contact hold is recorded. Its actual source and reason must be resolved; this label alone does not establish a new legal or broker-review requirement.");
  if (decision?.code === "ambiguous_consent" || decision?.code === "missing_permission") return restricted(review.manualContact.evidence?.[channel]?.reason || "Permission to respond by this method is not established. Review the retained evidence; do not grant permission from a phone number or email address alone.");
  if (decision?.code === "invalid_contact" || decision?.requiresHumanApproval) return restricted("The supplied destination is missing or invalid. Do not guess or substitute another address or number.");
  return restricted("Current contact permission could not be established. Keep the existing internal review open; no new reminder or consumer action is required.");
}

/** Deterministic unsent reply. Do not impersonate the assigned lead owner. */
export function prepareRequestReply(review: ManualContactReview, requestLabel = "real estate request") {
  const label = requestLabel.replace(/[\r\n]+/g, " ").slice(0, 100);
  const operator = review.operator?.name?.trim().replace(/[\r\n]+/g, " ").slice(0, 100);
  return {
    subject: "Your request to Our Town Properties",
    body: `Hello,\n\nThank you for your ${label.toLowerCase()}. What would be the most useful next step for you, and what is your preferred way and time for our team to respond? Are you currently working with an agent for this request?\n\n${operator ? `${operator}\n` : ""}Our Town Properties, Inc.`,
  };
}

/** mailto is not form encoding: spaces must be %20, not literal plus signs. */
export function preparedReplyUri(target: string, draft: { subject: string; body: string }) {
  return `${target}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
}
