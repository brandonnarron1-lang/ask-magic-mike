import type { Temperature } from "@/types/domain.types";
import {
  TEMPERATURE_THRESHOLDS,
  URGENT_TIMELINE_MAX_MONTHS,
} from "./constants";

export function classifyTemperature(
  compositeScore: number,
  timelineMonths: number | null
): Temperature {
  if (
    compositeScore >= TEMPERATURE_THRESHOLDS.urgent &&
    timelineMonths !== null &&
    timelineMonths <= URGENT_TIMELINE_MAX_MONTHS
  ) {
    return "urgent";
  }

  if (compositeScore >= TEMPERATURE_THRESHOLDS.hot) return "hot";
  if (compositeScore >= TEMPERATURE_THRESHOLDS.warm) return "warm";
  if (compositeScore >= TEMPERATURE_THRESHOLDS.nurture) return "nurture";
  return "low";
}
