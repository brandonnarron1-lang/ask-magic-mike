import { NextResponse } from "next/server";
import { env as runtimeEnv } from "node:process";
import { checkRateLimit, LIMITS, rateLimitKey } from "@/lib/security/rate-limit";
import { isApprovedAskMagicMikeOrigin } from "../../lib/publicOrigin";
import { ADDRESS_LOOKUP_LIMITS, createAddressProvider, getAddressLookupCapability,
  parseAddressLookupRequest, readAddressLookupBody } from "../../lib/address/addressProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" };
const respond = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...HEADERS, ...headers } });

/** Categorical configuration probe only: no limiter, provider, database or writes. */
export function GET() { return respond(getAddressLookupCapability()); }

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || !isApprovedAskMagicMikeOrigin(origin)) {
    return respond({ state: "unavailable", code: "origin_not_approved" }, 403);
  }
  // Reject disabled/Preview calls before touching even the shared database-backed limiter.
  if (!getAddressLookupCapability().enabled) return respond({ state: "unavailable" }, 503);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") {
    return respond({ state: "unavailable", code: "invalid_request" }, 415);
  }
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > ADDRESS_LOOKUP_LIMITS.requestBytes)) {
    return respond({ state: "unavailable", code: "invalid_request" }, 413);
  }
  let input;
  try {
    input = parseAddressLookupRequest(await readAddressLookupBody(request.body,
      ADDRESS_LOOKUP_LIMITS.requestBytes, ADDRESS_LOOKUP_LIMITS.bodyTimeoutMs));
  } catch { return respond({ state: "unavailable", code: "invalid_request" }, 400); }
  if (!input) return respond({ state: "unavailable", code: "invalid_request" }, 400);
  if (request.signal.aborted) return respond({ state: "unavailable" }, 503);

  let rateTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    const limit = await Promise.race([
      checkRateLimit(rateLimitKey(request.headers.get("x-forwarded-for")?.slice(0, 128) ?? null),
        LIMITS.addressLookup.limit, LIMITS.addressLookup.windowMs, "addressLookup"),
      new Promise<never>((_, reject) => {
        rateTimer = setTimeout(() => reject(new Error("address_limiter_unavailable")), ADDRESS_LOOKUP_LIMITS.rateLimitTimeoutMs);
      }),
    ]);
    clearTimeout(rateTimer);
    // Unlike intake emergency mode, optional billable lookup always fails closed without durable Production limiting.
    if (runtimeEnv.VERCEL_ENV === "production" && !limit.durable) return respond({ state: "unavailable" }, 503);
    if (!limit.allowed) {
      const seconds = Math.max(1, Math.min(60, Math.ceil((limit.resetAt - Date.now()) / 1_000)));
      return respond({ state: "rate_limited" }, 429, { "Retry-After": String(seconds) });
    }
    // Shared durable, app-wide admission, not a per-IP allowance. Each suggest
    // or Details attempt consumes capacity before dispatch, including failures
    // and abandonment. This is additional to verified account-wide SKU quotas;
    // it is NOT evidence that a provider free tier cannot charge.
    const daily=Number(runtimeEnv.ADDRESS_LOOKUP_DAILY_CALL_CAP), monthly=Number(runtimeEnv.ADDRESS_LOOKUP_MONTHLY_CALL_CAP);
    if (!Number.isSafeInteger(daily) || daily<1 || daily>100 || !Number.isSafeInteger(monthly) || monthly<daily || monthly>1000)
      return respond({state:"unavailable",code:"cost_admission_unverified"},503);
    for (const [key,cap,window] of [["address-all-daily",daily,86400000],["address-all-monthly",monthly,32*86400000]] as const) {
      const admission=await checkRateLimit(key,cap,window,"addressLookup");
      if (!admission.durable || !admission.allowed) return respond({state:"rate_limited",code:"cost_capacity_held"},429,{"Retry-After":"3600"});
    }
    if (input.operation==="resolve") {
      const claim=await checkRateLimit("address-resolve:"+input.sessionToken,1,ADDRESS_LOOKUP_LIMITS.candidateTtlMs,"addressLookup");
      if (!claim.durable || !claim.allowed) return respond({state:"unavailable",code:"lookup_session_already_used"},409);
    }
    const provider = createAddressProvider({ signal: request.signal });
    const result = input.operation === "suggest" ? await provider.suggest(input) : await provider.resolve(input);
    return respond(result, result.state === "unavailable" ? 503 : result.state === "rate_limited" ? 429 : 200,
      result.state === "rate_limited" ? { "Retry-After": "60" } : {});
  } catch { return respond({ state: "unavailable" }, 503); }
  finally { clearTimeout(rateTimer); }
}
