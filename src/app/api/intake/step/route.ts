import { NextRequest, NextResponse } from "next/server";
import { IntakeStepSchema } from "@/schemas/lead.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { advanceSessionStep } from "@/lib/db/session-repository";
import { isProduction, isSupabaseConfigured } from "@/lib/db/types";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/security/rate-limit";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const rl = await checkRateLimit(rateLimitKey(ip), LIMITS.intakeStep.limit, LIMITS.intakeStep.windowMs, "intakeStep");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
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

  const parsed = IntakeStepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { sessionId, step, data } = parsed.data;

  trackEventNoWait({
    eventName: "intake_step_completed",
    sessionId,
    properties: { step, dataKeys: Object.keys(data) },
  });

  await advanceSessionStep(sessionId, step);

  return NextResponse.json({ ok: true, step }, { headers: NO_STORE });
}
