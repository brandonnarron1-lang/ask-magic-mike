import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_SECRET",
] as const;

/**
 * Readiness probe — returns 200 when the process can handle traffic.
 * Checks required env vars and Supabase connectivity.
 * Returns 503 with a generic reason (no sensitive detail) when not ready.
 */
export async function GET() {
  const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missingEnv.length > 0) {
    return NextResponse.json(
      { ok: false, status: "not_ready", reason: "configuration_error" },
      { status: 503 }
    );
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;
    const { error } = await client.from("sessions").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, status: "not_ready", reason: "db_unreachable" },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, status: "not_ready", reason: "db_error" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, status: "ready" });
}
