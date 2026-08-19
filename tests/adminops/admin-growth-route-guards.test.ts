import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("Growth Command Center route and authority guards", () => {
  it("keeps /admin/growth behind the global admin middleware and report permission", () => {
    const middleware = read("src/middleware.ts");
    const page = read("app/admin/growth/page.tsx");
    expect(middleware).toContain('"/admin/:path*"');
    expect("/admin/growth").toMatch(/^\/admin(?:\/.*)?$/);
    expect(page).toContain('requireLeadCenterPermission("report:view")');
    expect(page).toContain('dynamic = "force-dynamic"');
  });

  it("keeps the Growth Command Center read-only", () => {
    const page = read("app/admin/growth/page.tsx");
    expect(page).not.toContain("<form");
    expect(page).not.toContain('"use server"');
    expect(page).not.toContain("'use server'");
    expect(page).not.toContain("fetch(");
    expect(page).not.toMatch(/method:\s*["'`](POST|PATCH|PUT|DELETE)["'`]/);
  });

  it("keeps wide growth tables contained on mobile viewports", () => {
    const page = read("app/admin/growth/page.tsx");
    expect(page).toContain('className="min-w-0 rounded-2xl');
    expect(page).toContain('className="min-w-[980px]');
  });

  it("excludes test and communication-suppressed records in canonical Neon reads", () => {
    const view = read("app/lib/persistence/neonGrowthIntelligenceView.ts");
    expect(view).toContain("l.is_test = false");
    expect(view).toContain("l.communication_suppressed = false");
    expect(view).toContain("o.is_test = false");
    expect(view).toContain("o.communication_suppressed = false");
    expect(view).toContain("LIMIT 5000");
  });

  it("keeps growth tables server-only and recommendations approval-gated", () => {
    const migration = read("supabase/migrations/20260818190000_phase9_growth_intelligence.sql");
    expect(migration).toContain("ALTER TABLE public.growth_recommendations ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON public.growth_recommendations FROM PUBLIC");
    expect(migration).toContain("requires_approval");
    expect(migration).toContain("approval_status");
    expect(migration).toContain("Recommendations cannot mutate leads, assignments, consent, campaigns, or provider state");
  });

  it("normalizes vendor payloads without retaining raw consumer payloads", () => {
    const ingress = read("app/lib/growth/vendor-ingress.ts");
    const migration = read("supabase/migrations/20260818190000_phase9_growth_intelligence.sql");
    expect(ingress).toContain("payloadHash");
    expect(ingress).toContain("consent_not_explicit");
    expect(ingress).not.toContain("rawPayload:");
    expect(migration).toContain("raw consumer payloads are prohibited");
  });
});
