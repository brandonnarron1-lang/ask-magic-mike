"use client";

import { analyticsEvents } from "./constants";
import { getDeviceCategory } from "./attribution";
import { isBrowserAutomation } from "./browserAutomation";
import type { Attribution } from "./leadPayload";
import { allowedWidgetParentOrigin } from "./publicOrigin";
import {
  safePublicAnalyticsProperties,
  safeRegisteredPublicAnalyticsDimension,
} from "@/lib/analytics/privacy";
import { publishExternalAnalyticsEvent } from "./externalAnalytics";

export type EventName = (typeof analyticsEvents)[number];

export function trackEvent(
  event: EventName,
  attribution: Attribution,
  properties: Record<string, string | number | boolean | undefined> = {},
) {
  if (typeof window === "undefined") return;

  const safeProperties = safePublicAnalyticsProperties(event, {
    ...properties,
    current_path: window.location.pathname,
    device_category: attribution.device_category || getDeviceCategory(),
    placement: attribution.placement,
    placement_id: attribution.placement_id,
    utm_source: attribution.source,
    utm_medium: attribution.medium,
    utm_campaign: attribution.campaign,
  });
  const payload = {
    event,
    properties: safeProperties,
  };

  window.dispatchEvent(new CustomEvent("askmagicmike:event", { detail: payload }));

  publishExternalAnalyticsEvent(event, safeProperties);

  const maybeWindow = window as Window & { parent?: Window };

  // The in-page event remains available to first-party UI listeners, while
  // this small server ledger gives the lead pipe an auditable event without
  // sending PII.
  if (!isBrowserAutomation()) {
    void window.fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: event,
        event_category: "intake",
        properties: safeProperties,
        attribution: {
          source: safeRegisteredPublicAnalyticsDimension("utm_source", attribution.source) ?? undefined,
          medium: safeRegisteredPublicAnalyticsDimension("utm_medium", attribution.medium) ?? undefined,
          campaign: safeRegisteredPublicAnalyticsDimension("utm_campaign", attribution.campaign) ?? undefined,
        },
      }),
      keepalive: true,
    }).catch(() => undefined);
  }

  if (window.parent && window.parent !== window) {
    const parentOrigin = allowedWidgetParentOrigin(attribution.parent_url);
    if (parentOrigin) {
      window.parent.postMessage({ type: "askmagicmike:event", ...payload }, parentOrigin);
    }
  }
}
