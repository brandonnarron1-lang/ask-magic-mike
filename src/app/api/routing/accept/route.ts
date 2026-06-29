import { NextRequest, NextResponse } from "next/server";
import { AcceptLeadSchema } from "@/schemas/routing.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { checkAdminAuth } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AcceptLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { routingId, agentId } = parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  const { data: routing, error } = await client
    .from("lead_routing")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", routingId)
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .select("lead_id, accepted_at")
    .single();

  if (error || !routing) {
    return NextResponse.json(
      { error: "Routing record not found or already accepted" },
      { status: 404 }
    );
  }

  trackEventNoWait({
    eventName: "agent_accepted",
    leadId: routing.lead_id,
    agentId,
    properties: { routingId },
  });

  return NextResponse.json({
    ok: true,
    acceptedAt: routing.accepted_at,
  });
}
