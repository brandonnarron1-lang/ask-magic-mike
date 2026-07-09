import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("AdminOps allocation route guards", () => {
  it("keeps /admin/allocation covered by the admin middleware matcher", () => {
    const middleware = read("src/middleware.ts");
    const rootMiddleware = read("middleware.ts");
    expect(rootMiddleware).toContain('matcher: ["/admin/:path*"]');
    expect(middleware).toContain('matcher: ["/admin/:path*"]');
    expect("/admin/allocation").toMatch(/^\/admin(?:\/.*)?$/);
  });

  it("does not import allocation helpers from public routes", () => {
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
      expect(read(file), file).not.toContain("adminAgentAllocationView");
      expect(read(file), file).not.toContain("adminAgentAllocationActions");
      expect(read(file), file).not.toContain("adminAssignmentAudit");
      expect(read(file), file).not.toContain("loadAdminAgentAllocationView");
      expect(read(file), file).not.toContain("assignLeadToAgent");
      expect(read(file), file).not.toContain("unassignLead");
      expect(read(file), file).not.toContain("writeAssignmentAuditEvent");
    }
  });

  it("keeps allocation page free of service role access and delete controls", () => {
    const page = read("app/admin/allocation/page.tsx");
    expect(page).toContain("loadAdminAgentAllocationView");
    expect(page).toContain("assignLeadToAgentAction");
    expect(page).toContain("unassignLeadAction");
    expect(page).toContain("Recent assignment activity");
    expect(page).toContain('href="/admin/leads"');
    expect(page).toContain('href="/admin/reporting"');
    expect(page).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(page).not.toMatch(/process\.env/);
    expect(page).not.toMatch(/\bdelete\b/i);
    expect(page).not.toMatch(/method:\s*["'`](POST|PATCH|PUT|DELETE)["'`]/);
    expect(page).not.toContain("/api/leads");
  });

  it("keeps allocation read model GET-only and bounded", () => {
    const view = read("app/lib/adminAgentAllocationView.ts");
    expect(view).toContain('new URL("/rest/v1/agents"');
    expect(view).toContain('new URL("/rest/v1/leads"');
    expect(view).toContain("loadRecentAssignmentAuditEvents");
    expect(view).toContain('leadUrl.searchParams.set("limit", String(cappedLimit))');
    expect(view).not.toMatch(/method:\s*["'`](POST|PATCH|PUT|DELETE)["'`]/);
    expect(view).not.toContain("body:");
  });

  it("keeps allocation actions server-only with assignment PATCH and audit writer isolated", () => {
    const routeActions = read("app/admin/allocation/actions.ts");
    const libActions = read("app/lib/adminAgentAllocationActions.ts");
    const audit = read("app/lib/adminAssignmentAudit.ts");
    expect(routeActions).toContain('"use server"');
    expect(routeActions).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(libActions).toContain('method: "PATCH"');
    expect(libActions).not.toMatch(/method:\s*["'`](POST|PUT|DELETE)["'`]/);
    expect(libActions).not.toContain("/api/leads");
    expect(audit).toContain('new URL("/rest/v1/audit_logs"');
    expect(audit).toContain('method: "POST"');
    expect(audit).not.toMatch(/method:\s*["'`](PATCH|PUT|DELETE)["'`]/);
    expect(audit).not.toContain("/api/leads");
  });
});
