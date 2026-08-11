const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,80}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EVENT_CATEGORIES = new Set(["session", "intake", "scoring", "routing", "valuation", "crm", "admin", "system"]);
const PRIVATE_KEYS = /email|phone|address|name|message|question|notes|ip|user_agent|cookie|token|secret/i;

export type ServerAnalyticsEvent = {
  eventName: string;
  category?: string;
  sessionId?: string | null;
  leadId?: string | null;
  properties?: Record<string, unknown>;
  attribution?: { source?: string; medium?: string; campaign?: string };
  userAgent?: string | null;
};

function scalar(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : undefined;
}

export function safeAnalyticsProperties(properties: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => !PRIVATE_KEYS.test(key))
      .map(([key, value]) => [key.slice(0, 80), scalar(value)] as const)
      .filter(([, value]) => value !== undefined)
      .slice(0, 40),
  );
}

export async function recordServerAnalyticsEvent(event: ServerAnalyticsEvent) {
  if (!EVENT_NAME_PATTERN.test(event.eventName)) return false;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRoleKey) return false;
  const sessionId = event.sessionId && UUID_PATTERN.test(event.sessionId) ? event.sessionId : null;
  const leadId = event.leadId && UUID_PATTERN.test(event.leadId) ? event.leadId : null;
  const category = EVENT_CATEGORIES.has(event.category || "") ? event.category : "system";
  try {
    const response = await fetch(new URL("/rest/v1/analytics_events", baseUrl), {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        event_name: event.eventName,
        event_category: category,
        session_id: sessionId,
        lead_id: leadId,
        properties: safeAnalyticsProperties(event.properties),
        utm_source: event.attribution?.source || null,
        utm_medium: event.attribution?.medium || null,
        utm_campaign: event.attribution?.campaign || null,
        user_agent: event.userAgent ? event.userAgent.slice(0, 500) : null,
      }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
