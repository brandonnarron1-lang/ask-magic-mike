import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Database Revival Command route and authority guards", () => {
  it("keeps the route behind global admin auth and report permission", () => {
    const middleware = read("src/middleware.ts");
    const page = read("app/admin/revival/page.tsx");
    expect(middleware).toContain('"/admin/:path*"');
    expect(page).toContain('requireLeadCenterPermission("report:view")');
    expect(page).toContain('dynamic = "force-dynamic"');
  });

  it("is read-only and contains no send, enrollment, or mutation mechanism", () => {
    const page = read("app/admin/revival/page.tsx");
    expect(page).not.toContain("<form");
    expect(page).not.toContain('"use server"');
    expect(page).not.toContain("'use server'");
    expect(page).not.toContain("fetch(");
    expect(page).not.toMatch(/method:\s*["'`](POST|PATCH|PUT|DELETE)["'`]/);
    expect(page).toContain("It creates no cohort enrollment and sends nothing");
  });

  it("renders premium mobile-safe candidate cards without a wide table", () => {
    const page = read("app/admin/revival/page.tsx");
    expect(page).toContain("min-w-0");
    expect(page).toContain("sm:grid-cols-2");
    expect(page).toContain("xl:grid-cols-4");
    expect(page).not.toContain("min-w-[980px]");
  });

  it("keeps candidate reads minimized, bounded, and explicitly isolated from test, suppressed, duplicate, and terminal records", () => {
    const view = read("app/lib/persistence/neonDatabaseRevivalView.ts");
    expect(view).toContain("l.is_test = false");
    expect(view).toContain("l.communication_suppressed = false");
    expect(view).toContain("COALESCE(l.is_duplicate, false) = false");
    expect(view).toContain("l.duplicate_of_lead_id IS NULL");
    expect(view).toContain("l.status NOT IN ('dead', 'converted', 'spam')");
    expect(view).toContain("LIMIT 1000");
    expect(view).toContain("COALESCE(a.is_active, false) AS assigned_agent_active");
    expect(view).not.toContain("l.first_name");
    expect(view).not.toContain("l.last_name");
    expect(view).not.toContain("l.question_raw");
    expect(view).not.toContain("l.address_raw");
  });

  it("requires purpose-specific permission and exposes no automatic action class", () => {
    const engine = read("app/lib/revival/intelligence.ts");
    expect(engine).toContain('marketingEmailState === "allowed"');
    expect(engine).toContain('propertyAlertEmailState === "allowed"');
    expect(engine).toContain('actionClass: "draft_only" | "operator_review"');
    expect(engine).not.toContain('actionClass: "auto_send"');
    expect(engine).not.toContain("consentEmail");
    expect(engine).toContain('blockingReasons.push("retention_policy_unconfigured")');
    expect(engine).toContain('blockingReasons.push("inactive_owner")');
  });

  it("registers Revival in the canonical admin navigation and route manifest", () => {
    const layout = read("app/admin/layout.tsx");
    const manifest = JSON.parse(read("config/active-route-manifest.json"));
    expect(layout).toContain('["Revival", "/admin/revival"]');
    expect(manifest.expectedRoutes).toContain("/admin/revival");
    expect(manifest.required.admin).toContain("/admin/revival");
  });
});
