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

  it("contains every required Phase 7 email family", () => {
    const ids = new Set(MESSAGE_TEMPLATE_REGISTRY.map((template) => template.id));
    for (const id of [
      "internal.lead_alert",
      "internal.mike_view_alert",
      "internal.daily_digest",
      "general.email.received",
      "home_value.email.received",
      "seller.email.received",
      "buyer.email.received",
      "seller_options.email.received",
      "seller_options.email.human_review",
      "rental.email.received",
      "rental.email.availability",
      "rental.email.timing",
      "rental.email.territory",
      "short_term_rental.email.received",
      "short_term_rental.email.clarify",
      "property_alerts.email.confirm",
      "general.email.appointment_invitation",
      "general.email.follow_up",
      "general.email.close",
      "general.email.opt_out_confirmation",
      "internal.delivery_failure",
      "internal.sla_breach",
      "internal.test_render",
      "out_of_area.internal.review",
      "coastal_review.internal.review",
    ]) expect(ids.has(id)).toBe(true);
  });

  it("has internally valid sequence definitions", () => {
    expect(validateSequenceDefinitions()).toEqual([]);
    expect(MESSAGE_SEQUENCES).toHaveLength(8);
    const materialized = materializeSequence("home_value_review_v1", new Date("2026-08-15T12:00:00Z"));
    expect(materialized).toHaveLength(8);
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
