/**
 * Agent API — Update safe status fields on an assigned lead.
 *
 * POST /api/agent/[agentId]/leads/[leadId]/status
 * Body: { status: string }
 *
 * Only a restricted set of status values is permitted for agent updates.
 * Agents cannot:
 *  - Delete leads
 *  - Change grade
 *  - Mark as converted (broker action)
 *  - Access or modify other agents' leads
 *
 * Safety:
 *  - Verifies agent owns the lead before any write
 *  - Validates status against a strict allowlist
 *  - Completely separate from ADMIN_SECRET auth
 *  - No outbound messaging, no external API calls
 */

import { NextResponse, type NextRequest } from "next/server";
import { agentOwnsLead } from "@/lib/agent/agent-auth";
import { trackEventNoWait } from "@/lib/analytics/ledger";

// Agent-permitted status transitions (broker-only values excluded)
const AGENT_PERMITTED_STATUSES = new Set([
  "contacted",
  "nurture",
  "appointment_set",
  "appointment_requested",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; leadId: string }> }
) {
  const { agentId, leadId } = await params;

  const uuidRe = /^[0-9a-f-]{32,36}$/i;
  if (!uuidRe.test(agentId) || !uuidRe.test(leadId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let status: string;
  try {
    const body = (await req.json()) as { status?: unknown };
    if (!body.status || typeof body.status !== "string") {
      return NextResponse.json({ error: "status_required" }, { status: 400 });
    }
    status = body.status.trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!AGENT_PERMITTED_STATUSES.has(status)) {
    return NextResponse.json(
      {
        error: "status_not_permitted",
        permitted: [...AGENT_PERMITTED_STATUSES],
      },
      { status: 422 }
    );
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

    const update: Record<string, unknown> = { status };
    // If marking contacted, also update last_contacted_at if not set
    if (status === "contacted") {
      update.last_contacted_at = new Date().toISOString();
    }

    const { error } = await client
      .from("leads")
      .update(update)
      .eq("id", leadId)
      .eq("assigned_agent_id", agentId);

    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    trackEventNoWait({
      eventName: "agent_status_updated",
      leadId,
      properties: { agentId, newStatus: status },
    });

    return NextResponse.json({ ok: true, status });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
