import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderLeadAlert, renderLeadAlertForTemplateVersion, LEAD_ALERT_TEMPLATE_VERSION } from "../../app/lib/leadAlertTemplates";
import { leadQuestionForDisplay, leadTimelineLabel, leadReceivedLabel } from "../../app/lib/leadReadability";
import { LEAD_ALERT_DESIGN_PREVIEWS } from "../../app/lib/leadAlertDesignPreview";

const input = LEAD_ALERT_DESIGN_PREVIEWS[0];
const payload = { funnel_type: "renter" as const, lead_source_surface: "renter_page" as const,
  name: "INTERNAL QA — DO NOT CONTACT", is_test: true, city: "Wilson", timeline: "3",
  email: "synthetic@example.test", consent_email: true, consent_sms: false, consent_call: false,
  attribution: { source: "ourtownproperties", content: "wordpress_rental_to_homeownership", first_touch: { campaign: "qa" } },
  status: "new" as const, assigned_agent_id: null };
const fixture = { leadId: "00000000-0000-4000-8000-000000000001", sessionId: "10000000-0000-4000-8000-000000000001",
  correlationId: "20000000-0000-4000-8000-000000000001", payload,
  score: { score: 23, grade: "new" as const, version: "deterministic_v1" as const, factors: [], explanation: "Synthetic" },
  routing: { owner: "mike" as const, sourceLabel: "ourtownproperties", intentLabel: "Renter-to-Homeownership", routingReason: "internal reason" },
  submittedAt: "2026-10-09T12:49:40.000Z" };
const oldVisualFlag = process.env.LEAD_ALERT_VISUALS_ENABLED;
afterEach(() => { if (oldVisualFlag === undefined) delete process.env.LEAD_ALERT_VISUALS_ENABLED; else process.env.LEAD_ALERT_VISUALS_ENABLED = oldVisualFlag; });

describe("readable lead email v4", () => {
  it("uses a short subject without private identity or diagnostic identifiers", () => {
    const alert = renderLeadAlert(fixture);
    expect(LEAD_ALERT_TEMPLATE_VERSION).toBe("lead_alert_email_v4");
    expect(alert.subject).toBe("[TEST] Ask Magic Mike | Renter-to-Homeownership | Our Town Properties website");
    expect(alert.subject.length).toBeLessThan(150);
    for (const diagnostic of ["First touch:", "UTMs:", "Click IDs:", "Correlation ID:", fixture.correlationId, "internal reason", "synthetic@example.test"]) {
      expect(alert.text).not.toContain(diagnostic); expect(alert.html).not.toContain(diagnostic);
    }
    expect(alert.text).toContain("INTERNAL QA — DO NOT CONTACT");
    expect(alert.text).toContain("No consumer acknowledgment, SMS or nurture");
    expect(alert.text).toContain("Oct 9, 2026, 8:49 AM EDT");
    expect(alert.text).toContain("Within 90 days");
  });
  it("opens the main saved record while explaining a newer deduplicated inquiry", () => {
    const canonical = "00000000-0000-4000-8000-000000000099";
    const alert = renderLeadAlert({ ...fixture, duplicateOfLeadId: canonical });
    expect(alert.html).toContain(`/admin/leads/${canonical}`);
    expect(alert.html).not.toContain(`/admin/leads/${fixture.leadId}`);
    expect(alert.text).toContain("not a new assignment");
  });
  it("retains version-pinned old retries rather than changing existing delivery history", () => {
    for (const version of ["lead_alert_email_v1", "lead_alert_email_v2", "lead_alert_email_v3"]) {
      const old = renderLeadAlertForTemplateVersion(fixture, version)!;
      expect(old.text).toContain("First touch:"); expect(old.text).toContain(fixture.correlationId);
      expect(old.text).not.toContain("YOUR THREE-STEP WALKTHROUGH");
    }
    expect(renderLeadAlertForTemplateVersion(fixture, "lead_alert_email_v4")?.text).toContain("YOUR THREE-STEP WALKTHROUGH");
    expect(renderLeadAlertForTemplateVersion(fixture, "unknown")).toBeNull();
  });
  it("escapes untrusted fields, uses UTF-8, stacks facts instead of narrow columns, and keeps images optional", () => {
    const alert = renderLeadAlert({ ...fixture, payload: { ...payload, name: '<img src=x onerror="alert(1)">', city: 'Élm City & Wilson' } });
    expect(alert.html).toContain('charset="utf-8"');
    expect(alert.html).toContain("&lt;img"); expect(alert.html).toContain("Élm City &amp; Wilson");
    expect(alert.html).not.toContain('width:38%'); expect(alert.html).not.toContain('<script');
    expect(alert.html).toContain('color:#090909;text-align:center');
    process.env.LEAD_ALERT_VISUALS_ENABLED = "false";
    expect(renderLeadAlert(fixture).html).not.toContain('<img');
    expect(renderLeadAlert(fixture).text).toContain("Open saved lead:");
  });
  it("does not turn read-only design previews into prospects", () => {
    expect(input.rendered.text).toContain("INTERNAL DESIGN PREVIEW — NO LEAD EXISTS");
    expect(input.rendered.text).toContain("No action. This is a read-only synthetic template preview.");
  });
  it("exports a no-send synthetic review artifact only on explicit local request", () => {
    if (process.env.AMM_RENDER_READABLE_EMAIL !== "1") return;
    const folder = ".amm-run/lead-alert-readability-20261009";
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    writeFileSync(`${folder}/email-preview.html`, input.rendered.html, { mode: 0o600 });
    writeFileSync(`${folder}/email-preview.txt`, input.rendered.text, { mode: 0o600 });
  });
});

describe("display-only intake clarity", () => {
  it("removes only a recognized server-appended envelope without mutating stored text", () => {
    const text = 'Question: INTERNAL QA — DO NOT CONTACT\nTimeline: ASAP\nAttribution: {"source":"ourtownproperties","first_touch":{}}; Consent: {"email":true}';
    expect(leadQuestionForDisplay(text)).toBe('Question: INTERNAL QA — DO NOT CONTACT\nTimeline: ASAP');
    expect(text).toContain('Consent:');
    for (const original of ['Please explain attribution.', 'Question\nAttribution: not JSON', 'Question\nAttribution: {"customer_quote":true}', 'Question\nAttribution: {"source":"web"}; Consent: broken']) expect(leadQuestionForDisplay(original)).toBe(original);
  });
  it("labels numeric timeframes and handles daylight saving time without changing timestamps", () => {
    expect(leadTimelineLabel(0)).toBe("Immediate / within 30 days");
    expect(leadTimelineLabel(null)).toBe("Timeline not recorded");
    expect(leadReceivedLabel("2026-10-02T01:56:00.040Z")).toContain("Oct 1, 2026, 9:56 PM EDT");
    expect(leadReceivedLabel("2026-12-02T01:56:00.040Z")).toContain("EST");
    expect(leadReceivedLabel("bad date")).toBe("Receipt time not recorded");
  });
});
