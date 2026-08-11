import type { TrackEventParams, AnalyticsEventName } from "@/types/domain.types";
import { recordNeonAnalyticsEvent } from "@/lib/persistence/neon/analytics-event-repository";
import { ANALYTICS_EVENTS } from "./events";

export async function trackEvent(params: TrackEventParams): Promise<void> {
  const eventMeta = ANALYTICS_EVENTS[params.eventName];
  if (!eventMeta) {
    console.error(`[analytics] Unknown event: ${params.eventName}`);
    return;
  }

  await recordNeonAnalyticsEvent({
    sessionId: params.sessionId,
    leadId: params.leadId,
    agentId: params.agentId,
    eventName: params.eventName,
    eventCategory: eventMeta.category,
    properties: params.properties,
    utmSource: params.utmSource,
    utmMedium: params.utmMedium,
    utmCampaign: params.utmCampaign,
    userAgent: params.userAgent,
  });
}

export function trackEventNoWait(params: TrackEventParams): void {
  trackEvent(params).catch(() => {
    // intentionally swallowed
  });
}

export type { AnalyticsEventName };
