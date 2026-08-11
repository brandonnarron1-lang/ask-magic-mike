"use client";

import { allowedWidgetParentOrigin } from "./publicOrigin";
import type { Attribution } from "./leadPayload";

export function postToWidgetParent(message: Record<string, unknown>, attribution?: Attribution) {
  if (typeof window === "undefined" || window.parent === window) return;
  const origin = allowedWidgetParentOrigin(attribution?.parent_url);
  if (!origin) return;
  window.parent.postMessage(message, origin);
}
