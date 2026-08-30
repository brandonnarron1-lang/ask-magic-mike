import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("vendor ingress contract lab source boundaries", () => {
  it("keeps the page and API behind growth-manage RBAC", () => {
    const page = read("app/admin/growth/vendor-ingress/page.tsx");
    const route = read("app/api/admin/growth/vendor-ingress/test/route.ts");
    expect(page).toContain('requireLeadCenterPermission("growth:manage")');
    expect(route).toContain('requireLeadCenterApiPermission(request, "growth:manage")');
    expect(route).toContain('origin === new URL(request.url).origin');
    expect(route).toContain('fetchSite === "same-origin"');
  });

  it("accepts only a tiny profile selector and contains no provider or persistence path", () => {
    const route = read("app/api/admin/growth/vendor-ingress/test/route.ts");
    expect(route).toContain("const MAX_BODY_BYTES = 512");
    expect(route).toContain('requestKeys.length !== 1 || requestKeys[0] !== "profile"');
    expect(route).toContain("isVendorIngressTestProfile(parsed.value.profile)");
    expect(route).not.toContain("fetch(");
    expect(route).not.toContain("neon(");
    expect(route).not.toContain("sql.query");
    expect(route).not.toMatch(/\b(INSERT|UPDATE|DELETE|UPSERT|MERGE)\b/);
  });

  it("makes test, raw-payload, live-authority, and no-write states explicit", () => {
    const contracts = read("app/lib/growth/vendor-ingress-contracts.ts");
    const normalizer = read("app/lib/growth/vendor-ingress.ts");
    expect(contracts).toContain("INTERNAL QA — DO NOT CONTACT");
    expect(contracts).toContain("databaseWritePerformed: false");
    expect(contracts).toContain("providerCallPerformed: false");
    expect(contracts).toContain("rawPayloadRetained: false");
    expect(contracts).toContain("liveActivationAuthorized: false");
    expect(contracts).not.toContain("rawPayload:");
    expect(normalizer).toContain("test_state_not_explicit");
  });

  it("registers the protected page and API once in the canonical App Router", () => {
    const manifest = JSON.parse(read("config/active-route-manifest.json")) as {
      expectedRoutes: string[];
      required: { admin: string[]; api: string[] };
    };
    expect(manifest.expectedRoutes.filter((route) => route === "/admin/growth/vendor-ingress")).toHaveLength(1);
    expect(manifest.expectedRoutes.filter((route) => route === "/api/admin/growth/vendor-ingress/test")).toHaveLength(1);
    expect(manifest.required.admin).toContain("/admin/growth/vendor-ingress");
    expect(manifest.required.api).toContain("/api/admin/growth/vendor-ingress/test");
    expect(read("app/admin/growth/page.tsx")).toContain('"Vendor ingress", "/admin/growth/vendor-ingress"');
  });
});
