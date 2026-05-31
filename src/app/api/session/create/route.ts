import { NextRequest, NextResponse } from "next/server";
import { CreateSessionSchema } from "@/schemas/session.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";

export async function POST(req: NextRequest) {
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

  // Write to Supabase if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();

    const { data: session, error } = await client
      .from("sessions")
      .insert({
        utm_source: data.utmSource,
        utm_medium: data.utmMedium,
        utm_campaign: data.utmCampaign,
        utm_content: data.utmContent,
        utm_term: data.utmTerm,
        referrer_url: data.referrerUrl,
        referrer_type: data.referrerType,
        landing_page: data.landingPage,
        user_agent: userAgent ?? data.userAgent,
        ip_address: ip,
        device_type: data.deviceType,
        initial_question: data.initialQuestion,
        initial_address: data.initialAddress,
      })
      .select("id, expires_at")
      .single();

    if (error) {
      console.error("[session/create] DB error:", error.message);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    trackEventNoWait({
      eventName: "session_created",
      sessionId: session.id,
      properties: {
        referrerType: data.referrerType,
        utmSource: data.utmSource,
        deviceType: data.deviceType,
      },
      utmSource: data.utmSource ?? undefined,
      utmMedium: data.utmMedium ?? undefined,
      utmCampaign: data.utmCampaign ?? undefined,
      ipAddress: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    return NextResponse.json({
      sessionId: session.id,
      expiresAt: session.expires_at,
    });
  }

  // Dev mode: return stub
  const stubId = `dev-session-${Date.now()}`;
  console.log("[session/create] Dev mode — returning stub session:", stubId);
  trackEventNoWait({ eventName: "session_created", sessionId: stubId });

  return NextResponse.json({
    sessionId: stubId,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
}
