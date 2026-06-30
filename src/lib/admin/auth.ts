/**
 * Admin auth helper.
 *
 * Admin API routes are gated by an `ADMIN_SECRET` env var passed in the
 * `x-admin-secret` request header. The secret must never appear in URLs
 * (leaked to logs, history, referrer headers).
 */
import { timingSafeEqual } from "node:crypto";
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
  const supplied = req.headers.get("x-admin-secret");
  if (!supplied) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  // Timing-safe comparison prevents secret-length/character oracle attacks.
  // Pad to equal length first — timingSafeEqual requires identical byte lengths.
  const secretBuf   = Buffer.from(secret);
  const suppliedBuf = Buffer.from(supplied);
  const match =
    secretBuf.length === suppliedBuf.length &&
    timingSafeEqual(secretBuf, suppliedBuf);
  if (!match) {
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
