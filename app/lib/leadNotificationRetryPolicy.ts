export const NOTIFICATION_PENDING_STALE_MINUTES = 5;
export const NOTIFICATION_PROCESSING_STALE_MINUTES = 10;

export function notificationPendingRecoveryCutoff(now = new Date()) {
  return new Date(
    now.getTime() - NOTIFICATION_PENDING_STALE_MINUTES * 60_000,
  );
}
