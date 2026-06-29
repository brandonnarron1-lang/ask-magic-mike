import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { validateStartup } from "@/lib/startup/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/health/dependencies
 *
 * Admin-protected dependency health report. Returns the full startup
 * validation result: env vars, DB connectivity, required tables.
 *
 * Auth: x-admin-secret header required.
 *
 * 200 = all dependencies healthy
 * 503 = one or more dependencies failed
 */
export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });
  }

  const result = await validateStartup();
  const passed = result.checks.filter((c) => c.status === "ok").length;

  return NextResponse.json(
    {
      ok: result.ok,
      status: result.ok ? "healthy" : "degraded",
      summary: {
        total: result.checks.length,
        passed,
        failed: result.fatal.length,
        warnings: result.warnings.length,
      },
      checks: result.checks,
      timestamp: new Date().toISOString(),
    },
    { status: result.ok ? 200 : 503, headers: NO_STORE }
  );
}
