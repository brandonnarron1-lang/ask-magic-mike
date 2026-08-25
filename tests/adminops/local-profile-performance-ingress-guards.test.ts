import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("local-profile performance ingress release boundaries", () => {
  it("keeps the page and both APIs behind growth:manage", () => {
    expect(read("app/admin/growth/local-profile-ingress/page.tsx"))
      .toContain('requireLeadCenterPermission("growth:manage")');
    for (const route of ["preview", "commit"]) {
      const source = read(`app/api/admin/growth/local-profile-ingress/${route}/route.ts`);
      expect(source).toContain('requireLeadCenterApiPermission(request, "growth:manage")');
      expect(source.indexOf("localProfilePerformanceIngressSameOrigin(request)"))
        .toBeLessThan(source.indexOf("const auth = await requireLeadCenterApiPermission"));
    }
  });

  it("uses bounded shared transport, private responses, and exact body keys", () => {
    const http = read("app/lib/growth/local-profile-performance-ingress-http.ts");
    const shared = read("app/lib/growth/ingress-http.ts");
    const commit = read("app/api/admin/growth/local-profile-ingress/commit/route.ts");
    expect(http).toContain("readBoundedIngressJson");
    expect(shared).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(shared).toContain('"Content-Security-Policy": "default-src \'none\'; sandbox"');
    expect(commit).toContain("REQUIRED_KEYS");
    expect(commit).toContain('actor: `lead-center:${auth.principal.userId}`');
  });

  it("keeps mutation disabled by default and excludes provider/profile/publication actions", () => {
    expect(read(".env.example")).toContain("GROWTH_LOCAL_PROFILE_IMPORT_ENABLED=false");
    const parser = read("app/lib/growth/local-profile-performance-ingress.ts");
    const migration = read("supabase/migrations/20260825033000_local_profile_performance_ingress.sql");
    expect(parser).toContain("rawSearchTermsRetained: false");
    expect(parser).toContain("providerLocationIdRetained: false");
    expect(parser).toContain("providerCallPerformed: false");
    expect(migration).toContain("'raw_search_terms_retained', false");
    expect(migration).toContain("'provider_location_id_retained', false");
    expect(migration).toContain("'profile_mutation_performed', false");
    expect(migration).toContain("'content_published', false");
    expect(migration).not.toMatch(/fetch\(|googleapis|client_secret/i);
  });

  it("registers protected routes and Growth navigation exactly once", () => {
    const manifest = JSON.parse(read("config/active-route-manifest.json")) as {
      expectedRoutes: string[];
      required: { admin: string[]; api: string[] };
    };
    const page = "/admin/growth/local-profile-ingress";
    const preview = "/api/admin/growth/local-profile-ingress/preview";
    const commit = "/api/admin/growth/local-profile-ingress/commit";
    for (const route of [page, preview, commit]) {
      expect(manifest.expectedRoutes.filter((entry) => entry === route)).toHaveLength(1);
    }
    expect(manifest.required.admin).toContain(page);
    expect(manifest.required.api).toEqual(expect.arrayContaining([preview, commit]));
    expect(read("app/admin/growth/page.tsx")).toContain('"Local profile", "/admin/growth/local-profile-ingress"');
  });

  it("renders an unconfirmed Preview endpoint as a truthful sealed read state", () => {
    const page = read("app/admin/growth/local-profile-ingress/page.tsx");
    expect(page).toContain('state.error === "local_profile_database_identity_unconfirmed"');
    expect(page).toContain("Receipt reads are sealed in this Preview.");
    expect(page).toContain("no receipt query or write was attempted");
  });
});
