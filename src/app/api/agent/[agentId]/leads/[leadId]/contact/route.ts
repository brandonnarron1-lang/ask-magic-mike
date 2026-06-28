/**
 * Agent API — Mark lead as contacted.
 *
 * POST /api/agent/[agentId]/leads/[leadId]/contact
 *
 * Safety:
 *  - Verifies agent owns the lead before any write (agentOwnsLead = fail-closed)
 *  - Only updates last_contacted_at — no destructive changes, no status deletion
 *  - Completely separate from ADMIN_SECRET auth
 *  - No outbound messaging, no external API calls
 */

import { NextResponse } from "next/server";
import { agentOwnsLead } from "@/lib/agent/agent-auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ agentId: string; leadId: string }> }
) {
  const { agentId, leadId } = await params;

  // UUID shape guard
  const uuidRe = /^[0-9a-f-]{32,36}$/i;
  if (!uuidRe.test(agentId) || !uuidRe.test(leadId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
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
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("assigned_agent_id", agentId);

    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

// GET → redirect agent back to lead detail (convenience for quick-action link)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ agentId: string; leadId: string }> }
) {
  const { agentId, leadId } = await params;

  const uuidRe = /^[0-9a-f-]{32,36}$/i;
  if (!uuidRe.test(agentId) || !uuidRe.test(leadId)) {
    return NextResponse.redirect(new URL(`/agent/leads?agent_id=${agentId}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const owns = await agentOwnsLead(agentId, leadId);
  if (!owns) {
    return NextResponse.redirect(new URL(`/agent/leads?agent_id=${agentId}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = createAdminClient() as any;
      await client
        .from("leads")
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", leadId)
        .eq("assigned_agent_id", agentId);
    } catch {
      // best-effort; redirect regardless
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(
    new URL(`/agent/leads/${leadId}?agent_id=${agentId}`, appUrl)
  );
}
