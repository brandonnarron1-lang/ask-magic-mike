"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "../../lib/analytics";
import { readAttribution } from "../../lib/attribution";
import { claimPublicNavigation } from "../../lib/client/publicTraffic";

export function PublicTrafficTracker() {
  const path = usePathname();
  useEffect(() => {
    const eventId = claimPublicNavigation(path);
    if (eventId) trackEvent("page_view", readAttribution(), {}, { trafficEventId: eventId });
  }, [path]);
  return null;
}
