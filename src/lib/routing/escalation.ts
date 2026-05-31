import { trackEventNoWait } from "@/lib/analytics/ledger";

export interface EscalationResult {
  escalated: boolean;
  reason: string;
}

export async function escalateLead(
  leadId: string,
  routingId: string,
  reason: string,
  sessionId?: string
): Promise<EscalationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const client = createAdminClient();

      await client
        .from("lead_routing")
        .update({
          status: "escalated",
          escalated_at: new Date().toISOString(),
          escalation_reason: reason,
        })
        .eq("id", routingId);

      await client
        .from("leads")
        .update({ status: "assigned" })
        .eq("id", leadId);
    } catch (err) {
      console.error("[escalation] DB update failed:", err);
    }
  }

  trackEventNoWait({
    eventName: "lead_escalated",
    leadId,
    sessionId,
    properties: { routingId, reason },
  });

  return { escalated: true, reason };
}
