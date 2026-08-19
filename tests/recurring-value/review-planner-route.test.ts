import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Phase 9.4 recurring-value public route", () => {
  it("registers /plan in the canonical router, sitemap, navigation, and route manifest", () => {
    expect(existsSync(join(root, "app/plan/page.tsx"))).toBe(true);
    expect(read("app/plan/page.tsx")).toContain('alternates: { canonical: "/plan" }');
    expect(read("app/sitemap.ts")).toContain('["/plan", 0.75]');
    expect(read("app/components/black-diamond/BlackDiamondHeader.tsx")).toContain('href="/plan"');
    expect(read("app/components/black-diamond/BlackDiamondShell.tsx")).toContain("Review Planner");

    const manifest = JSON.parse(read("config/active-route-manifest.json"));
    expect(manifest.expectedRoutes).toContain("/plan");
    expect(manifest.required.public).toContain("/plan");
    expect(manifest.classifications["/plan"]).toBe("active-public-device-private-recurring-value");
  });

  it("uses a versioned local key and only allowlisted anonymous analytics events", () => {
    const engine = read("app/lib/reviewPlanner.ts");
    const component = read("app/components/black-diamond/RealEstateReviewPlanner.tsx");
    const constants = read("app/lib/constants.ts");
    expect(engine).toContain('REVIEW_PLAN_STORAGE_KEY = "amm:review-plan:v1"');
    for (const event of [
      "review_plan_started",
      "review_plan_saved",
      "review_plan_task_completed",
      "review_plan_handoff_clicked",
    ]) {
      expect(component).toContain(`trackEvent("${event}"`);
      expect(constants).toContain(`"${event}"`);
    }
  });

  it("does not introduce a lead submission, subscription, messaging, or provider path", () => {
    const component = read("app/components/black-diamond/RealEstateReviewPlanner.tsx");
    const engine = read("app/lib/reviewPlanner.ts");
    const combined = `${component}\n${engine}`;
    for (const forbidden of [
      "/api/leads",
      "/api/listings",
      "/api/phone-alerts",
      "DATABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SMTP_PASSWORD",
      "fetch(",
      "subscribe(",
      "sendEmail",
      "sendSms",
    ]) {
      expect(combined).not.toContain(forbidden);
    }
    expect(component).toContain("No contact data sent");
    expect(component).toContain("Non-contact planner events may record controlled selections, progress, campaign attribution, and device context");
    expect(component).toContain("No name, address, email, phone, or free text");
  });
});
