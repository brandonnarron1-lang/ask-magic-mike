import { describe, expect, it } from "vitest";
import { MESSAGE_TEMPLATE_REGISTRY, renderBrandedEmail } from "@/lib/messaging/template-registry";
import { MESSAGE_SEQUENCES, materializeSequence, validateSequenceDefinitions } from "@/lib/messaging/sequence-engine";

describe("Phase 6 template registry", () => {
  it("contains real email, SMS, push, and call templates across all required groups", () => {
    const groups = new Set(MESSAGE_TEMPLATE_REGISTRY.map((template) => template.group));
    for (const group of ["general", "home_value", "seller", "buyer", "seller_options", "rental", "short_term_rental", "property_alerts", "out_of_area", "coastal_review"]) {
      expect(groups.has(group as never)).toBe(true);
    }
    expect(MESSAGE_TEMPLATE_REGISTRY.some((template) => template.channel === "email")).toBe(true);
    expect(MESSAGE_TEMPLATE_REGISTRY.some((template) => template.channel === "sms")).toBe(true);
    expect(MESSAGE_TEMPLATE_REGISTRY.some((template) => template.channel === "push")).toBe(true);
    expect(MESSAGE_TEMPLATE_REGISTRY.some((template) => template.channel === "call")).toBe(true);
  });

  it("keeps all consumer templates approval-gated", () => {
    const consumer = MESSAGE_TEMPLATE_REGISTRY.filter((template) => !["internal_alert", "qa_test"].includes(template.purpose));
    expect(consumer.length).toBeGreaterThan(20);
    expect(consumer.every((template) => template.approval === "APPROVAL_REQUIRED")).toBe(true);
  });

  it("has internally valid sequence definitions", () => {
    expect(validateSequenceDefinitions()).toEqual([]);
    expect(MESSAGE_SEQUENCES).toHaveLength(8);
    const materialized = materializeSequence("home_value_review_v1", new Date("2026-08-15T12:00:00Z"));
    expect(materialized).toHaveLength(3);
    expect(materialized.every((step) => step.status === "approval_required")).toBe(true);
  });

  it("renders accessible test email with a visible QA banner and escaped content", () => {
    const email = renderBrandedEmail({ subject: "Preview", preheader: "Preview", heading: "Review <only>", body: "Do not contact & do not send.", isTest: true });
    expect(email.subject.startsWith("[TEST — BRANDON QA]")).toBe(true);
    expect(email.text).toContain("INTERNAL QA — DO NOT CONTACT");
    expect(email.html).toContain("Review &lt;only&gt;");
    expect(email.html).not.toContain("<only>");
  });
});
