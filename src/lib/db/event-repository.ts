import { shouldUseDevStorage } from "./types";
import { recordNeonAnalyticsEvent } from "@/lib/persistence/neon/analytics-event-repository";

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

  await recordNeonAnalyticsEvent({
    sessionId: input.sessionId,
    leadId: input.leadId,
    eventName: input.eventName,
    eventCategory: input.eventCategory,
    properties: input.properties,
    userAgent: input.userAgent,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
  });
}
