/** Fixed protected read route; task IDs come from the server-authorized queue.
 * The URL carries identity only, never a version, draft, permission or return URL.
 */
export function todayTaskReviewId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value : null;
}

export function todayTaskReviewHref(taskId: unknown): string | null {
  const id = todayTaskReviewId(taskId);
  return id ? `/admin/today?review_task=${id}` : null;
}
