import type { TrackEventParams, AnalyticsEventName } from "@/types/domain.types";
import type { Json } from "@/types/database.types";
import { ANALYTICS_EVENTS } from "./events";

let supabaseAdmin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient> | null = null;

async function getClient() {
  if (!supabaseAdmin) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    supabaseAdmin = createAdminClient();
  }
  return supabaseAdmin;
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  const eventMeta = ANALYTICS_EVENTS[params.eventName];
  if (!eventMeta) {
    console.error(`[analytics] Unknown event: ${params.eventName}`);
    return;
  }

  // Only write to Supabase if env vars are configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // Dev mode: log to console only
    console.log(`[analytics:${params.eventName}]`, params.properties ?? {});
    return;
  }

  try {
    const client = await getClient();
    const { error } = await client.from("analytics_events").insert({
      session_id: params.sessionId ?? null,
      lead_id: params.leadId ?? null,
      agent_id: params.agentId ?? null,
      event_name: params.eventName,
      event_category: eventMeta.category,
      properties: (params.properties ?? {}) as unknown as Json,
      utm_source: params.utmSource ?? null,
      utm_medium: params.utmMedium ?? null,
      utm_campaign: params.utmCampaign ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });

    if (error) {
      console.error(`[analytics] Failed to write event ${params.eventName}:`, error.message);
    }
  } catch (err) {
    console.error(`[analytics] Unexpected error tracking ${params.eventName}:`, err);
  }
}

export function trackEventNoWait(params: TrackEventParams): void {
  trackEvent(params).catch(() => {
    // intentionally swallowed
  });
}

export type { AnalyticsEventName };
