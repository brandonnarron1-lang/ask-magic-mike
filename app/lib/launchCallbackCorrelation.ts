/** Read only after the raw provider payload has passed signature verification.
 * Legacy events do not need a recipient value; minimize their SQL parameters. */
export function readLaunchCallbackCorrelation(payload: unknown): { notificationId: string | null; recipient: string | null } {
  const envelope = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const data = envelope.data && typeof envelope.data === "object" ? envelope.data as Record<string, unknown> : {};
  const tags = data.tags;
  const value = Array.isArray(tags) ? tags.find(tag => tag && typeof tag === "object" && tag.name === "amm_notification_id")?.value
    : tags && typeof tags === "object" ? (tags as Record<string, unknown>).amm_notification_id : null;
  const notificationId = typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
  const to = notificationId && Array.isArray(data.to) && data.to.length === 1 ? data.to[0] : null;
  const recipient = typeof to === "string" && to.length <= 254 && !/[\s<>\r\n]/.test(to) && /^[^@]+@[^@]+\.[^@]+$/.test(to) ? to : null;
  return { notificationId, recipient };
}
