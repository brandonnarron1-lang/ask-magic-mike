import {
  getNotificationStatusForLead,
  getRecentNotificationActivity,
} from "./leadNotificationService";
import type { LeadNotificationRecord } from "./leadNotificationTypes";

export type AdminLeadNotificationSummary = {
  configured: boolean;
  notifications: LeadNotificationRecord[];
  kpis: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
    retryScheduled: number;
  };
  error?: string;
};

function empty(configured: boolean, error?: string): AdminLeadNotificationSummary {
  return {
    configured,
    notifications: [],
    kpis: {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      retryScheduled: 0,
    },
    error,
  };
}

export function isNotificationRetryEligible(notification: LeadNotificationRecord) {
  return (
    ["failed", "retry_scheduled"].includes(notification.status) &&
    notification.attempt_count < notification.max_attempts
  );
}

export function summarizeNotifications(notifications: LeadNotificationRecord[]): AdminLeadNotificationSummary {
  return {
    configured: true,
    notifications,
    kpis: {
      total: notifications.length,
      pending: notifications.filter((item) => item.status === "pending" || item.status === "processing").length,
      sent: notifications.filter((item) => item.status === "sent").length,
      failed: notifications.filter((item) => item.status === "failed" || item.status === "permanently_failed").length,
      skipped: notifications.filter((item) => item.status === "skipped").length,
      retryScheduled: notifications.filter((item) => item.status === "retry_scheduled").length,
    },
  };
}

export async function loadAdminLeadNotificationSummary(limit = 50): Promise<AdminLeadNotificationSummary> {
  try {
    return summarizeNotifications(await getRecentNotificationActivity(limit));
  } catch (error) {
    const message = error instanceof Error && error.message === "notification_store_not_configured"
      ? undefined
      : "Notification query failed";
    return empty(Boolean(message), message);
  }
}

export async function loadLeadNotificationSummary(leadId: string, limit = 25): Promise<AdminLeadNotificationSummary> {
  try {
    return summarizeNotifications(await getNotificationStatusForLead(leadId, limit));
  } catch {
    return empty(false);
  }
}
