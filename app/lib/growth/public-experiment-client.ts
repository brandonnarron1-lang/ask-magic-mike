"use client";

import {
  HOME_VALUE_TRUST_EXPERIMENT,
  type PublicExperimentContext,
} from "./experiment-registry";
import { isBrowserAutomation } from "../browserAutomation";

export async function recordExperimentEvent(
  context: PublicExperimentContext,
  eventName: "exposure" | "lead_created",
  leadId?: string | null,
) {
  if (isBrowserAutomation()) return null;
  try {
    const response = await fetch("/api/experiments/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experiment_key: context.experimentKey,
        subject_key: context.subjectKey,
        event_name: eventName,
        lead_id: leadId ?? undefined,
        surface: HOME_VALUE_TRUST_EXPERIMENT.surface,
      }),
      keepalive: true,
    });
    if (!response.ok) return null;
    return await response.json() as {
      active?: boolean;
      recorded?: boolean;
      variant_key?: string | null;
    };
  } catch {
    return null;
  }
}
