import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { SlaSweepEngine, createSupabaseSlaSweepRepo } from "@/lib/engines/sla-sweep";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok)
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );

  const persist =
    new URL(req.url).searchParams.get("persist") === "true" ||
    (await req
      .json()
      .then((b: { persist?: boolean }) => !!b?.persist)
      .catch(() => false));

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
      },
      { headers: NO_STORE }
    );
  }

  const engine = new SlaSweepEngine(createSupabaseSlaSweepRepo());
  const report = await engine.sweep({ persistBreaches: persist });
  return NextResponse.json({ ok: true, ...report }, { headers: NO_STORE });
}
