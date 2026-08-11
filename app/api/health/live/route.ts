import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "ask-magic-mike",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    database_configured: Boolean(
      process.env.DATABASE_URL ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    ),
    database_provider: process.env.DATABASE_URL ? "postgres" : process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "none",
    notification_mode: process.env.LEAD_NOTIFICATION_MODE || process.env.NOTIFICATION_PROVIDER_MODE || "disabled",
    email_enabled: process.env.EMAIL_ENABLED === "true" || process.env.AGENT_NOTIFICATIONS_ENABLED === "true",
    checked_at: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
