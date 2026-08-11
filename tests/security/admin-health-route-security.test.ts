import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin health security boundary", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/api/admin/health/route.ts"), "utf8");

  it("does not accept secrets from URL search parameters", () => {
    expect(source).not.toContain('searchParams.get("admin_secret")');
    expect(source).not.toContain("req.nextUrl.searchParams");
  });

  it("uses the timing-safe shared authentication helpers", () => {
    expect(source).toContain("checkAdminAuth");
    expect(source).toContain("checkBearerSecret");
  });

  it("probes the canonical Neon database instead of Supabase", () => {
    expect(source).toContain("DATABASE_URL");
    expect(source).toContain("neon_postgres");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
