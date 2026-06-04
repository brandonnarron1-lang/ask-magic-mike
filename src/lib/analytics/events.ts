import type { AnalyticsEventCategory, AnalyticsEventName } from "@/types/domain.types";

export const ANALYTICS_EVENTS: Record<
  AnalyticsEventName,
  { category: AnalyticsEventCategory; description: string }
> = {
  session_created: {
    category: "session",
    description: "New session row created on first page load",
  },
  landing_page_viewed: {
    category: "session",
    description: "User viewed the landing page",
  },
  cta_chip_clicked: {
    category: "intake",
    description: "User clicked a CTA chip on the landing page",
  },
  question_submitted: {
    category: "intake",
    description: "User submitted a free-text question",
  },
  address_entered: {
    category: "intake",
    description: "User entered a property address",
  },
  intake_step_completed: {
    category: "intake",
    description: "User completed an intake step",
  },
  contact_info_submitted: {
    category: "intake",
    description: "User submitted name/email/phone",
  },
  consent_granted: {
    category: "intake",
    description: "User granted at least one contact consent",
  },
  consent_declined: {
    category: "intake",
    description: "User declined all contact consent",
  },
  intake_completed: {
    category: "intake",
    description: "User completed all intake steps",
  },
  intake_abandoned: {
    category: "intake",
    description: "User abandoned the intake flow",
  },
  lead_scored: {
    category: "scoring",
    description: "Lead score computed and stored",
  },
  lead_assigned: {
    category: "routing",
    description: "Lead assigned to an agent",
  },
  agent_notified: {
    category: "routing",
    description: "Agent notification sent",
  },
  agent_accepted: {
    category: "routing",
    description: "Agent accepted the lead",
  },
  agent_contacted: {
    category: "routing",
    description: "Agent marked lead as contacted",
  },
  sla_accept_breached: {
    category: "routing",
    description: "Agent did not accept within 2-minute SLA",
  },
  sla_contact_breached: {
    category: "routing",
    description: "Agent did not contact within 5-minute SLA",
  },
  lead_escalated: {
    category: "routing",
    description: "Lead escalated to admin",
  },
  valuation_requested: {
    category: "valuation",
    description: "User requested a home valuation estimate",
  },
  valuation_delivered: {
    category: "valuation",
    description: "Valuation report delivered to user",
  },
  crm_sync_success: {
    category: "crm",
    description: "Lead synced to CRM successfully",
  },
  crm_sync_error: {
    category: "crm",
    description: "CRM sync failed",
  },
  // Canonical platform additions
  lead_created: {
    category: "intake",
    description: "New lead row created via POST /api/leads",
  },
  duplicate_detected: {
    category: "intake",
    description: "Incoming lead matched an existing record",
  },
  spam_flagged: {
    category: "system",
    description: "Incoming lead exceeded the spam-reject threshold",
  },
  rate_limited: {
    category: "system",
    description: "Public endpoint blocked a request via rate limiter",
  },
  listing_imported: {
    category: "system",
    description: "FlexMLS CSV/PDF import completed",
  },
  listing_viewed: {
    category: "intake",
    description: "User viewed a listing page",
  },
  listing_matched: {
    category: "intake",
    description: "Lead matched to one or more listings",
  },
  marketing_asset_generated: {
    category: "system",
    description: "Marketing template render produced a generated asset",
  },
  sms_sent: {
    category: "intake",
    description: "Outbound SMS sent (mock or live)",
  },
  sms_received: {
    category: "intake",
    description: "Inbound SMS received via webhook",
  },
  sms_delivered: {
    category: "intake",
    description: "Carrier confirmed delivery",
  },
  sms_failed: {
    category: "intake",
    description: "Carrier reported failure",
  },
  email_sent: {
    category: "intake",
    description: "Outbound email sent (mock or live)",
  },
  email_received: {
    category: "intake",
    description: "Inbound email captured via webhook",
  },
  email_opened: {
    category: "intake",
    description: "Provider reported email open",
  },
  email_clicked: {
    category: "intake",
    description: "Provider reported link click",
  },
  lead_updated: {
    category: "intake",
    description: "Admin or system mutated a lead row",
  },
  note_added: {
    category: "admin",
    description: "Note appended to a lead",
  },
  task_created: {
    category: "admin",
    description: "Task created on a lead",
  },
  task_completed: {
    category: "admin",
    description: "Task closed",
  },
  appointment_requested: {
    category: "intake",
    description: "Lead requested an appointment",
  },
  appointment_set: {
    category: "intake",
    description: "Appointment scheduled",
  },
  appointment_completed: {
    category: "intake",
    description: "Appointment occurred",
  },
  widget_opened: {
    category: "intake",
    description: "Widget launcher opened",
  },
  widget_started: {
    category: "intake",
    description: "Widget conversation started",
  },
  widget_intent_selected: {
    category: "intake",
    description: "User picked an intent in widget",
  },
  widget_question_answered: {
    category: "intake",
    description: "Widget question answered",
  },
  widget_contact_submitted: {
    category: "intake",
    description: "User submitted contact info via widget",
  },
  widget_lead_created: {
    category: "intake",
    description: "Widget posted a lead through /api/leads",
  },
  widget_cta_clicked: {
    category: "intake",
    description: "Widget CTA tap",
  },
  opt_out: {
    category: "intake",
    description: "User opted out of a channel",
  },
  opt_in: {
    category: "intake",
    description: "User opted in to a channel",
  },
};
