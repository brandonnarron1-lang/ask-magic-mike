/**
 * QualificationEngine
 *
 * Pure, deterministic "what should we ask next" rules per lead type.
 * Returns up to three candidate questions ranked by information value,
 * plus a `done` flag when we have enough to route.
 */
import type { LeadType } from "@/lib/leads/lead-types";

export interface QualificationState {
  hasContact:           boolean;
  hasAddress:           boolean;
  hasTimeline:          boolean;
  hasCondition:         boolean;
  hasOccupancy:         boolean;
  hasBudget:            boolean;
  hasPreapproval:       boolean;
  hasMotivation:        boolean;
  hasListingId:         boolean;
  hasPreferredContact:  boolean;
}

export interface NextQuestion {
  key: string;
  label: string;
}

export interface QualificationDecision {
  done: boolean;
  questions: NextQuestion[];
  /** Whether to stop questioning and hand off to a human. */
  handoff: boolean;
}

/** Hand-off after 5 questions per the brief. */
const MAX_QUESTIONS_BEFORE_HANDOFF = 5;

export function nextQuestions(
  leadType: LeadType,
  state: QualificationState,
  alreadyAsked: number
): QualificationDecision {
  const queue: NextQuestion[] = [];

  if (!state.hasContact) {
    queue.push({ key: "contact", label: "What's the best phone or email for follow-up?" });
  }
  if (!state.hasPreferredContact) {
    queue.push({ key: "preferred_contact_method", label: "Do you prefer text, call, or email?" });
  }

  switch (leadType) {
    case "buyer":
      if (!state.hasBudget)
        queue.push({ key: "budget", label: "What price range are you considering?" });
      if (!state.hasTimeline)
        queue.push({ key: "timeline", label: "What's your move-in timeline?" });
      if (!state.hasPreapproval)
        queue.push({ key: "preapproval", label: "Are you preapproved, in process, or not started?" });
      break;
    case "seller":
    case "home_value":
      if (!state.hasAddress)
        queue.push({ key: "address", label: "What's the property address?" });
      if (!state.hasTimeline)
        queue.push({ key: "timeline", label: "When are you hoping to sell?" });
      if (!state.hasMotivation)
        queue.push({ key: "motivation", label: "What's prompting the move?" });
      break;
    case "seller_cash_offer":
    case "investor":
      if (!state.hasAddress)
        queue.push({ key: "address", label: "What's the property address?" });
      if (!state.hasCondition)
        queue.push({ key: "condition", label: "How would you describe the condition?" });
      if (!state.hasOccupancy)
        queue.push({ key: "occupancy", label: "Is the property owner-occupied, tenant-occupied, or vacant?" });
      if (!state.hasTimeline)
        queue.push({ key: "timeline", label: "How quickly do you need to sell?" });
      break;
    case "listing_inquiry":
      if (!state.hasListingId)
        queue.push({ key: "listing_id", label: "Which listing or address are you asking about?" });
      if (!state.hasTimeline)
        queue.push({ key: "timeline", label: "What's your timeline?" });
      break;
    case "relocation":
    case "renter":
    case "agent_referral":
    case "general_question":
    case "unknown":
      if (!state.hasTimeline)
        queue.push({ key: "timeline", label: "What's the rough timeline?" });
      break;
  }

  const handoff = alreadyAsked >= MAX_QUESTIONS_BEFORE_HANDOFF;
  const done = queue.length === 0 || handoff;
  return { done, questions: queue.slice(0, 3), handoff };
}
