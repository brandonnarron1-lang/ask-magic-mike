import { NextRequest, NextResponse } from "next/server";
import { CreateSessionSchema } from "@/schemas/session.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { createSession } from "@/lib/db/session-repository";
import { isProduction, isSupabaseConfigured } from "@/lib/db/types";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
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
      { headers: NO_STORE }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[session/create] error:", msg);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500, headers: NO_STORE });
  }
}
