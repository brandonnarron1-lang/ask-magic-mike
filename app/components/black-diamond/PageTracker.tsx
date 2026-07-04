"use client";

import { useEffect } from "react";
import { trackEvent } from "@/app/lib/analytics";
import { readAttribution } from "@/app/lib/attribution";

type PageTrackerProps = {
  funnelName: string;
  stepName?: string;
};

export function PageTracker({ funnelName, stepName = "landing" }: PageTrackerProps) {
  useEffect(() => {
    const attribution = readAttribution();
    trackEvent("page_view", attribution, {
      funnel_name: funnelName,
      step_name: stepName,
    });
  }, [funnelName, stepName]);

  return null;
}
