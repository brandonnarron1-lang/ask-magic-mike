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

export function secretsMatch(expected: string | undefined, supplied: string | null): boolean {
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function checkBearerSecret(req: NextRequest, expected: string | undefined): boolean {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return false;
  return secretsMatch(expected, authorization.slice(7).trim());
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
  if (!secretsMatch(secret, supplied)) {
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
