"use client";

import { analyticsEvents } from "./constants";
import { getDeviceCategory } from "./attribution";
import type { Attribution } from "./leadPayload";
import { allowedWidgetParentOrigin } from "./publicOrigin";

export type EventName = (typeof analyticsEvents)[number];

export function trackEvent(
  event: EventName,
  attribution: Attribution,
  properties: Record<string, string | number | boolean | undefined> = {},
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    properties: {
      ...properties,
      ...attribution,
      current_path: window.location.pathname + window.location.search,
      device_category: attribution.device_category || getDeviceCategory(),
    },
  };

  window.dispatchEvent(new CustomEvent("askmagicmike:event", { detail: payload }));

  const maybeWindow = window as Window & {
    dataLayer?: unknown[];
    posthog?: { capture?: (name: string, props: Record<string, unknown>) => void };
    parent?: Window;
  };

  maybeWindow.dataLayer?.push(payload);
  maybeWindow.posthog?.capture?.(event, payload.properties);

  // The browser event remains useful for GA/GTM/PostHog, while this small
  // server ledger gives the lead pipe an auditable event without sending PII.
  void window.fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: event,
      event_category: "intake",
      properties,
      attribution: {
        source: attribution.source,
        medium: attribution.medium,
        campaign: attribution.campaign,
      },
    }),
    keepalive: true,
  }).catch(() => undefined);

  if (window.parent && window.parent !== window) {
    const parentOrigin = allowedWidgetParentOrigin(attribution.parent_url);
    if (parentOrigin) {
      window.parent.postMessage({ type: "askmagicmike:event", ...payload }, parentOrigin);
    }
  }
}
