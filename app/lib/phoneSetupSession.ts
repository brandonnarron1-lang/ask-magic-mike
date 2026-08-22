import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { isApprovedAskMagicMikeOrigin } from "./publicOrigin";

export const PHONE_SETUP_COOKIE = "amm_phone_setup";
export const PHONE_SETUP_TTL_MS = 20 * 60 * 1000;
export const PHONE_SETUP_MAX_TTL_MS = 30 * 60 * 1000;

type PhoneSetupClaims = {
  v: 2;
  role: "copy";
  iat: number;
  exp: number;
  nonce: string;
};

export type PhoneSetupInvite = PhoneSetupClaims & {
  kind: "invite";
};

export type PhoneSetupSession = PhoneSetupClaims & {
  kind: "session";
  inviteNonce: string;
};

type ParsedPhoneSetupClaims = Partial<PhoneSetupClaims> & {
  kind?: unknown;
  inviteNonce?: unknown;
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

function signedToken(claims: PhoneSetupInvite | PhoneSetupSession, secret: string) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

function verifiedClaims(token: string | undefined | null) {
  const secret = signingSecret();
  if (!secret || !token || token.length > 1200) return null;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  if (!signaturesMatch(signature(payload, secret), suppliedSignature)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ParsedPhoneSetupClaims;
  } catch {
    return null;
  }
}

function hasValidCommonClaims(
  claims: ParsedPhoneSetupClaims,
  now: number,
) {
  return claims.v === 2
    && claims.role === "copy"
    && typeof claims.iat === "number"
    && typeof claims.exp === "number"
    && typeof claims.nonce === "string"
    && /^[A-Za-z0-9_-]{20,64}$/.test(claims.nonce)
    && claims.iat <= now + 60_000
    && claims.exp > now
    && claims.exp - claims.iat <= PHONE_SETUP_MAX_TTL_MS;
}

export function mintPhoneSetupToken(now = Date.now(), ttlMs = PHONE_SETUP_TTL_MS) {
  const secret = signingSecret();
  if (!secret) throw new Error("phone_setup_signing_secret_missing");
  const boundedTtl = Math.min(Math.max(ttlMs, 60_000), PHONE_SETUP_MAX_TTL_MS);
  const claims: PhoneSetupInvite = {
    v: 2,
    kind: "invite",
    role: "copy",
    iat: now,
    exp: now + boundedTtl,
    nonce: randomBytes(18).toString("base64url"),
  };
  return { token: signedToken(claims, secret), claims };
}

export function mintPhoneSetupSessionToken(invite: PhoneSetupInvite, now = Date.now()) {
  const secret = signingSecret();
  if (!secret) throw new Error("phone_setup_signing_secret_missing");
  if (invite.kind !== "invite" || !hasValidCommonClaims(invite, now)) {
    throw new Error("phone_setup_invite_expired");
  }
  const claims: PhoneSetupSession = {
    v: 2,
    kind: "session",
    role: "copy",
    iat: now,
    exp: invite.exp,
    nonce: randomBytes(18).toString("base64url"),
    inviteNonce: invite.nonce,
  };
  return { token: signedToken(claims, secret), claims };
}

export function verifyPhoneSetupInviteToken(token: string | undefined | null, now = Date.now()): PhoneSetupInvite | null {
  const parsed = verifiedClaims(token);
  return parsed && parsed.kind === "invite" && hasValidCommonClaims(parsed, now)
    ? parsed as PhoneSetupInvite
    : null;
}

export function verifyPhoneSetupSessionToken(token: string | undefined | null, now = Date.now()): PhoneSetupSession | null {
  const parsed = verifiedClaims(token);
  return parsed
    && parsed.kind === "session"
    && hasValidCommonClaims(parsed, now)
    && typeof parsed.inviteNonce === "string"
    && /^[A-Za-z0-9_-]{20,64}$/.test(parsed.inviteNonce)
    ? parsed as PhoneSetupSession
    : null;
}

/** Compatibility name for the token-scoped install routes. */
export function verifyPhoneSetupToken(token: string | undefined | null, now = Date.now()) {
  return verifyPhoneSetupInviteToken(token, now);
}

export function phoneSetupSessionFromRequest(request: NextRequest) {
  return verifyPhoneSetupSessionToken(request.cookies.get(PHONE_SETUP_COOKIE)?.value);
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

/** Vercel is authoritative when present; NODE_ENV covers owned/self-hosted fallback. */
export function isProductionPhoneSetupRuntime(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
) {
  return env.VERCEL_ENV
    ? env.VERCEL_ENV === "production"
    : env.NODE_ENV === "production";
}
