import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");

describe("marketing-spend ingress source boundaries", () => {
  it("keeps page and APIs behind growth-manage RBAC and exact same-origin checks", () => {
    expect(read("app/admin/growth/spend-ingress/page.tsx"))
      .toContain('requireLeadCenterPermission("growth:manage")');
    for (const route of ["preview", "commit"]) {
      const source = read(`app/api/admin/growth/spend-ingress/${route}/route.ts`);
      expect(source).toContain('requireLeadCenterApiPermission(request, "growth:manage")');
      expect(source).toContain("spendIngressSameOrigin(request)");
      expect(source).toContain("privateSpendIngressResponse");
    }
    const http = read("app/lib/growth/spend-ingress-http.ts");
    const sharedHttp = read("app/lib/growth/ingress-http.ts");
    expect(http).toContain("return ingressSameOrigin(request)");
    expect(http).toContain("privateIngressResponse");
    expect(sharedHttp).toContain('origin === new URL(request.url).origin');
    expect(sharedHttp).toContain('fetchSite === "same-origin"');
    expect(sharedHttp).toContain('"Cache-Control": "private, no-store, max-age=0"');
  });

  it("keeps validation no-write and mutation feature-gated, revalidated, and Preview-safe", () => {
    const preview = read("app/api/admin/growth/spend-ingress/preview/route.ts");
    expect(preview).not.toContain("importMarketingSpendCsv");
    expect(preview).not.toContain("neon(");
    expect(preview).not.toMatch(/\b(INSERT|UPDATE|DELETE|UPSERT|MERGE)\b/);

    const persistence = read("app/lib/persistence/neonMarketingSpendIngress.ts");
    expect(persistence).toContain("spendImportEnabled(env)");
    expect(persistence).toContain("assertDatabaseMutationAllowed(env)");
    expect(persistence).toContain("spendDatabaseReadIdentityConfirmed(env)");
    expect(persistence).toContain("productionSpendDatabaseIdentityConfirmed(env)");
    expect(persistence).toContain("parseMarketingSpendCsv(input.csv");
    expect(persistence).toContain("synthetic_spend_not_importable");
    expect(persistence).toContain("spend_preview_changed");
    expect(persistence).toContain("SPEND_INGRESS_CONFIRMATION");
  });

  it("registers one canonical page and two canonical APIs", () => {
    const manifest = JSON.parse(read("config/active-route-manifest.json")) as {
      expectedRoutes: string[];
      required: { admin: string[]; api: string[] };
    };
    const page = "/admin/growth/spend-ingress";
    const preview = "/api/admin/growth/spend-ingress/preview";
    const commit = "/api/admin/growth/spend-ingress/commit";
    expect(manifest.expectedRoutes.filter((route) => route === page)).toHaveLength(1);
    expect(manifest.expectedRoutes.filter((route) => route === preview)).toHaveLength(1);
    expect(manifest.expectedRoutes.filter((route) => route === commit)).toHaveLength(1);
    expect(manifest.required.admin).toContain(page);
    expect(manifest.required.api).toEqual(expect.arrayContaining([preview, commit]));
    expect(read("app/admin/growth/page.tsx")).toContain('"Spend ingress", "/admin/growth/spend-ingress"');
  });

  it("documents a disabled-by-default secret-free feature gate", () => {
    const env = read(".env.example");
    expect(env).toContain("GROWTH_SPEND_IMPORT_ENABLED=false");
    expect(env).not.toMatch(/GROWTH_SPEND_IMPORT_ENABLED=(true|1)/);
  });

  it("contains wide spend tables on mobile and labels the hidden file control", () => {
    const workbench = read("app/admin/growth/spend-ingress/spend-ingress-workbench.tsx");
    expect(workbench).toContain('className="grid min-w-0 gap-5');
    expect(workbench).toContain('className="mt-4 max-w-full overflow-x-auto"');
    expect(workbench.match(/min-w-0/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(workbench).toContain('aria-label="Select canonical daily-spend CSV file"');
    expect(workbench).toContain("tabIndex={-1}");
  });

  it("makes the executable PostgreSQL contract part of isolated local staging verification", () => {
    const verifier = read("scripts/staging-local-verify.mjs");
    expect(verifier).toContain("marketing_spend_ingress_pg17.sql");
    expect(verifier).toContain("marketing_spend_ingress_sql_passed");
    expect(verifier).toContain("spendIngress.status !== 0");
    expect(verifier).toContain("spend_authenticated_execute_denied");
  });
});
