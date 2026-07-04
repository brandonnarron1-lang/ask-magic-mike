"use client";

import { analyticsEvents } from "./constants";
import { getDeviceCategory } from "./attribution";
import type { Attribution } from "./leadPayload";

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

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "askmagicmike:event", ...payload }, "*");
  }
}
