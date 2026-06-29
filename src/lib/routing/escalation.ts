import { trackEventNoWait } from "@/lib/analytics/ledger";

export interface EscalationResult {
  escalated: boolean;
  reason: string;
  error?: string;
}

export async function escalateLead(
  leadId: string,
  routingId: string,
  reason: string,
  sessionId?: string
): Promise<EscalationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[escalation] DB env vars not configured — escalation skipped");
    return { escalated: false, reason, error: "db_not_configured" };
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();

    const { error: routingErr } = await client
      .from("lead_routing")
      .update({
        status: "escalated",
        escalated_at: new Date().toISOString(),
        escalation_reason: reason,
      })
      .eq("id", routingId);

    if (routingErr) {
      console.error("[escalation] lead_routing update failed:", routingErr.message);
      return { escalated: false, reason, error: routingErr.message };
    }

    // "escalated" — not "assigned"; escalated means no agent has it yet
    const { error: leadErr } = await client
      .from("leads")
      .update({ status: "escalated" })
      .eq("id", leadId);

    if (leadErr) {
      console.error("[escalation] leads status update failed:", leadErr.message);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[escalation] DB update threw:", msg);
    return { escalated: false, reason, error: msg };
  }

  trackEventNoWait({
    eventName: "lead_escalated",
    leadId,
    sessionId,
    properties: { routingId, reason },
  });

  return { escalated: true, reason };
}
