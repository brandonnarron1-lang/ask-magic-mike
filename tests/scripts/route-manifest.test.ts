import { describe, expect, it } from "vitest";
import { evaluateRouteManifest } from "../../scripts/verify-route-manifest.mjs";

function fixture() {
  return {
    expected: {
      expectedRoutes: ["/", "/api/admin/sla/sweep"],
      required: {
        public: ["/"],
        admin: [],
        api: ["/api/admin/sla/sweep"],
      },
      acknowledgedRootSrcDuplicates: ["/"],
    },
    activeRoutes: ["/", "/api/admin/sla/sweep", "/_not-found"],
    rootInventory: [
      { path: "/", file: "app/page.tsx" },
      {
        path: "/api/admin/sla/sweep",
        file: "app/api/admin/sla/sweep/route.ts",
      },
    ],
    srcInventory: [
      { path: "/", file: "src/app/page.tsx" },
      { path: "/inactive", file: "src/app/inactive/page.tsx" },
    ],
    vercel: {
      crons: [{ path: "/api/admin/sla/sweep", schedule: "0 * * * *" }],
    },
  };
}

describe("canonical route manifest release gate", () => {
  it("accepts an exact root build and proves src-only routes were ignored", () => {
    const result = evaluateRouteManifest(fixture());
    expect(result.ok).toBe(true);
    expect(result.srcOnlyRoutes).toContain("/inactive");
    expect(result.srcOnlyInBuild).toEqual([]);
  });

  it("fails when a configured cron target is missing", () => {
    const input = fixture();
    input.activeRoutes = ["/", "/_not-found"];
    input.expected.expectedRoutes = ["/"];
    input.expected.required.api = [];
    const result = evaluateRouteManifest(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("configured_route_target_missing");
    expect(result.missingConfiguredRoutes).toEqual([
      { kind: "cron", path: "/api/admin/sla/sweep" },
    ]);
  });

  it("fails when root/src duplicate routes drift", () => {
    const input = fixture();
    input.srcInventory.push({
      path: "/api/admin/sla/sweep",
      file: "src/app/api/admin/sla/sweep/route.ts",
    });
    const result = evaluateRouteManifest(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("root_src_duplicate_manifest_drift");
  });

  it("fails if an ignored src-only route appears in the build", () => {
    const input = fixture();
    input.activeRoutes.push("/inactive");
    input.expected.expectedRoutes.push("/inactive");
    const result = evaluateRouteManifest(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("ignored_src_routes_present_in_build");
  });

  it("keeps the active SLA cron wrapper GET-only", async () => {
    const route = await import("../../app/api/admin/sla/sweep/route");
    expect(typeof route.GET).toBe("function");
    expect("POST" in route).toBe(false);
  });
});
