import type { LeadPayload } from "./leadPayload";
import type { LeadScore } from "./leadScoring";

/**
 * The supplied lead-alert artwork is a creative reference, not a runtime
 * record. Putting a consumer's details into a raster image would make the
 * details stale, inaccessible, and difficult to suppress. This selector keeps
 * the same high-contrast visual hierarchy while rendering all lead facts as
 * normal, accessible HTML/text.
 */
export type LeadAlertVisualTemplate = {
  id: "hot_priority" | "active_assignment" | "new_lead" | "qa_test";
  version: string;
  label: string;
  eyebrow: string;
  accent: string;
  backgroundAssetPath: string;
  smsEnabled: boolean;
};

const FRAME = "/images/ask-magic-mike/notifications/lead-alert-frame-v1.png";

export function selectLeadAlertVisualTemplate(
  payload: Pick<LeadPayload, "is_test">,
  score: Pick<LeadScore, "score">,
): LeadAlertVisualTemplate {
  if (payload.is_test) {
    return {
      id: "qa_test",
      version: "lead_visual_qa_v1",
      label: "QA test lead",
      eyebrow: "INTERNAL QA — DO NOT CONTACT",
      accent: "#94a3b8",
      backgroundAssetPath: FRAME,
      smsEnabled: false,
    };
  }
  if (score.score >= 80) {
    return {
      id: "hot_priority",
      version: "lead_visual_hot_v1",
      label: "Priority lead",
      eyebrow: "PRIORITY LEAD — REVIEW NOW",
      accent: "#dc2626",
      backgroundAssetPath: FRAME,
      smsEnabled: true,
    };
  }
  if (score.score >= 60) {
    return {
      id: "active_assignment",
      version: "lead_visual_active_v1",
      label: "Active lead",
      eyebrow: "LEAD ASSIGNMENT — REVIEW TODAY",
      accent: "#d4a72c",
      backgroundAssetPath: FRAME,
      smsEnabled: true,
    };
  }
  return {
    id: "new_lead",
    version: "lead_visual_new_v1",
    label: "New lead",
    eyebrow: "NEW LEAD — REVIEW WHEN AVAILABLE",
    accent: "#b68b22",
    backgroundAssetPath: FRAME,
    smsEnabled: false,
  };
}

export function visualAssetUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
  return `${base}${path}`;
}

export function shouldRenderLeadAlertVisual() {
  return (process.env.LEAD_ALERT_VISUALS_ENABLED || "true").toLowerCase() === "true";
}

/** SMS intentionally stays text-only: it is faster, more accessible, avoids
 * carrier MMS conversion, and never embeds lead PII in an image. */
export function shouldQueueAgentUrgencySms(input: {
  isTest: boolean;
  score: number;
  hasApprovedSmsRecipient: boolean;
  smsDeliveryEnabled: boolean;
}) {
  return !input.isTest && input.score >= 60 && input.hasApprovedSmsRecipient && input.smsDeliveryEnabled;
}
