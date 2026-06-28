/**
 * Follow-up Calendar — recommended outreach schedule for a lead.
 *
 * Pure deterministic. No API calls. No writes.
 * Generates a structured schedule of follow-up touchpoints,
 * each with channel, priority, reason, and message template.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FollowUpChannel = "call" | "text" | "email" | "none";
export type FollowUpPriority = "critical" | "high" | "medium" | "low";

export interface FollowUpTouchpoint {
  /** Human-readable delay label ("5 min", "2 hours", "Next morning", etc.) */
  delayLabel: string;
  /** Delay in hours from lead creation */
  delayHours: number;
  channel: FollowUpChannel;
  priority: FollowUpPriority;
  reason: string;
  templateId: string;
  /** Short suggested message (NOT sent automatically — for agent reference only) */
  messageTemplate: string;
}

export interface FollowUpCalendar {
  touchpoints: FollowUpTouchpoint[];
  totalTouchpoints: number;
  primaryChannel: FollowUpChannel;
  urgencyLevel: "immediate" | "same-day" | "this-week" | "nurture";
}

export interface FollowUpCalendarInput {
  leadType?: string | null;
  temperature?: string | null;
  grade?: string | null;
  hasPhone?: boolean;
  hasEmail?: boolean;
  consentSms?: boolean;
  consentEmail?: boolean;
  consentCall?: boolean;
  firstName?: string | null;
  status?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function preferredChannel(input: FollowUpCalendarInput): FollowUpChannel {
  if (input.consentCall && input.hasPhone) return "call";
  if (input.consentSms && input.hasPhone)  return "text";
  if (input.consentEmail && input.hasEmail) return "email";
  if (input.hasPhone) return "call";
  if (input.hasEmail) return "email";
  return "none";
}

function smsTemplate(firstName: string | null, type: string, idx: number): string {
  const name = firstName ?? "there";
  const templates: Record<string, string[]> = {
    seller_cash_offer: [
      `Hi ${name}, this is Mike Eatmon with Our Town Properties. You asked about a cash offer — I can get you a number. Best time to chat?`,
      `Hey ${name}, just circling back on your cash offer inquiry. Still interested? Takes 10 min by phone.`,
      `Hi ${name}, Mike here — following up one more time on your home value. Let me know if you'd like a quick call.`,
    ],
    seller: [
      `Hi ${name}, Mike Eatmon here. You asked about your home's value — happy to give you a real local estimate. Got 10 min?`,
      `Hey ${name}, following up on your home value question. Wilson market is active — want the latest numbers?`,
      `Hi ${name}, Mike with Our Town Properties. Still thinking about selling? I'd love to help.`,
    ],
    buyer: [
      `Hi ${name}, Mike Eatmon here. You were looking at homes in Wilson NC — I have some great listings to share. Interested?`,
      `Hey ${name}, following up on your home search. New properties just hit the market. Want me to send details?`,
      `Hi ${name}, just checking in on your home search. Anything I can help with?`,
    ],
    default: [
      `Hi ${name}, this is Mike Eatmon with Our Town Properties in Wilson NC. Saw your inquiry — happy to help. Best time to chat?`,
      `Hey ${name}, following up on your real estate question. Let me know if you have any questions.`,
      `Hi ${name}, Mike here — just a final follow-up. Reach me anytime at your convenience.`,
    ],
  };
  const arr = templates[type] ?? templates.default;
  return arr[Math.min(idx, arr.length - 1)];
}

function emailSubject(type: string, idx: number): string {
  const subjects: Record<string, string[]> = {
    seller_cash_offer: [
      "Your cash offer estimate — Mike Eatmon, Our Town Properties",
      "Following up on your home value inquiry",
      "One last thought on your Wilson NC home",
    ],
    seller: [
      "Your Wilson NC home value — Mike Eatmon",
      "Wilson market update — homes like yours",
      "Still thinking about selling? A quick note from Mike",
    ],
    buyer: [
      "Wilson NC homes that match your search",
      "New listings in Wilson NC you might like",
      "Your home search — a note from Mike Eatmon",
    ],
    default: [
      "Your real estate question — Mike Eatmon, Our Town Properties",
      "Following up on your inquiry",
      "A quick note from Mike Eatmon",
    ],
  };
  const arr = subjects[type] ?? subjects.default;
  return arr[Math.min(idx, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// Schedule builder
// ---------------------------------------------------------------------------

export function buildFollowUpCalendar(input: FollowUpCalendarInput): FollowUpCalendar {
  const temp = input.temperature ?? "";
  const grade = input.grade ?? "C";
  const type = input.leadType ?? "general_question";
  const status = input.status ?? "new";
  const name = input.firstName ?? null;
  const primary = preferredChannel(input);

  if (status === "closed_won" || status === "closed_lost" || status === "disqualified") {
    return {
      touchpoints: [],
      totalTouchpoints: 0,
      primaryChannel: primary,
      urgencyLevel: "nurture",
    };
  }

  // Determine urgency level
  const urgencyLevel =
    (temp === "urgent" || grade === "A+")  ? "immediate"
    : (temp === "hot"  || grade === "A")   ? "same-day"
    : (temp === "warm" || grade === "B")   ? "this-week"
    : "nurture";

  const touchpoints: FollowUpTouchpoint[] = [];

  if (urgencyLevel === "immediate") {
    touchpoints.push({
      delayLabel: "5 min",
      delayHours: 0.083,
      channel: primary === "none" ? "email" : primary,
      priority: "critical",
      reason: "A+ / urgent leads respond best within 5 minutes of inquiry",
      templateId: "urgent_first_contact",
      messageTemplate: smsTemplate(name, type, 0),
    });
    touchpoints.push({
      delayLabel: "2 hours",
      delayHours: 2,
      channel: primary === "call" ? "text" : primary,
      priority: "high",
      reason: "Second touch if first contact goes unanswered",
      templateId: "urgent_followup_2h",
      messageTemplate: smsTemplate(name, type, 1),
    });
    touchpoints.push({
      delayLabel: "Next morning (9 AM)",
      delayHours: 18,
      channel: "email",
      priority: "high",
      reason: "Email follow-up with listing or value info to keep lead warm",
      templateId: "email_day1",
      messageTemplate: emailSubject(type, 0),
    });
    touchpoints.push({
      delayLabel: "2 days",
      delayHours: 48,
      channel: primary === "none" ? "email" : primary,
      priority: "medium",
      reason: "Third touch for leads who haven't responded",
      templateId: "day2_followup",
      messageTemplate: smsTemplate(name, type, 2),
    });
    touchpoints.push({
      delayLabel: "1 week",
      delayHours: 168,
      channel: "email",
      priority: "low",
      reason: "Market update email — maintains relationship if not yet converted",
      templateId: "week1_nurture",
      messageTemplate: emailSubject(type, 1),
    });
    touchpoints.push({
      delayLabel: "30 days",
      delayHours: 720,
      channel: "email",
      priority: "low",
      reason: "Long-term nurture — Wilson market update",
      templateId: "month1_nurture",
      messageTemplate: emailSubject(type, 2),
    });
  } else if (urgencyLevel === "same-day") {
    touchpoints.push({
      delayLabel: "1 hour",
      delayHours: 1,
      channel: primary === "none" ? "email" : primary,
      priority: "high",
      reason: "Hot lead — first response within 1 hour dramatically increases conversion",
      templateId: "hot_first_contact",
      messageTemplate: smsTemplate(name, type, 0),
    });
    touchpoints.push({
      delayLabel: "Same day (PM)",
      delayHours: 8,
      channel: "email",
      priority: "high",
      reason: "Email follow-up with relevant content if not yet reached",
      templateId: "hot_email_sameday",
      messageTemplate: emailSubject(type, 0),
    });
    touchpoints.push({
      delayLabel: "Next morning",
      delayHours: 18,
      channel: primary === "none" ? "email" : primary,
      priority: "medium",
      reason: "Second touch — leads who haven't responded still convert at 3× rate vs. no follow-up",
      templateId: "hot_day2",
      messageTemplate: smsTemplate(name, type, 1),
    });
    touchpoints.push({
      delayLabel: "2 days",
      delayHours: 48,
      channel: "email",
      priority: "medium",
      reason: "Value-add email — market data or listings",
      templateId: "hot_day2_email",
      messageTemplate: emailSubject(type, 1),
    });
    touchpoints.push({
      delayLabel: "1 week",
      delayHours: 168,
      channel: primary === "none" ? "email" : primary,
      priority: "low",
      reason: "Final direct outreach before moving to nurture",
      templateId: "hot_week1",
      messageTemplate: smsTemplate(name, type, 2),
    });
    touchpoints.push({
      delayLabel: "30 days",
      delayHours: 720,
      channel: "email",
      priority: "low",
      reason: "Nurture — Wilson market update, keep relationship warm",
      templateId: "month1_nurture",
      messageTemplate: emailSubject(type, 2),
    });
  } else if (urgencyLevel === "this-week") {
    touchpoints.push({
      delayLabel: "4 hours",
      delayHours: 4,
      channel: primary === "none" ? "email" : primary,
      priority: "medium",
      reason: "Warm lead — respond within the business day",
      templateId: "warm_first_contact",
      messageTemplate: smsTemplate(name, type, 0),
    });
    touchpoints.push({
      delayLabel: "Next morning",
      delayHours: 18,
      channel: "email",
      priority: "medium",
      reason: "Follow-up email with market context",
      templateId: "warm_day2_email",
      messageTemplate: emailSubject(type, 0),
    });
    touchpoints.push({
      delayLabel: "2 days",
      delayHours: 48,
      channel: primary === "none" ? "email" : primary,
      priority: "low",
      reason: "Second direct touch",
      templateId: "warm_day2",
      messageTemplate: smsTemplate(name, type, 1),
    });
    touchpoints.push({
      delayLabel: "1 week",
      delayHours: 168,
      channel: "email",
      priority: "low",
      reason: "Market update to maintain relevance",
      templateId: "warm_week1",
      messageTemplate: emailSubject(type, 1),
    });
    touchpoints.push({
      delayLabel: "30 days",
      delayHours: 720,
      channel: "email",
      priority: "low",
      reason: "30-day nurture check-in",
      templateId: "month1_nurture",
      messageTemplate: emailSubject(type, 2),
    });
  } else {
    // Nurture track
    touchpoints.push({
      delayLabel: "24 hours",
      delayHours: 24,
      channel: "email",
      priority: "low",
      reason: "Nurture lead — low urgency but worth maintaining contact",
      templateId: "nurture_day1",
      messageTemplate: emailSubject(type, 0),
    });
    touchpoints.push({
      delayLabel: "1 week",
      delayHours: 168,
      channel: primary === "none" ? "email" : primary,
      priority: "low",
      reason: "Weekly touch to see if situation has changed",
      templateId: "nurture_week1",
      messageTemplate: smsTemplate(name, type, 1),
    });
    touchpoints.push({
      delayLabel: "30 days",
      delayHours: 720,
      channel: "email",
      priority: "low",
      reason: "Monthly market update — stay top of mind",
      templateId: "nurture_month1",
      messageTemplate: emailSubject(type, 2),
    });
  }

  return {
    touchpoints,
    totalTouchpoints: touchpoints.length,
    primaryChannel: primary,
    urgencyLevel,
  };
}
