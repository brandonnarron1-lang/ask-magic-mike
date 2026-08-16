import { describe, expect, it } from "vitest";
import { renderBrandedEmail, renderMessageTemplate, templateVersionHistory } from "@/lib/messaging/template-registry";

describe("Phase 7 template governance", () => {
  it("retains rollback history and marks the current release", () => {
    const history = templateVersionHistory("home_value.email.received");
    expect(history.map((item) => item.version)).toEqual(["phase6-v1", "phase7-v1"]);
    expect(history.map((item) => item.status)).toEqual(["retired", "approved"]);
  });

  it("fails closed when required render variables are missing", () => {
    expect(renderMessageTemplate("internal.lead_alert", {})).toMatchObject({
      ok: false,
      error: "template_variables_missing",
    });
  });

  it("rejects unknown render variables instead of accepting an ungoverned merge field", () => {
    expect(renderMessageTemplate("general.email.received", { injected: "not allowed" })).toEqual({
      ok: false,
      error: "template_variables_unknown",
      unknown: ["injected"],
    });
  });

  it("renders a version-pinned template without unresolved tokens", () => {
    const rendered = renderMessageTemplate("internal.lead_alert", {
      priority: "[TEST]", lead_label: "SELLER LEAD", source: "QA", intent: "Home Value",
      location: "Wilson", name: "INTERNAL QA", score: 91,
    });
    expect(rendered).toMatchObject({ ok: true, version: "phase7-v1" });
    expect(rendered).toHaveProperty("contentHash");
    expect((rendered as { contentHash: string }).contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rendered)).not.toContain("{{");
  });

  it("uses the exact Brandon QA prefixes and accessible HTML", () => {
    const brandon = renderBrandedEmail({ subject: "Review", preheader: "Review", heading: "Review", body: "Review", isTest: true });
    const mikeView = renderBrandedEmail({ subject: "Review", preheader: "Review", heading: "Review", body: "Review", isTest: true, qaAudience: "mike_view" });
    expect(brandon.subject).toMatch(/^\[TEST — BRANDON QA\]/);
    expect(mikeView.subject).toMatch(/^\[TEST — BRANDON QA — MIKE VIEW\]/);
    expect(brandon.html).toContain('<html lang="en">');
    expect(brandon.html).toContain('name="color-scheme"');
    expect(brandon.html).toContain("INTERNAL QA — DO NOT CONTACT");
    expect(brandon.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
