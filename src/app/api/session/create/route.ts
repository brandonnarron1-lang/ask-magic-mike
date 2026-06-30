import { NextRequest, NextResponse } from "next/server";
import { CreateSessionSchema } from "@/schemas/session.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { createSession } from "@/lib/db/session-repository";
import { isProduction, isSupabaseConfigured } from "@/lib/db/types";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/security/rate-limit";
import { requestContext } from "@/lib/observability/request";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ctx = requestContext("session/create", req.headers.get("x-request-id"));
  const ipRaw = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const rl = await checkRateLimit(rateLimitKey(ipRaw), LIMITS.sessionCreate.limit, LIMITS.sessionCreate.windowMs, "sessionCreate");
  if (!rl.allowed) {
    ctx.log.warn("rate_limited", { request_id: ctx.requestId });
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: { ...ctx.responseHeaders(), "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  if (isProduction() && !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Configuration error", message: "Lead storage is not configured." },
      { status: 503, headers: NO_STORE }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  try {
    const session = await createSession({
      utmSource:       data.utmSource,
      utmMedium:       data.utmMedium,
      utmCampaign:     data.utmCampaign,
      utmContent:      data.utmContent,
      utmTerm:         data.utmTerm,
      referrerUrl:     data.referrerUrl,
      referrerType:    data.referrerType,
      landingPage:     data.landingPage,
      userAgent:       userAgent ?? data.userAgent,
      ipAddress:       ip,
      deviceType:      data.deviceType,
      initialQuestion: data.initialQuestion,
      initialAddress:  data.initialAddress,
    });

    trackEventNoWait({
      eventName: "session_created",
      sessionId: session.id,
      properties: {
        referrerType: data.referrerType,
        utmSource:    data.utmSource,
        deviceType:   data.deviceType,
      },
      utmSource:   data.utmSource ?? undefined,
      utmMedium:   data.utmMedium ?? undefined,
      utmCampaign: data.utmCampaign ?? undefined,
      ipAddress:   ip ?? undefined,
      userAgent:   userAgent ?? undefined,
    });

    return NextResponse.json(
      { sessionId: session.id, expiresAt: session.expiresAt },
      { headers: ctx.finish(200, { session_id: session.id }) }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.log.error("session_create_failed", { request_id: ctx.requestId, error: msg });
    return NextResponse.json({ error: "Failed to create session" }, { status: 500, headers: ctx.responseHeaders(500) });
  }
}
