export const ADMIN_LEAD_STATUSES = [
  "new",
  "scored",
  "qualified",
  "assigned",
  "contacted",
  "appointment_requested",
  "appointment_set",
  "nurture",
  "dead",
  "converted",
  "spam",
  "escalated",
] as const;

export type AdminLeadStatus = (typeof ADMIN_LEAD_STATUSES)[number];

export const ADMIN_LEAD_STATUS_ACTIONS: Array<{
  status: AdminLeadStatus;
  label: string;
  intent: "standard" | "caution";
  requiresConfirmation?: boolean;
  confirmationLabel?: string;
}> = [
  { status: "contacted", label: "Mark contacted", intent: "standard" },
  { status: "qualified", label: "Mark qualified", intent: "standard" },
  { status: "appointment_set", label: "Appointment set", intent: "standard" },
  {
    status: "converted",
    label: "Closed won",
    intent: "caution",
    requiresConfirmation: true,
    confirmationLabel: "Confirm closed won",
  },
  {
    status: "dead",
    label: "Closed lost",
    intent: "caution",
    requiresConfirmation: true,
    confirmationLabel: "Confirm closed lost",
  },
  {
    status: "spam",
    label: "Spam / test lead",
    intent: "caution",
    requiresConfirmation: true,
    confirmationLabel: "Confirm not a real lead",
  },
  { status: "new", label: "Restore to new", intent: "standard" },
];

export type AdminLeadStatusUpdateResult =
  | { ok: true; status: AdminLeadStatus }
  | { ok: false; statusCode: number; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAdminLeadStatus(value: string): value is AdminLeadStatus {
  return (ADMIN_LEAD_STATUSES as readonly string[]).includes(value);
}

export function statusActionFor(status: string) {
  return ADMIN_LEAD_STATUS_ACTIONS.find((action) => action.status === status);
}

export async function updateAdminLeadStatus(
  leadId: string,
  status: string,
): Promise<AdminLeadStatusUpdateResult> {
  if (!UUID.test(leadId)) {
    return { ok: false, statusCode: 400, error: "invalid_lead_id" };
  }

  if (!isAdminLeadStatus(status)) {
    return { ok: false, statusCode: 400, error: "invalid_status" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, statusCode: 503, error: "lead_store_not_configured" };
  }

  const url = new URL("/rest/v1/leads", supabaseUrl);
  url.searchParams.set("id", "eq." + leadId);
  url.searchParams.set("select", "id,status");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin lead status update failed", {
      status: response.status,
      status_text: response.statusText,
      lead_id: leadId,
      requested_status: status,
    });
    return { ok: false, statusCode: 500, error: "status_update_failed" };
  }

  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!rows.length) {
    return { ok: false, statusCode: 404, error: "lead_not_found" };
  }

  return { ok: true, status };
}
