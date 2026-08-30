import type { LeadPayload } from "./leadPayload";
import { routeLead } from "./leadRouting";
import type { LeadScore } from "./leadScoring";
import { renderLeadAlertDesignPreview } from "./leadAlertTemplates";

type PreviewBand = "hot" | "active" | "new";

export function leadAlertIdentityPreviewEnabled(
  vercelEnvironment: string | undefined = process.env.VERCEL_ENV,
  nodeEnvironment: string | undefined = process.env.NODE_ENV,
) {
  if (vercelEnvironment !== undefined) {
    return vercelEnvironment === "preview" || vercelEnvironment === "development";
  }
  return nodeEnvironment !== "production";
}

const PREVIEW_SCORE: Record<PreviewBand, number> = {
  hot: 92,
  active: 72,
  new: 48,
};

function scoreForPreview(band: PreviewBand): LeadScore {
  const score = PREVIEW_SCORE[band];
  return {
    score,
    grade: band,
    version: "deterministic_v1",
    factors: [
      {
        code: "synthetic_design_preview",
        label: "Synthetic design-only score",
        points: score,
      },
    ],
    explanation: "Synthetic design-only score; no lead or prediction exists.",
  };
}

function payloadForPreview(band: PreviewBand): LeadPayload {
  return {
    funnel_type: band === "active" ? "buyer" : band === "new" ? "chat" : "seller",
    lead_source_surface: "ask_page",
    lead_type: band === "active" ? "buyer" : band === "new" ? "general_question" : "seller",
    name: "INTERNAL DESIGN PREVIEW — NOT A LEAD",
    city: "Wilson",
    target_geography: "Wilson / Eastern NC",
    timeline: band === "hot" ? "Immediate" : band === "active" ? "30–90 days" : "Planning",
    question: "Synthetic template preview. No consumer record exists.",
    is_test: true,
    consent_email: false,
    consent_call: false,
    consent_sms: false,
    consent_language_version: "design-preview-only",
    attribution: {
      source: "Internal design preview",
      medium: "qa",
      campaign: "lead_alert_brand_identity",
      placement_id: "message-review-studio",
    },
    status: "new",
    assigned_agent_id: null,
  };
}

export const LEAD_ALERT_DESIGN_PREVIEWS = (["hot", "active", "new"] as const).map((band, index) => {
  const payload = payloadForPreview(band);
  const score = scoreForPreview(band);
  return {
    id: band,
    label: band === "hot" ? "Hot priority" : band === "active" ? "Active assignment" : "New lead",
    score: score.score,
    rendered: renderLeadAlertDesignPreview({
      leadId: `00000000-0000-4000-8000-00000000000${index + 1}`,
      sessionId: `10000000-0000-4000-8000-00000000000${index + 1}`,
      correlationId: `20000000-0000-4000-8000-00000000000${index + 1}`,
      payload,
      score,
      routing: routeLead(payload, score.score),
      submittedAt: "2026-08-24T12:00:00.000Z",
    }),
  };
});
