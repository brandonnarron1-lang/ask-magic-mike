import { neon } from "@neondatabase/serverless";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,80}$/;
const PRIVATE_KEYS =
  /email|phone|address|name|message|question|notes|ip|user_agent|cookie|token|secret/i;
const EVENT_CATEGORIES = new Set([
  "session",
  "intake",
  "scoring",
  "routing",
  "valuation",
  "crm",
  "admin",
  "system",
]);

type NeonQuery = {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
};

export type AnalyticsEventWrite = {
  eventName: string;
  eventCategory?: string | null;
  sessionId?: string | null;
  leadId?: string | null;
  agentId?: string | null;
  properties?: Record<string, unknown>;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  userAgent?: string | null;
};

function scalar(value: unknown) {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : undefined;
}

export function safeAnalyticsProperties(
  properties: Record<string, unknown> = {},
) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => !PRIVATE_KEYS.test(key))
      .map(([key, value]) => [key.slice(0, 80), scalar(value)] as const)
      .filter(([, value]) => value !== undefined)
      .slice(0, 40),
  );
}

function validUuid(value: string | null | undefined) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

export class NeonAnalyticsEventRepository {
  constructor(private readonly sql: NeonQuery) {}

  async record(event: AnalyticsEventWrite): Promise<boolean> {
    if (!EVENT_NAME_PATTERN.test(event.eventName)) return false;

    const category = EVENT_CATEGORIES.has(event.eventCategory ?? "")
      ? event.eventCategory
      : "system";

    await this.sql.query(
      `INSERT INTO public.analytics_events (
         session_id, lead_id, agent_id, event_name, event_category, properties,
         utm_source, utm_medium, utm_campaign, user_agent
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::jsonb,
         $7::text, $8::text, $9::text, $10::text
       )`,
      [
        validUuid(event.sessionId),
        validUuid(event.leadId),
        validUuid(event.agentId),
        event.eventName,
        category,
        JSON.stringify(safeAnalyticsProperties(event.properties)),
        event.utmSource?.slice(0, 160) ?? null,
        event.utmMedium?.slice(0, 160) ?? null,
        event.utmCampaign?.slice(0, 160) ?? null,
        event.userAgent?.slice(0, 500) ?? null,
      ],
    );
    return true;
  }
}

export function createNeonAnalyticsEventRepository(
  env: Record<string, string | undefined> = process.env,
) {
  return env.DATABASE_URL
    ? new NeonAnalyticsEventRepository(neon(env.DATABASE_URL))
    : null;
}

export async function recordNeonAnalyticsEvent(
  event: AnalyticsEventWrite,
): Promise<boolean> {
  const repository = createNeonAnalyticsEventRepository();
  if (!repository) return false;
  try {
    return await repository.record(event);
  } catch (error) {
    console.error("[analytics] canonical event write failed", {
      eventName: event.eventName,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return false;
  }
}
