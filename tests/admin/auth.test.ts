import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { checkAdminAuth } from "@/lib/admin/auth";
import type { NextRequest } from "next/server";

function fakeRequest(headers: Record<string, string> = {}, searchParams: Record<string, string> = {}): NextRequest {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const sp = new URLSearchParams(searchParams);
  return {
    headers: { get: (k: string) => h.get(k.toLowerCase()) ?? null },
    nextUrl: { searchParams: { get: (k: string) => sp.get(k) } },
  } as unknown as NextRequest;
}

describe("checkAdminAuth", () => {
  const originalSecret = process.env.ADMIN_SECRET;

  beforeEach(() => {
    process.env.ADMIN_SECRET = "test_secret_v1";
  });
  afterEach(() => {
    if (originalSecret === undefined) process.env.ADMIN_SECRET = "";
    else process.env.ADMIN_SECRET = originalSecret;
  });

  it("rejects when ADMIN_SECRET is not configured", () => {
    process.env.ADMIN_SECRET = "";
    const r = checkAdminAuth(fakeRequest({ "x-admin-secret": "anything" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(503);
      expect(r.error).toBe("admin_secret_not_configured");
    }
  });

  it("rejects missing secret", () => {
    const r = checkAdminAuth(fakeRequest({}));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("rejects wrong secret", () => {
    const r = checkAdminAuth(fakeRequest({ "x-admin-secret": "wrong" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("accepts the header form", () => {
    const r = checkAdminAuth(fakeRequest({ "x-admin-secret": "test_secret_v1" }));
    expect(r.ok).toBe(true);
  });

  it("rejects the query-param form (secret must not appear in URLs)", () => {
    const r = checkAdminAuth(fakeRequest({}, { admin_secret: "test_secret_v1" }));
    expect(r.ok).toBe(false);
  });
});
