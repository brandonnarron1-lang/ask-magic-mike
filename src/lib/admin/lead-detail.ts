/**
 * Lead detail loader for /admin/leads/[id].
 *
 * Gathers everything the cockpit's detail view shows:
 *   - lead row
 *   - events (analytics_events)
 *   - messages
 *   - tasks
 *   - assignment history (agent_assignments)
 *   - source_attribution
 *   - consents
 *   - listing_matches (joined with public listings)
 *   - compliance_flags
 *
 * Every section degrades to empty in mock mode.
 */

export interface LeadDetail {
  configured: boolean;
  lead: Record<string, unknown> | null;
  events: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  assignments: Array<Record<string, unknown>>;
  attribution: Record<string, unknown> | null;
  consents: Array<Record<string, unknown>>;
  listingMatches: Array<Record<string, unknown>>;
  complianceFlags: Array<Record<string, unknown>>;
}

export async function loadLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      configured: false,
      lead: null,
      events: [],
      messages: [],
      tasks: [],
      assignments: [],
      attribution: null,
      consents: [],
      listingMatches: [],
      complianceFlags: [],
    };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const [
    leadRow,
    events,
    messages,
    tasks,
    assignments,
    attribution,
    consents,
    listingMatches,
    complianceFlags,
  ] = await Promise.all([
    client.from("leads").select("*").eq("id", leadId).maybeSingle(),
    client
      .from("analytics_events")
      .select("id, event_name, event_category, occurred_at, properties")
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false })
      .limit(100),
    client
      .from("messages")
      .select("id, created_at, role, content, agent_id")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("tasks")
      .select("id, title, body, due_at, status, priority, created_at")
      .eq("lead_id", leadId)
      .order("due_at", { ascending: true })
      .limit(50),
    client
      .from("agent_assignments")
      .select("id, agent_id, status, assigned_by, assignment_reason, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("source_attribution")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle(),
    client
      .from("consents")
      .select("id, consent_type, granted, language_version, collected_at")
      .eq("lead_id", leadId)
      .order("collected_at", { ascending: false })
      .limit(20),
    client
      .from("listing_matches")
      .select("id, listing_id, match_score, match_reasons, shared_with_lead_at")
      .eq("lead_id", leadId)
      .order("match_score", { ascending: false })
      .limit(20),
    client
      .from("compliance_flags")
      .select("id, flag_type, severity, resolved, created_at, notes")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (leadRow.error || !leadRow.data) return null;

  return {
    configured: true,
    lead: leadRow.data,
    events: events.data ?? [],
    messages: messages.data ?? [],
    tasks: tasks.data ?? [],
    assignments: assignments.data ?? [],
    attribution: attribution.data ?? null,
    consents: consents.data ?? [],
    listingMatches: listingMatches.data ?? [],
    complianceFlags: complianceFlags.data ?? [],
  };
}
