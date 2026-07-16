import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("AdminOps reporting route guards", () => {
  it("keeps /admin/reporting covered by the admin middleware matcher", () => {
    const middleware = read("src/middleware.ts");
    expect(middleware).toContain('matcher: ["/admin/:path*"]');
    expect("/admin/reporting").toMatch(/^\/admin(?:\/.*)?$/);
  });

  it("does not import adminReportingView from public routes", () => {
    const publicFiles = [
      "app/page.tsx",
      "app/home-value/page.tsx",
      "app/sell/page.tsx",
      "app/ask/page.tsx",
      "app/widget/page.tsx",
      "app/embed/ask/page.tsx",
      "app/integrations/ourtownproperties/page.tsx",
      "app/api/leads/route.ts",
    ];

    for (const file of publicFiles) {
      expect(read(file), file).not.toContain("adminReportingView");
      expect(read(file), file).not.toContain("loadAdminReportingSummary");
    }
  });

  it("keeps the reporting page free of forms, server actions, and mutation fetches", () => {
    const page = read("app/admin/reporting/page.tsx");
    expect(page).toContain("loadAdminReportingSummary");
    expect(page).toContain('href="/admin/leads"');
    expect(page).toContain('dynamic = "force-dynamic"');
    expect(page).not.toContain("<form");
    expect(page).not.toContain('"use server"');
    expect(page).not.toContain("'use server'");
    expect(page).not.toMatch(/method:\s*["'`](POST|PATCH|PUT|DELETE)["'`]/);
    expect(page).not.toContain("fetch(");
  });

  it("keeps the reporting read model GET-only and bounded", () => {
    const facade = read("app/lib/adminReportingView.ts");
    const view = read("app/lib/persistence/supabase/adminReportingView.ts");
    expect(facade).toContain("persistence/supabase/adminReportingView");
    expect(view).toContain('new URL("/rest/v1/leads"');
    expect(view).toContain('url.searchParams.set("select"');
    expect(view).toContain('url.searchParams.set("created_at", "gte."');
    expect(view).toContain('url.searchParams.set("order", "created_at.desc")');
    expect(view).toContain('url.searchParams.set("limit", "1000")');
    expect(view).not.toMatch(/method:\s*["'`](POST|PATCH|PUT|DELETE)["'`]/);
    expect(view).not.toContain("body:");
  });
});
