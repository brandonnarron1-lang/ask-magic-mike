/** Only public route projections; dynamic IDs, queries and fragments never enter traffic. */
export function publicTrafficRoute(path: string): string | null {
  if (/^\/open-house\/[^/]+$/.test(path)) return "/open-house/:reference";
  return new Set(["/", "/home-value", "/value", "/sell", "/we-buy-houses", "/buy", "/rent",
    "/ask", "/contact", "/plan", "/my", "/thank-you", "/privacy", "/terms", "/accessibility",
    "/widget/v1", "/embed/ask"]).has(path) ? path : null;
}
export type TrafficEvidence = {
  version: 1; eventId: string; route: string; context: "top_level" | "embedded";
  visitId?: string; browserId?: string;
};
const uuid = (v: unknown): v is string => typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function parseTrafficEvidence(input: unknown): TrafficEvidence | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  if (v.version !== 1 || !uuid(v.eventId) || typeof v.route !== "string" ||
    !(publicTrafficRoute(v.route) === v.route || v.route === "/open-house/:reference") ||
    !["top_level", "embedded"].includes(String(v.context))) return null;
  if ((v.visitId !== undefined && !uuid(v.visitId)) || (v.browserId !== undefined && !uuid(v.browserId))) return null;
  return { version: 1, eventId: v.eventId, route: v.route, context: v.context as TrafficEvidence["context"],
    ...(uuid(v.visitId) ? { visitId: v.visitId } : {}), ...(uuid(v.browserId) ? { browserId: v.browserId } : {}) };
}
export function trafficProperties(v: TrafficEvidence) {
  return { traffic_version: 1, traffic_event_id: v.eventId, traffic_route: v.route,
    traffic_context: v.context, ...(v.visitId ? { traffic_visit_id: v.visitId } : {}),
    ...(v.browserId ? { traffic_browser_id: v.browserId } : {}) };
}
