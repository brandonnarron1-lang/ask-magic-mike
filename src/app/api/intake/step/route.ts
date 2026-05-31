import { NextRequest, NextResponse } from "next/server";
import { IntakeStepSchema } from "@/schemas/lead.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { advanceSessionStep } from "@/lib/db/session-repository";

export async function POST(req: NextRequest) {
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

  return NextResponse.json({ ok: true, step });
}
