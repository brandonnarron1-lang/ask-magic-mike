import { z } from "zod";

export const TrackEventSchema = z.object({
  eventName: z.enum([
    "session_created",
    "landing_page_viewed",
    "cta_chip_clicked",
    "question_submitted",
    "address_entered",
    "intake_step_completed",
    "contact_info_submitted",
    "consent_granted",
    "consent_declined",
    "intake_completed",
    "intake_abandoned",
    "lead_scored",
    "lead_assigned",
    "agent_notified",
    "agent_accepted",
    "agent_contacted",
    "sla_accept_breached",
    "sla_contact_breached",
    "lead_escalated",
    "valuation_requested",
    "valuation_delivered",
    "crm_sync_success",
    "crm_sync_error",
  ]),
  sessionId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  properties: z.record(z.unknown()).optional().default({}),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
});

export type TrackEventInput = z.infer<typeof TrackEventSchema>;
