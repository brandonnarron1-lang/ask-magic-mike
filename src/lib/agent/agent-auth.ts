/**
 * Agent Auth — Lightweight agent-portal access layer.
 *
 * Completely separate from admin auth (ADMIN_SECRET).
 * Agent pages filter all data to the requesting agent's assigned leads only.
 *
 * Access model (Phase 9 MVP):
 *   - The broker opens /agent?agent_id=UUID to review any agent's view
 *   - In production, swap resolveAgentId() for Supabase Auth session lookup
 *   - The ADMIN_SECRET check is intentionally NOT used here — agent auth is
 *     independent so neither security boundary weakens the other
 *
 * Upgrade path: replace resolveAgentId() with a JWT/session check when
 * Supabase Auth is wired. The rest of the agent portal stays unchanged.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentAccessContext {
  agentId: string;
  /** Display name loaded from agents table (or null when not yet fetched) */
  agentName: string | null;
  /** Whether the accessing user is the broker/admin previewing an agent view */
  isBrokerPreview: boolean;
}

export interface AgentAccessDenied {
  reason: "no_agent_id" | "invalid_agent_id" | "db_not_configured" | "agent_not_found" | "agent_inactive";
  message: string;
}

export type AgentAccess =
  | ({ ok: true } & AgentAccessContext)
  | ({ ok: false } & AgentAccessDenied);

// ---------------------------------------------------------------------------
// resolve from URL search params (Server Component usage)
// ---------------------------------------------------------------------------

/**
 * Resolve the agent context from Next.js searchParams.
 *
 * Priority:
 *   1. `agent_id` search param (broker preview or direct link)
 *
 * Returns ok=false with a reason when no valid context can be established.
 * Never throws — always returns a typed result.
 */
export async function resolveAgentAccess(
  searchParams: Record<string, string | string[] | undefined>
): Promise<AgentAccess> {
  const rawId = Array.isArray(searchParams.agent_id)
    ? searchParams.agent_id[0]
    : searchParams.agent_id;

  if (!rawId || rawId.trim() === "") {
    return {
      ok: false,
      reason: "no_agent_id",
      message: "No agent_id provided. Pass ?agent_id=UUID in the URL.",
    };
  }

  // Basic UUID shape check — prevents SQL injection and nonsense queries
  if (!/^[0-9a-f-]{32,36}$/i.test(rawId.trim())) {
    return {
      ok: false,
      reason: "invalid_agent_id",
      message: "agent_id must be a valid UUID.",
    };
  }

  const agentId = rawId.trim();

  // Verify agent exists in DB when Supabase is configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // DB not configured — allow access with minimal context (dev mode)
    return {
      ok: true,
      agentId,
      agentName: null,
      isBrokerPreview: true,
    };
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    const { data, error } = await client
      .from("agents")
      .select("id, name, is_active")
      .eq("id", agentId)
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        reason: "agent_not_found",
        message: `No agent found with ID ${agentId}.`,
      };
    }

    if (!data.is_active) {
      return {
        ok: false,
        reason: "agent_inactive",
        message: `Agent ${data.name ?? agentId} is not active.`,
      };
    }

    return {
      ok: true,
      agentId,
      agentName: (data.name as string | null) ?? null,
      isBrokerPreview: true, // Phase 9 MVP: all access is broker-preview
    };
  } catch {
    return {
      ok: false,
      reason: "db_not_configured",
      message: "Database error while verifying agent.",
    };
  }
}

// ---------------------------------------------------------------------------
// Denial reasons → user-facing messages
// ---------------------------------------------------------------------------

export const AGENT_DENIAL_MESSAGES: Record<AgentAccessDenied["reason"], string> = {
  no_agent_id:       "Select an agent to view their portal.",
  invalid_agent_id:  "Invalid agent ID format.",
  db_not_configured: "Database not configured. Ensure Supabase env vars are set.",
  agent_not_found:   "Agent not found in the system.",
  agent_inactive:    "Agent is inactive. Reactivate them in the Routing Control Center.",
};

// ---------------------------------------------------------------------------
// Validate agent ownership of a lead (for detail/mutation pages)
// ---------------------------------------------------------------------------

/**
 * Confirm that a given lead is actually assigned to this agent.
 * Returns false when DB not configured (fail-closed — never exposes unassigned data).
 */
export async function agentOwnsLead(
  agentId: string,
  leadId: string
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    const { data, error } = await client
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("assigned_agent_id", agentId)
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}
