import type { LeadNotificationRecord } from "./leadNotificationTypes";

/** Only fixed operator names; never return a private destination/reference. */
export function notificationRecipientLabel(record: LeadNotificationRecord) {
  if (record.template_version === "lead_alert_email_v6" && ["mike", "brandon"].includes(String(record.metadata.operator))) return record.metadata.operator === "mike" ? "Mike" : "Brandon";
  if (record.template_version === "request_response_v1") {
    if (record.recipient_reference === "operator:mike") return "Mike";
    if (record.recipient_reference === "operator:brandon") return "Brandon";
  }
  return record.recipient_type;
}

/** Ledger/API acceptance is not inbox receipt. No snapshot/contact projection. */
export function launchNotificationStatus(record: LeadNotificationRecord) {
  if (!["lead_alert_email_v6", "request_response_v1"].includes(record.template_version)) return record.status;
  if (record.metadata.provider_terminal_failure === true || record.status === "permanently_failed") return "Delivery problem — review required";
  if (record.metadata.provider_delivery_confirmed === true) return "Delivered to recipient server";
  if (record.status === "sent") return record.channel === "push" ? "Accepted by push provider; device receipt unverified" : "Accepted by email provider";
  if (record.status === "processing") return "Provider outcome pending reconciliation";
  if (record.status === "retry_scheduled") return "Safe retry scheduled";
  if (record.status === "failed") return "Dispatch failed";
  if (record.status === "skipped") return "Held — not dispatched";
  return "Waiting for dispatch";
}
