import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("public UX visual completion", () => {
  it("keeps canonical public alias routes for common campaign URLs", () => {
    expect(existsSync(join(root, "app/value/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "app/we-buy-houses/page.tsx"))).toBe(true);
    expect(read("app/value/page.tsx")).toContain("../home-value/page");
    expect(read("app/we-buy-houses/page.tsx")).toContain("../sell/page");
  });

  it("defines the public visual-system utilities", () => {
    const css = read("app/globals.css");
    for (const token of [
      "--bd-gold",
      "--bd-ruby",
      "--bd-cyan-restrained",
      "--bd-focus",
      ".amm-page-surface",
      ".amm-glass-card",
      ".amm-primary-button",
      ".amm-secondary-button",
      ".amm-cyan-button",
      ".amm-form-field",
      "prefers-reduced-motion",
    ]) {
      expect(css).toContain(token);
    }
  });

  it("keeps form success, validation, and appointment handoff states visible", () => {
    const homeValue = read("app/components/black-diamond/HomeValueFunnel.tsx");
    expect(homeValue).toContain("What happens next");
    expect(homeValue).toContain("AppointmentRequestCTA");
    expect(homeValue).toContain("request a conversation");
    expect(homeValue).toContain('role="alert"');
    expect(homeValue).toContain("aria-busy");
    expect(homeValue).toContain("aria-invalid");

    const seller = read("app/components/black-diamond/SellerIntentSection.tsx");
    expect(seller).toContain("seller-form-status");
    expect(seller).toContain("AppointmentRequestCTA");
    expect(seller).toContain('aria-live="polite"');
    expect(seller).toContain("aria-busy");

    const cta = read("app/components/black-diamond/AppointmentRequestCTA.tsx");
    expect(cta).toContain("Your appointment request has been received.");
    expect(cta).toContain("No calendar event has been created yet.");
    expect(cta).not.toContain("Schedule a Conversation");
    expect(cta).not.toContain("appointment booked");
  });

  it("keeps chat loading, retry, and handoff states available", () => {
    const chat = read("app/components/black-diamond/AskMikeChatPanel.tsx");
    expect(chat).toContain("Mike is drafting a careful answer");
    expect(chat).toContain("Retry");
    expect(chat).toContain("property-specific facts");
    expect(chat).toContain('role="alert"');
    expect(chat).toContain("aria-busy");
  });

  it("keeps widget launcher and embed accessibility improvements", () => {
    const widgetApp = read("app/components/black-diamond/WidgetApp.tsx");
    expect(widgetApp).toContain('role="tablist"');
    expect(widgetApp).toContain('role="tab"');
    expect(widgetApp).toContain("aria-selected");
    expect(widgetApp).toContain("<h1");

    const launcher = read("public/widget.js");
    expect(launcher).toContain("aria-expanded");
    expect(launcher).toContain("Close Ask Magic Mike");
    expect(launcher).toContain("focus({ preventScroll: true })");
    expect(launcher).toContain("minHeight");
  });

  it("documents the audit, design system, and no-production-mutation boundary", () => {
    for (const path of [
      "docs/PUBLIC_UX_VISUAL_COMPLETION_AUDIT.md",
      "docs/PUBLIC_DESIGN_SYSTEM.md",
      "docs/PUBLIC_UX_QA_CHECKLIST.md",
    ]) {
      expect(existsSync(join(root, path)), `${path} exists`).toBe(true);
    }

    const audit = read("docs/PUBLIC_UX_VISUAL_COMPLETION_AUDIT.md");
    expect(audit).toContain("No admin actions were used");
    expect(audit).toContain("No production data was mutated");
    expect(audit).toContain("/value");
    expect(audit).toContain("/we-buy-houses");
  });

  it("does not expose public admin helpers from changed public routes", () => {
    const changedPublic = [
      "app/not-found.tsx",
      "app/value/page.tsx",
      "app/we-buy-houses/page.tsx",
      "app/components/black-diamond/HomeValueFunnel.tsx",
      "app/components/black-diamond/SellerIntentSection.tsx",
      "app/components/black-diamond/AskMikeChatPanel.tsx",
      "app/components/black-diamond/WidgetApp.tsx",
    ];

    for (const path of changedPublic) {
      const source = read(path);
      expect(source, path).not.toContain("adminLeadActions");
      expect(source, path).not.toContain("adminAgentAllocationActions");
      expect(source, path).not.toContain("adminAssignmentAudit");
      expect(source, path).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(source, path).not.toContain("ADMIN_SECRET");
    }
  });
});
