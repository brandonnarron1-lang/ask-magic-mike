import { NextRequest, NextResponse } from "next/server";
import { IntakeStepSchema } from "@/schemas/lead.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";

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

  // Partial save — upsert what we have so far
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();

    await client
      .from("sessions")
      .update({ step_reached: step })
      .eq("id", sessionId);
  }

  return NextResponse.json({ ok: true, step });
}
