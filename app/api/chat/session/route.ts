import { NextResponse } from "next/server";
import {
  checkRateLimit,
  LIMITS,
  nonDurableRateLimitFallbackAllowed,
  rateLimitKey,
} from "@/lib/security/rate-limit";
import { isPreviewRuntime } from "@/lib/preview-security";
import { isApprovedPublicOrigin } from "../../../lib/publicOrigin";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  const respond = (
    body: Record<string, unknown>,
    status = 200,
    extraHeaders: Record<string, string> = {},
  ) => NextResponse.json(
    { ...body, correlation_id: correlationId },
    {
      status,
      headers: {
        ...RESPONSE_HEADERS,
        "X-AMM-Correlation-Id": correlationId,
        ...extraHeaders,
      },
    },
  );

  if (!isApprovedPublicOrigin(req.headers.get("origin"))) {
    return respond(
      { error: "This chat origin is not approved.", code: "origin_not_approved" },
      403,
    );
  }

  // This endpoint issues an opaque public funnel identifier; it does not
  // create an authenticated session or persist a database row. Preview can
  // therefore remain useful without touching the shared Neon limiter.
  if (isPreviewRuntime()) {
    return respond({ session_id: crypto.randomUUID(), mode: "preview_ephemeral" });
  }

  const limit = await checkRateLimit(
    rateLimitKey(req.headers.get("x-forwarded-for")),
    LIMITS.sessionCreate.limit,
    LIMITS.sessionCreate.windowMs,
    "sessionCreate",
  );
  if (!limit.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.min(
        Math.ceil(LIMITS.sessionCreate.windowMs / 1_000),
        Math.ceil((limit.resetAt - Date.now()) / 1_000),
      ),
    );
    return respond(
      { error: "Too many chat sessions. Please wait and try again.", code: "rate_limited" },
      429,
      { "Retry-After": String(retryAfterSeconds) },
    );
  }
  if (!limit.durable && !nonDurableRateLimitFallbackAllowed()) {
    return respond(
      {
        error: "Ask Magic Mike is temporarily unavailable.",
        code: "rate_limit_store_unavailable",
      },
      503,
    );
  }

  return respond({ session_id: crypto.randomUUID() });
}
