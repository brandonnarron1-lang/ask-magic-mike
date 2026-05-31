"use client";

import { useCallback } from "react";
import type { AnalyticsEventName } from "@/types/domain.types";

export function useAnalytics(sessionId?: string | null) {
  const track = useCallback(
    async (
      eventName: AnalyticsEventName,
      properties?: Record<string, unknown>
    ) => {
      try {
        await fetch("/api/analytics/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName,
            sessionId: sessionId ?? undefined,
            properties: properties ?? {},
          }),
        });
      } catch {
        // analytics never blocks
      }
    },
    [sessionId]
  );

  return { track };
}
