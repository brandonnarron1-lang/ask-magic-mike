import { z } from "zod";

const AnalyticsPropertyValueSchema = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const AnalyticsPropertiesSchema = z
  .record(AnalyticsPropertyValueSchema)
  .superRefine((value, ctx) => {
    if (Object.keys(value).length > 40) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Analytics properties are limited to 40 scalar dimensions",
      });
    }
  });

export const TrackEventSchema = z.object({
  eventName: z.enum([
    "session_created",
    "landing_page_viewed",
    "page_view",
    "cta_chip_clicked",
    "cta_click",
    "question_submitted",
    "address_entered",
    "address_started",
    "address_submitted",
    "intake_step_completed",
    "contact_info_submitted",
    "email_submitted",
    "phone_submitted",
    "timeline_selected",
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
    "lead_created",
    "lead_qualified",
    "lead_allocated",
    "duplicate_detected",
    "invalid_lead_detected",
    "compliance_review_required",
    "appointment_cta_clicked",
    "call_button_clicked",
    "appointment_requested",
    "chat_opened",
    "chat_message_sent",
    // Widget client events. Conversion success remains browser-visible, but
    // public ingestion refuses the canonical widget conversion row.
    "widget_opened",
    "widget_started",
    "widget_intent_selected",
    "widget_question_answered",
    "widget_contact_submitted",
    "widget_lead_created",
    "widget_cta_clicked",
    "widget_submit_failed",
  ]),
  sessionId: z.string().uuid().optional(),
  properties: AnalyticsPropertiesSchema.optional().default({}),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
}).strict();

export type TrackEventInput = z.infer<typeof TrackEventSchema>;
