import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("organic-search ingress release boundaries", () => {
  it("keeps the page and both APIs behind growth:manage", () => {
    expect(read("app/admin/growth/search-ingress/page.tsx"))
      .toContain('requireLeadCenterPermission("growth:manage")');
    for (const route of ["preview", "commit"]) {
      const source = read(`app/api/admin/growth/search-ingress/${route}/route.ts`);
      expect(source).toContain('requireLeadCenterApiPermission(request, "growth:manage")');
      expect(source.indexOf("organicSearchIngressSameOrigin(request)"))
        .toBeLessThan(source.indexOf("const auth = await requireLeadCenterApiPermission"));
    }
  });

  it("uses bounded shared transport, private responses, and exact body keys", () => {
    const http = read("app/lib/growth/organic-search-ingress-http.ts");
    const shared = read("app/lib/growth/ingress-http.ts");
    const commit = read("app/api/admin/growth/search-ingress/commit/route.ts");
    expect(http).toContain("readBoundedIngressJson");
    expect(shared).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(shared).toContain('"Content-Security-Policy": "default-src \'none\'; sandbox"');
    expect(commit).toContain("REQUIRED_KEYS");
    expect(commit).toContain('actor: `lead-center:${auth.principal.userId}`');
  });

  it("keeps mutation disabled by default and excludes queries/providers/publication", () => {
    expect(read(".env.example")).toContain("GROWTH_SEARCH_IMPORT_ENABLED=false");
    const parser = read("app/lib/growth/organic-search-ingress.ts");
    const migration = read("supabase/migrations/20260824220000_organic_search_ingress.sql");
    expect(parser).toContain('rawQueriesRetained: false');
    expect(parser).toContain('providerCallPerformed: false');
    expect(migration).toContain("'raw_queries_retained', false");
    expect(migration).toContain("'provider_call_performed', false");
    expect(migration).toContain("'content_published', false");
    expect(migration).not.toMatch(/fetch\(|googleapis|oauth|client_secret/i);
  });

  it("registers protected routes and Growth navigation exactly once", () => {
    const manifest = JSON.parse(read("config/active-route-manifest.json")) as {
      expectedRoutes: string[];
      required: { admin: string[]; api: string[] };
    };
    const page = "/admin/growth/search-ingress";
    const preview = "/api/admin/growth/search-ingress/preview";
    const commit = "/api/admin/growth/search-ingress/commit";
    for (const route of [page, preview, commit]) {
      expect(manifest.expectedRoutes.filter((entry) => entry === route)).toHaveLength(1);
    }
    expect(manifest.required.admin).toContain(page);
    expect(manifest.required.api).toEqual(expect.arrayContaining([preview, commit]));
    expect(read("app/admin/growth/page.tsx")).toContain('"Organic radar", "/admin/growth/search-ingress"');
  });
});
