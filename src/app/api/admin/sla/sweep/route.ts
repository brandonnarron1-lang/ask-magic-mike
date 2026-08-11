import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, checkBearerSecret } from "@/lib/admin/auth";
import {
  SlaSweepEngine,
} from "@/lib/engines/sla-sweep";
import { createNeonSlaSweepRepo } from "@/lib/persistence/neon/sla-sweep-repository";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";

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
  const isCronAuth = checkBearerSecret(req, process.env.CRON_SECRET);

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

  if (persist) {
    const mutation = assertDatabaseMutationAllowed(process.env as Record<string, string | undefined>);
    if (!mutation.ok) {
      return NextResponse.json(
        { ok: false, error: mutation.error, message: "Preview is in read-only demonstration mode. SLA flags were not written." },
        { status: mutation.statusCode, headers: NO_STORE },
      );
    }
  }

  const repository = createNeonSlaSweepRepo();
  if (!repository) {
    return NextResponse.json(
      {
        ok: false,
        error: "sla_store_not_configured",
        scanned: 0,
        breaches: [],
        flaggedCount: 0,
        mode: isCronAuth ? "cron" : "admin",
      },
      { status: 503, headers: NO_STORE }
    );
  }

  const engine = new SlaSweepEngine(repository);
  let report: Awaited<ReturnType<typeof engine.sweep>>;
  try {
    report = await engine.sweep({ persistBreaches: persist });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "sweep_failed",
        correlation_id: crypto.randomUUID(),
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
