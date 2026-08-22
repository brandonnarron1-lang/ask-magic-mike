import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { isApprovedAskMagicMikeOrigin } from "./publicOrigin";

export const PHONE_SETUP_COOKIE = "amm_phone_setup";
export const PHONE_SETUP_TTL_MS = 20 * 60 * 1000;
export const PHONE_SETUP_MAX_TTL_MS = 30 * 60 * 1000;

export type PhoneSetupSession = {
  v: 1;
  role: "copy";
  iat: number;
  exp: number;
  nonce: string;
};

function signingSecret() {
  const secret = (process.env.PHONE_SETUP_SIGNING_SECRET || "").trim();
  return secret.length >= 32 ? secret : null;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(expected: string, supplied: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function mintPhoneSetupToken(now = Date.now(), ttlMs = PHONE_SETUP_TTL_MS) {
  const secret = signingSecret();
  if (!secret) throw new Error("phone_setup_signing_secret_missing");
  const boundedTtl = Math.min(Math.max(ttlMs, 60_000), PHONE_SETUP_MAX_TTL_MS);
  const claims: PhoneSetupSession = {
    v: 1,
    role: "copy",
    iat: now,
    exp: now + boundedTtl,
    nonce: randomBytes(18).toString("base64url"),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return { token: `${payload}.${signature(payload, secret)}`, claims };
}

export function verifyPhoneSetupToken(token: string | undefined | null, now = Date.now()): PhoneSetupSession | null {
  const secret = signingSecret();
  if (!secret || !token || token.length > 1200) return null;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  if (!signaturesMatch(signature(payload, secret), suppliedSignature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<PhoneSetupSession>;
    if (
      parsed.v !== 1
      || parsed.role !== "copy"
      || typeof parsed.iat !== "number"
      || typeof parsed.exp !== "number"
      || typeof parsed.nonce !== "string"
      || !/^[A-Za-z0-9_-]{20,64}$/.test(parsed.nonce)
      || parsed.iat > now + 60_000
      || parsed.exp <= now
      || parsed.exp - parsed.iat > PHONE_SETUP_MAX_TTL_MS
    ) return null;
    return parsed as PhoneSetupSession;
  } catch {
    return null;
  }
}

export function phoneSetupSessionFromRequest(request: NextRequest) {
  return verifyPhoneSetupToken(request.cookies.get(PHONE_SETUP_COOKIE)?.value);
}

export function canonicalSiteOrigin() {
  const fallback = "https://www.askmagicmike.com";
  try {
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || fallback).origin;
    return isApprovedAskMagicMikeOrigin(origin) ? origin : fallback;
  } catch {
    return fallback;
  }
}

export function phoneSetupResponseOrigin(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin;
  return isApprovedAskMagicMikeOrigin(requestOrigin) ? requestOrigin : canonicalSiteOrigin();
}

export function isExactSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(
    origin
    && origin === request.nextUrl.origin
    && isApprovedAskMagicMikeOrigin(origin),
  );
}

export function hasPhoneSetupRequestHeader(request: NextRequest) {
  return request.headers.get("x-amm-phone-setup") === "1";
}
