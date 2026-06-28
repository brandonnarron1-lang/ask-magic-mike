import type { MemoryEventType, MemorySignificance } from "./types";

export const MEMORY_EVENT_LABELS: Record<MemoryEventType, string> = {
  first_contact:        "First Contact",
  lead_created:         "Lead Created",
  score_changed:        "Score Changed",
  status_changed:       "Status Changed",
  appointment_set:      "Appointment Set",
  appointment_missed:   "Appointment Missed",
  property_viewed:      "Property Viewed",
  question_asked:       "Question Asked",
  offer_interest:       "Offer Interest",
  campaign_exposed:     "Campaign Exposure",
  agent_assigned:       "Agent Assigned",
  follow_up_completed:  "Follow-Up Completed",
  conversion:           "Conversion",
  dead_lead:            "Lead Marked Dead",
  reactivation:         "Lead Reactivated",
};

export const SIGNIFICANCE_COLORS: Record<MemorySignificance, string> = {
  critical: "text-ruby-400",
  high:     "text-gold-300",
  medium:   "text-amber-400",
  low:      "text-slate-500",
};
