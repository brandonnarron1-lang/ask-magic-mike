import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import {
  SlaSweepEngine,
  createSupabaseSlaSweepRepo,
} from "@/lib/engines/sla-sweep";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * SLA sweep.
 *
 * Two authorized callers:
 *   1) Admin (manual run from cockpit) — `x-admin-secret: $ADMIN_SECRET`.
 *   2) Cron (Vercel Cron / Inngest / external runner) —
 *      `Authorization: Bearer $CRON_SECRET`.
 *
 * Both modes accept `?persist=true` (or `{ persist: true }` body) to
 * write `compliance_flags` for each detected breach. Without it, the
 * sweep is dry-run.
 */
async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth =
    !!cronSecret &&
    authHeader.toLowerCase().startsWith("bearer ") &&
    authHeader.slice(7).trim() === cronSecret;

  if (!isCronAuth) {
    const auth = checkAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status, headers: NO_STORE }
      );
    }
  }

  const urlPersist = new URL(req.url).searchParams.get("persist") === "true";
  let bodyPersist = false;
  if (req.method === "POST") {
    try {
      const b = (await req.json().catch(() => null)) as { persist?: boolean } | null;
      if (b && typeof b.persist === "boolean") bodyPersist = b.persist;
    } catch {
      // ignore
    }
  }
  const persist = urlPersist || bodyPersist;

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      {
        ok: true,
        note: "mock_mode",
        scanned: 0,
        breaches: [],
        flaggedCount: 0,
        mode: isCronAuth ? "cron" : "admin",
      },
      { headers: NO_STORE }
    );
  }

  const engine = new SlaSweepEngine(createSupabaseSlaSweepRepo());
  let report: Awaited<ReturnType<typeof engine.sweep>>;
  try {
    report = await engine.sweep({ persistBreaches: persist });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "sweep_failed",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 503, headers: NO_STORE }
    );
  }
  return NextResponse.json(
    { ok: true, mode: isCronAuth ? "cron" : "admin", ...report },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  return handle(req);
}

/** Vercel Cron defaults to GET. Mirror POST. Auth identical. */
export async function GET(req: NextRequest) {
  return handle(req);
}
