import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file: string) {
  return fs.existsSync(path.join(root, file));
}

describe("AdminOps readiness guards", () => {
  it("keeps the protected admin middleware matcher in place", () => {
    const rootMiddleware = read("middleware.ts");
    const middleware = read("src/middleware.ts");
    expect(rootMiddleware).toContain('from "./src/middleware"');
    expect(middleware).toContain('matcher: ["/admin/:path*"]');
    expect(middleware).toContain("ADMIN_SECRET");
    expect(middleware).toContain("WWW-Authenticate");
    expect(middleware).toContain("Unauthorized");
  });

  it("adds an active root admin lead inbox without public POST behavior", () => {
    const page = read("app/admin/leads/page.tsx");
    expect(page).toContain("loadAdminLeadInbox");
    expect(page).toContain("Protected, read-only review");
    expect(page).not.toContain("method=\"post\"");
    expect(page).not.toContain("fetch(");
  });

  it("does not expose admin lead view model from public routes", () => {
    const publicFiles = [
      "app/page.tsx",
      "app/home-value/page.tsx",
      "app/sell/page.tsx",
      "app/ask/page.tsx",
      "app/widget/page.tsx",
      "app/embed/ask/page.tsx",
      "app/integrations/ourtownproperties/page.tsx",
    ];

    for (const file of publicFiles) {
      expect(read(file), file).not.toContain("adminLeadView");
      expect(read(file), file).not.toContain("loadAdminLeadInbox");
    }
  });

  it("keeps package-manager lockfiles pnpm-only", () => {
    expect(exists("pnpm-lock.yaml")).toBe(true);
    expect(exists("package-lock.json")).toBe(false);
    expect(exists("yarn.lock")).toBe(false);
    expect(exists("bun.lockb")).toBe(false);
  });

  it("does not introduce stale Vercel URLs in AdminOps docs or active admin files", () => {
    const files = [
      "docs/ADMINOPS_ROUTING_READINESS.md",
      "app/admin/leads/page.tsx",
      "app/lib/adminLeadView.ts",
    ];

    for (const file of files) {
      expect(read(file), file).not.toMatch(/https?:\/\/[a-z0-9-]+\.vercel\.app/i);
    }
  });

  it("does not expose secret values in active admin UI code", () => {
    const page = read("app/admin/leads/page.tsx");
    expect(page).not.toMatch(/process\.env/);
    expect(page).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(page).not.toMatch(/ADMIN_SECRET/);
  });

  it("does not introduce fake value, appraisal, or automation claims", () => {
    const changedText = [
      read("docs/ADMINOPS_ROUTING_READINESS.md"),
      read("app/admin/leads/page.tsx"),
      read("app/lib/adminLeadView.ts"),
    ].join("\n");

    expect(changedText).not.toMatch(/guaranteed (home )?value/i);
    expect(changedText).not.toMatch(/guaranteed (sale )?price/i);
    expect(changedText).not.toMatch(/certified appraisal/i);
    expect(changedText).not.toMatch(/automatically assigns/i);
  });
});
