import { afterEach, describe, expect, it } from "vitest";
import { LEAD_ALERT_DESIGN_PREVIEWS } from "../../app/lib/leadAlertDesignPreview";
import {
  LEAD_ALERT_TEMPLATE_VERSION,
  renderLeadAlert,
  renderLeadAlertForTemplateVersion,
} from "../../app/lib/leadAlertTemplates";
import type { LeadPayload } from "../../app/lib/leadPayload";
import { routeLead } from "../../app/lib/leadRouting";
import { scoreLead } from "../../app/lib/leadScoring";

const originalVisualFlag = process.env.LEAD_ALERT_VISUALS_ENABLED;

afterEach(() => {
  if (originalVisualFlag === undefined) delete process.env.LEAD_ALERT_VISUALS_ENABLED;
  else process.env.LEAD_ALERT_VISUALS_ENABLED = originalVisualFlag;
});

const qaPayload: LeadPayload = {
  funnel_type: "seller",
  lead_source_surface: "seller_page",
  lead_type: "seller",
  name: "INTERNAL QA — DO NOT CONTACT",
  city: "Wilson",
  timeline: "Immediate",
  question: "INTERNAL QA — DO NOT CONTACT",
  is_test: true,
  consent_email: false,
  consent_call: false,
  consent_sms: false,
  attribution: { source: "Internal QA", placement_id: "lead-alert-brand-test" },
  status: "new",
  assigned_agent_id: null,
};

function renderQaAlert() {
  const score = scoreLead(qaPayload);
  return renderLeadAlert({
    leadId: "00000000-0000-4000-8000-000000000001",
    sessionId: "10000000-0000-4000-8000-000000000001",
    correlationId: "20000000-0000-4000-8000-000000000001",
    payload: qaPayload,
    score,
    routing: routeLead(qaPayload, score.score),
    submittedAt: "2026-08-24T12:00:00.000Z",
  });
}

describe("lead-alert brand identity", () => {
  it("versions the branded email and composes only approved project assets", () => {
    expect(LEAD_ALERT_TEMPLATE_VERSION).toBe("lead_alert_email_v3");
    const rendered = renderQaAlert();

    expect(rendered.html).toContain("/images/ask-magic-mike/our-town-properties-logo.webp");
    expect(rendered.html).toContain("/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.webp");
    expect(rendered.html).toContain('alt="Our Town Properties, Inc."');
    expect(rendered.html).toContain('alt="Mike Eatmon, Broker and REALTOR"');
    expect(rendered.html).toContain(rendered.visualTemplate.backgroundAssetPath);
    expect(rendered.html).not.toContain("data:image/");
    expect(rendered.html).not.toContain("LEAD_NOTIFICATION_BCC");
  });

  it("previews all urgency bands without inventing a live lead or contact detail", () => {
    expect(LEAD_ALERT_DESIGN_PREVIEWS.map((preview) => preview.rendered.visualTemplate.id)).toEqual([
      "hot_priority",
      "active_assignment",
      "new_lead",
    ]);

    for (const preview of LEAD_ALERT_DESIGN_PREVIEWS) {
      expect(preview.rendered.subject).toContain("[TEST]");
      expect(preview.rendered.text).toContain("INTERNAL DESIGN PREVIEW — NO LEAD EXISTS");
      expect(preview.rendered.text).toContain("No action. This is a read-only synthetic template preview.");
      expect(preview.rendered.html).not.toContain("LIVE PROSPECT");
      expect(preview.rendered.safeEmail).toBeNull();
      expect(preview.rendered.safePhone).toBeNull();
    }
  });

  it("keeps queued v1/v2 retries version-pinned and fails closed for an unknown template", () => {
    const score = scoreLead(qaPayload);
    const input = {
      leadId: "00000000-0000-4000-8000-000000000001",
      sessionId: "10000000-0000-4000-8000-000000000001",
      correlationId: "20000000-0000-4000-8000-000000000001",
      payload: qaPayload,
      score,
      routing: routeLead(qaPayload, score.score),
      submittedAt: "2026-08-24T12:00:00.000Z",
    };

    const legacy = renderLeadAlertForTemplateVersion(input, "lead_alert_email_v2");
    const current = renderLeadAlertForTemplateVersion(input, LEAD_ALERT_TEMPLATE_VERSION);

    expect(legacy?.html).toContain("lead-alert-frame-v1.png");
    expect(legacy?.html).not.toContain("mike-avatar-circle-256.webp");
    expect(current?.html).toContain("mike-avatar-circle-256.webp");
    expect(renderLeadAlertForTemplateVersion(input, "lead_alert_email_unknown")).toBeNull();
  });

  it("preserves the existing no-image fallback when visuals are disabled", () => {
    process.env.LEAD_ALERT_VISUALS_ENABLED = "false";
    const rendered = renderQaAlert();

    expect(rendered.html).not.toContain("our-town-properties-logo.webp");
    expect(rendered.html).not.toContain("mike-avatar-circle-256.webp");
    expect(rendered.html).not.toContain(rendered.visualTemplate.backgroundAssetPath);
    expect(rendered.text).toContain("QA TEST — DO NOT CONTACT");
  });
});
