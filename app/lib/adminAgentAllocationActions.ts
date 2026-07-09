export type AdminAgentAssignmentResult =
  | { ok: true; action: "assigned" | "unassigned" }
  | { ok: false; statusCode: number; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUuid(value: string) {
  return UUID.test(value);
}

function configured() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

async function patchLeadAssignment(
  leadId: string,
  body: Record<string, unknown>,
  action: "assigned" | "unassigned",
): Promise<AdminAgentAssignmentResult> {
  const config = configured();
  if (!config) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  const url = new URL("/rest/v1/leads", config.supabaseUrl);
  url.searchParams.set("id", "eq." + leadId);
  url.searchParams.set("select", "id,assigned_agent_id,assignment_status");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin agent assignment update failed", {
      status: response.status,
      status_text: response.statusText,
      lead_id: leadId,
      action,
    });
    return { ok: false, statusCode: 500, error: "assignment_update_failed" };
  }

  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!rows.length) {
    return { ok: false, statusCode: 404, error: "lead_not_found" };
  }

  return { ok: true, action };
}

export async function assignLeadToAgent(
  leadId: string,
  agentId: string,
): Promise<AdminAgentAssignmentResult> {
  if (!validUuid(leadId)) {
    return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  }
  if (!validUuid(agentId)) {
    return { ok: false, statusCode: 400, error: "invalid_agent_id" };
  }

  return patchLeadAssignment(
    leadId,
    {
      assigned_agent_id: agentId,
      assigned_at: new Date().toISOString(),
      assignment_status: "assigned",
    },
    "assigned",
  );
}

export async function unassignLead(leadId: string): Promise<AdminAgentAssignmentResult> {
  if (!validUuid(leadId)) {
    return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  }

  return patchLeadAssignment(
    leadId,
    {
      assigned_agent_id: null,
      assigned_at: null,
      assignment_status: "unassigned",
    },
    "unassigned",
  );
}
