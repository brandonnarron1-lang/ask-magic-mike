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

import { neon } from "@neondatabase/serverless";

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
  error?: string;
}

function emptyLeadDetail(configured: boolean, error?: string): LeadDetail {
  return {
    configured,
    lead: null,
    events: [],
    messages: [],
    tasks: [],
    assignments: [],
    attribution: null,
    consents: [],
    listingMatches: [],
    complianceFlags: [],
    ...(error ? { error } : {}),
  };
}

async function loadNeonLeadDetail(
  leadId: string,
  databaseUrl: string,
): Promise<LeadDetail | null> {
  const sql = neon(databaseUrl);
  try {
    const [
      leadRows,
      events,
      messages,
      tasks,
      assignments,
      attribution,
      consents,
      listingMatches,
      complianceFlags,
    ] = await Promise.all([
      sql.query("SELECT * FROM public.leads WHERE id = $1::uuid LIMIT 1", [leadId]),
      sql.query(
        `SELECT id, event_name, event_category, occurred_at, properties
           FROM public.analytics_events
          WHERE lead_id = $1::uuid
          ORDER BY occurred_at DESC LIMIT 100`,
        [leadId],
      ),
      sql.query(
        `SELECT id, created_at, role, content, agent_id
           FROM public.messages
          WHERE lead_id = $1::uuid
          ORDER BY created_at DESC LIMIT 100`,
        [leadId],
      ),
      sql.query(
        `SELECT id, title, body, due_at, status, priority, category, agent_id, created_at
           FROM public.tasks
          WHERE lead_id = $1::uuid
          ORDER BY due_at ASC NULLS LAST, created_at DESC LIMIT 50`,
        [leadId],
      ),
      sql.query(
        `SELECT id, agent_id, status, assigned_by, assignment_reason, created_at
           FROM public.agent_assignments
          WHERE lead_id = $1::uuid
          ORDER BY created_at DESC LIMIT 20`,
        [leadId],
      ),
      sql.query(
        `SELECT * FROM public.source_attribution
          WHERE lead_id = $1::uuid
          ORDER BY created_at DESC LIMIT 1`,
        [leadId],
      ),
      sql.query(
        `SELECT id, consent_type, granted, language_version, collected_at
           FROM public.consents
          WHERE lead_id = $1::uuid
          ORDER BY collected_at DESC LIMIT 20`,
        [leadId],
      ),
      sql.query(
        `SELECT id, listing_id, match_score, match_reasons, shared_with_lead_at
           FROM public.listing_matches
          WHERE lead_id = $1::uuid
          ORDER BY match_score DESC LIMIT 20`,
        [leadId],
      ),
      sql.query(
        `SELECT id, flag_type, severity, resolved, created_at, notes
           FROM public.compliance_flags
          WHERE lead_id = $1::uuid
          ORDER BY created_at DESC LIMIT 20`,
        [leadId],
      ),
    ]) as Array<Array<Record<string, unknown>>>;

    if (!leadRows[0]) return null;
    return {
      configured: true,
      lead: leadRows[0],
      events,
      messages,
      tasks,
      assignments,
      attribution: attribution[0] ?? null,
      consents,
      listingMatches,
      complianceFlags,
    };
  } catch {
    return emptyLeadDetail(true, "lead_detail_unavailable");
  }
}

export async function loadLeadDetail(leadId: string): Promise<LeadDetail | null> {
  if (process.env.DATABASE_URL) {
    return loadNeonLeadDetail(leadId, process.env.DATABASE_URL);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return emptyLeadDetail(false);
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
