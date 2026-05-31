import { shouldUseDevStorage } from "./types";

export interface CreateEventInput {
  sessionId?: string | null;
  leadId?: string | null;
  eventName: string;
  eventCategory?: string | null;
  properties?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export async function createEvent(input: CreateEventInput): Promise<void> {
  if (shouldUseDevStorage()) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  const { error } = await client.from("analytics_events").insert({
    session_id:     input.sessionId ?? null,
    lead_id:        input.leadId ?? null,
    event_name:     input.eventName,
    event_category: input.eventCategory ?? null,
    properties:     (input.properties ?? {}) as import("@/types/database.types").Json,
    ip_address:     input.ipAddress ?? null,
    user_agent:     input.userAgent ?? null,
    utm_source:     input.utmSource ?? null,
    utm_medium:     input.utmMedium ?? null,
    utm_campaign:   input.utmCampaign ?? null,
  });

  if (error) {
    console.error("[event-repository] createEvent error:", error.message);
  }
}
