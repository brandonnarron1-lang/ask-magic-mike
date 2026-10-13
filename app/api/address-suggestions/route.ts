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
    const provider = createAddressProvider({ signal: request.signal });
    const result = input.operation === "suggest" ? await provider.suggest(input) : await provider.resolve(input);
    return respond(result, result.state === "unavailable" ? 503 : result.state === "rate_limited" ? 429 : 200,
      result.state === "rate_limited" ? { "Retry-After": "60" } : {});
  } catch { return respond({ state: "unavailable" }, 503); }
  finally { clearTimeout(rateTimer); }
}
