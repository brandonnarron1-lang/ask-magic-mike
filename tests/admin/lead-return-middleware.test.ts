import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { middleware } from "../../src/middleware";

afterEach(() => vi.unstubAllEnvs());
function ready() {
  vi.stubEnv("LEAD_CENTER_RBAC_ENABLED", "true");
  vi.stubEnv("DATABASE_URL", "postgresql://synthetic.invalid/test");
  vi.stubEnv("BETTER_AUTH_URL", "https://example.test");
  vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-no-auth-call");
}
it("overwrites a spoofed return header with the actual protected request path", async () => {
  ready();
  const response = await middleware(new NextRequest("https://example.test/admin/leads/00000000-0000-4000-8000-000000000001?view=review", {
    headers: { cookie: "amm-lead-center.session_token=synthetic", "x-amm-lead-center-path": "//attacker.test/admin" },
  }));
  expect(response.headers.get("x-middleware-request-x-amm-lead-center-path")).toBe("/admin/leads/00000000-0000-4000-8000-000000000001?view=review");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("logged-out bookmarks retain the own-site path without trusting a supplied return header", async () => {
  ready();
  const response = await middleware(new NextRequest("https://example.test/admin/leads?filter=active", { headers: { "x-amm-lead-center-path": "//attacker.test" } }));
  const login = new URL(response.headers.get("location")!);
  expect(login.origin).toBe("https://example.test");
  expect(login.searchParams.get("returnTo")).toBe("/admin/leads?filter=active");
});
