import { NextResponse } from "next/server";
import { releaseRuntimeHeaders } from "@/lib/release/runtime-evidence";
import { publicIntakeCapability } from "@/lib/public-intake-capability";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "ask-magic-mike",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    database_configured: Boolean(process.env.DATABASE_URL),
    database_provider: process.env.DATABASE_URL ? "neon_postgres" : "none",
    notification_mode: process.env.LEAD_NOTIFICATION_MODE || process.env.NOTIFICATION_PROVIDER_MODE || "disabled",
    email_enabled: process.env.EMAIL_ENABLED === "true" || process.env.AGENT_NOTIFICATIONS_ENABLED === "true",
    public_intake: publicIntakeCapability(),
    checked_at: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store", ...releaseRuntimeHeaders() } });
}
