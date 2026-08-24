"use client";

import { analyticsEvents } from "./constants";
import { getDeviceCategory } from "./attribution";
import { isBrowserAutomation } from "./browserAutomation";
import type { Attribution } from "./leadPayload";
import { allowedWidgetParentOrigin } from "./publicOrigin";
import {
  isCanonicalLedgerProtectedEvent,
  safePublicAnalyticsProperties,
  safeRegisteredPublicAnalyticsDimension,
} from "@/lib/analytics/privacy";
import { publishExternalAnalyticsEvent } from "./externalAnalytics";

export type EventName = (typeof analyticsEvents)[number];

type TrackEventOptions = {
  /**
   * Pseudonymous UUID already used by the matching lead submission. It is sent
   * only to the canonical first-party ledger; browser analytics integrations
   * continue to receive the event name and privacy-allowlisted dimensions.
   */
  sessionId?: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Durable conversion truth is written by POST /api/leads after the lead and
// notification outbox have been stored. The browser event remains available
// to GA/GTM/PostHog and widget parents, but must not create a second canonical
// lead_created row.
export function trackEvent(
  event: EventName,
  attribution: Attribution,
  properties: Record<string, string | number | boolean | undefined> = {},
  options: TrackEventOptions = {},
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

  // The browser event remains useful for GA/GTM/PostHog, while this small
  // server ledger gives the lead pipe an auditable event without sending PII.
  // A valid form/session UUID lets the server join funnel steps to the lead it
  // later stores. Invalid or absent identifiers fail closed to an unlinked
  // event rather than becoming an arbitrary analytics dimension. Automated
  // browser verification may exercise the UI but must not create first-party
  // ledger rows.
  if (!isCanonicalLedgerProtectedEvent(event) && !isBrowserAutomation()) {
    const sessionId = options.sessionId && UUID_PATTERN.test(options.sessionId)
      ? options.sessionId
      : undefined;
    void window.fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: event,
        event_category: "intake",
        session_id: sessionId,
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
