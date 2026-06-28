/**
 * Agent API — Set next follow-up date on an assigned lead.
 *
 * POST /api/agent/[agentId]/leads/[leadId]/follow-up
 * Body: { dueAt: string (ISO 8601 date) }
 *
 * Safety:
 *  - Verifies agent owns the lead before any write
 *  - Only updates next_follow_up_at — no other field touched
 *  - Completely separate from ADMIN_SECRET auth
 *  - No outbound messaging, no external API calls
 */

import { NextResponse, type NextRequest } from "next/server";
import { agentOwnsLead } from "@/lib/agent/agent-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; leadId: string }> }
) {
  const { agentId, leadId } = await params;

  const uuidRe = /^[0-9a-f-]{32,36}$/i;
  if (!uuidRe.test(agentId) || !uuidRe.test(leadId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let dueAt: string;
  try {
    const body = (await req.json()) as { dueAt?: unknown };
    if (!body.dueAt || typeof body.dueAt !== "string") {
      return NextResponse.json({ error: "dueAt_required" }, { status: 400 });
    }
    const parsed = new Date(body.dueAt);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "dueAt_invalid" }, { status: 400 });
    }
    dueAt = parsed.toISOString();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const owns = await agentOwnsLead(agentId, leadId);
  if (!owns) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    const { error } = await client
      .from("leads")
      .update({ next_follow_up_at: dueAt })
      .eq("id", leadId)
      .eq("assigned_agent_id", agentId);

    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, dueAt });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

// GET redirects to lead detail (deep-link for broker preview)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ agentId: string; leadId: string }> }
) {
  const { agentId, leadId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(
    new URL(`/agent/leads/${leadId}?agent_id=${agentId}`, appUrl)
  );
}
