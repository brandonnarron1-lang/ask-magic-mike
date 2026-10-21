"use client";

import { useRef, type FormEvent } from "react";
import { trackEvent } from "../analytics";
import type { Attribution, LeadSourceSurface } from "../leadPayload";

/** One first native input/change per mounted logical form. No field name or
 * value is collected. Existing attempt/accepted events keep their meanings. */
export function useIntakeEngagement(attribution: Attribution, funnel: string, surface: LeadSourceSurface, sessionId?: string | null) {
  const recorded = useRef(false);
  return (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (recorded.current || !(target instanceof HTMLElement) || !target.matches("input:not([type=hidden]):not([name=website]),select,textarea") || target.matches(":disabled")) return;
    recorded.current = true;
    trackEvent("intake_started", attribution, { funnel_name: funnel, lead_source_surface: surface }, { sessionId });
  };
}
