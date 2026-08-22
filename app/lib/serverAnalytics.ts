import {
  recordNeonAnalyticsEvent,
} from "@/lib/persistence/neon/analytics-event-repository";
import {
  coarseAnalyticsUserAgent,
  isApprovedPublicAnalyticsEvent,
  safeAnalyticsDimension,
  safeAnalyticsProperties,
  safePublicAnalyticsDimension,
  safePublicAnalyticsProperties,
  safeRegisteredPublicAnalyticsDimension,
} from "@/lib/analytics/privacy";

export type ServerAnalyticsEvent = {
  eventName: string;
  category?: string;
  sessionId?: string | null;
  leadId?: string | null;
  properties?: Record<string, unknown>;
  attribution?: { source?: string; medium?: string; campaign?: string };
  userAgent?: string | null;
};

export {
  coarseAnalyticsUserAgent,
  isApprovedPublicAnalyticsEvent,
  safeAnalyticsDimension,
  safeAnalyticsProperties,
  safePublicAnalyticsDimension,
  safePublicAnalyticsProperties,
  safeRegisteredPublicAnalyticsDimension,
};

export async function recordServerAnalyticsEvent(event: ServerAnalyticsEvent) {
  return recordNeonAnalyticsEvent({
    eventName: event.eventName,
    eventCategory: event.category,
    sessionId: event.sessionId,
    leadId: event.leadId,
    properties: event.properties,
    utmSource: event.attribution?.source,
    utmMedium: event.attribution?.medium,
    utmCampaign: event.attribution?.campaign,
    userAgent: event.userAgent,
  });
}
