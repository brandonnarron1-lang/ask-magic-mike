import type { LeadNotificationRecord } from "./leadNotificationTypes";

/** Ledger/API acceptance is not inbox receipt. No snapshot/contact projection. */
export function launchNotificationStatus(record: LeadNotificationRecord) {
  if (record.template_version !== "lead_alert_email_v6") return record.status;
  if (record.metadata.provider_terminal_failure === true || record.status === "permanently_failed") return "Delivery problem — review required";
  if (record.metadata.provider_delivery_confirmed === true) return "Delivered to recipient server";
  if (record.status === "sent") return "Accepted by email provider";
  if (record.status === "processing") return "Provider outcome pending reconciliation";
  if (record.status === "retry_scheduled") return "Safe retry scheduled";
  if (record.status === "failed") return "Dispatch failed";
  if (record.status === "skipped") return "Held — not dispatched";
  return "Waiting for dispatch";
}
