/**
 * Admin auth helper.
 *
 * Until a full Supabase Auth flow is wired, admin mutation routes are
 * gated by an `ADMIN_SECRET` env var passed in the `x-admin-secret`
 * header (or `?admin_secret=` for dev). Production should swap this for
 * a proper auth check before any real ad spend lands on /admin.
 */
import type { NextRequest } from "next/server";

export interface AdminAuthOk {
  ok: true;
  actor: string;
}
export interface AdminAuthFail {
  ok: false;
  status: number;
  error: string;
}

export function checkAdminAuth(req: NextRequest): AdminAuthOk | AdminAuthFail {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: "admin_secret_not_configured",
    };
  }
  const supplied =
    req.headers.get("x-admin-secret") ??
    req.nextUrl.searchParams.get("admin_secret");
  if (!supplied || supplied !== secret) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true, actor: "admin" };
}

/** Cheap helper for routes that just need to bail with JSON on failure. */
export function adminAuthFailureResponse(
  fail: AdminAuthFail
): { status: number; body: { ok: false; error: string } } {
  return { status: fail.status, body: { ok: false, error: fail.error } };
}
