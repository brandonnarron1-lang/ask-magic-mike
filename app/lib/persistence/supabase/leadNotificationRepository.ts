import type {
  AssignmentNotificationAgent,
  AssignmentNotificationLead,
  LeadNotificationCreateInput,
  LeadNotificationRecord,
  LeadNotificationRepository,
  LeadNotificationStatus,
} from "../../leadNotificationTypes";

type SupabaseConfig = {
  supabaseUrl: string;
  serviceKey: string;
};

function configured(): SupabaseConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

function headers(config: SupabaseConfig) {
  return {
    apikey: config.serviceKey,
    Authorization: "Bearer " + config.serviceKey,
    "Content-Type": "application/json",
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function normalizeLeadNotificationRow(row: Record<string, unknown>): LeadNotificationRecord {
  return {
    id: text(row.id) || "unknown",
    lead_id: text(row.lead_id) || "unknown",
    agent_id: text(row.agent_id),
    assignment_audit_id: text(row.assignment_audit_id),
    assignment_event_at: text(row.assignment_event_at),
    notification_type: text(row.notification_type) || "agent_assignment",
    channel: text(row.channel) === "sms" ? "sms" : "email",
    recipient_type: text(row.recipient_type) === "customer" ? "customer" : "agent",
    recipient_reference: text(row.recipient_reference),
    template_version: text(row.template_version) || "unknown",
    idempotency_key: text(row.idempotency_key) || "unknown",
    status: (text(row.status) || "pending") as LeadNotificationStatus,
    attempt_count: numberValue(row.attempt_count),
    max_attempts: numberValue(row.max_attempts, 3),
    provider: text(row.provider),
    provider_message_id: text(row.provider_message_id),
    error_code: text(row.error_code),
    error_summary: text(row.error_summary),
    next_attempt_at: text(row.next_attempt_at),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    sent_at: text(row.sent_at),
    failed_at: text(row.failed_at),
    metadata: objectValue(row.metadata),
  };
}

export function normalizeAssignmentLeadRow(row: Record<string, unknown>): AssignmentNotificationLead {
  return {
    id: text(row.id) || "unknown",
    created_at: text(row.created_at),
    status: text(row.status),
    assigned_agent_id: text(row.assigned_agent_id),
    assigned_at: text(row.assigned_at),
    assignment_status: text(row.assignment_status),
    first_name: text(row.first_name),
    last_name: text(row.last_name),
    address_raw: text(row.address_raw),
    primary_intent: text(row.primary_intent),
    timeline_months: row.timeline_months === null || row.timeline_months === undefined ? null : numberValue(row.timeline_months),
    lead_type: text(row.lead_type),
    source: text(row.source),
    source_detail: text(row.source_detail),
    page_url: text(row.page_url),
    question_raw: text(row.question_raw),
  };
}

export function normalizeAssignmentAgentRow(row: Record<string, unknown>): AssignmentNotificationAgent {
  return {
    id: text(row.id) || "unknown",
    name: text(row.name),
    email: text(row.email),
    phone: text(row.notification_phone) || text(row.phone),
    role: text(row.role),
    is_active: boolValue(row.is_active),
  };
}

export class SupabaseLeadNotificationRepository implements LeadNotificationRepository {
  constructor(private readonly config = configured()) {}

  private ensureConfig() {
    if (!this.config) throw new Error("notification_store_not_configured");
    return this.config;
  }

  async create(input: LeadNotificationCreateInput): Promise<LeadNotificationRecord> {
    const config = this.ensureConfig();
    const url = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
    url.searchParams.set("on_conflict", "idempotency_key");
    url.searchParams.set("select", "*");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers(config),
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        ...input,
        status: input.status || "pending",
        max_attempts: input.max_attempts ?? 3,
        metadata: input.metadata || {},
      }),
      cache: "no-store",
    });

    if (response.ok) {
      const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
      const row = rows[0];
      if (row) return normalizeLeadNotificationRow(row);
      const existing = await this.findByIdempotencyKey(input.idempotency_key);
      if (existing) return existing;
    }
    throw new Error("notification_create_failed");
  }

  async findById(id: string): Promise<LeadNotificationRecord | null> {
    const config = this.ensureConfig();
    const url = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
    url.searchParams.set("id", "eq." + id);
    url.searchParams.set("select", "*");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { headers: headers(config), cache: "no-store" });
    if (!response.ok) return null;
    const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
    return rows[0] ? normalizeLeadNotificationRow(rows[0]) : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<LeadNotificationRecord | null> {
    const config = this.ensureConfig();
    const url = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
    url.searchParams.set("idempotency_key", "eq." + idempotencyKey);
    url.searchParams.set("select", "*");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { headers: headers(config), cache: "no-store" });
    if (!response.ok) return null;
    const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
    return rows[0] ? normalizeLeadNotificationRow(rows[0]) : null;
  }

  async update(id: string, patch: Partial<LeadNotificationRecord>): Promise<LeadNotificationRecord | null> {
    const config = this.ensureConfig();
    const url = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
    url.searchParams.set("id", "eq." + id);
    url.searchParams.set("select", "*");
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        ...headers(config),
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
    return rows[0] ? normalizeLeadNotificationRow(rows[0]) : null;
  }

  async claimForProcessing(id: string, patch: Partial<LeadNotificationRecord>): Promise<LeadNotificationRecord | null> {
    const config = this.ensureConfig();
    const url = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
    url.searchParams.set("id", "eq." + id);
    url.searchParams.set("status", "in.(pending,failed,retry_scheduled)");
    url.searchParams.set("select", "*");
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        ...headers(config),
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
    return rows[0] ? normalizeLeadNotificationRow(rows[0]) : null;
  }

  async listRecent(limit = 50): Promise<LeadNotificationRecord[]> {
    const config = this.ensureConfig();
    const capped = Math.max(1, Math.min(limit, 100));
    const url = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", String(capped));
    const response = await fetch(url, { headers: headers(config), cache: "no-store" });
    if (!response.ok) return [];
    const rows = (await response.json()) as Array<Record<string, unknown>>;
    return rows.map(normalizeLeadNotificationRow);
  }

  async listByLead(leadId: string, limit = 25): Promise<LeadNotificationRecord[]> {
    const config = this.ensureConfig();
    const capped = Math.max(1, Math.min(limit, 50));
    const url = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
    url.searchParams.set("lead_id", "eq." + leadId);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", String(capped));
    const response = await fetch(url, { headers: headers(config), cache: "no-store" });
    if (!response.ok) return [];
    const rows = (await response.json()) as Array<Record<string, unknown>>;
    return rows.map(normalizeLeadNotificationRow);
  }

  async listRetryable(limit = 25, now = new Date()): Promise<LeadNotificationRecord[]> {
    const config = this.ensureConfig();
    const capped = Math.max(1, Math.min(limit, 50));
    const url = new URL("/rest/v1/lead_notifications", config.supabaseUrl);
    url.searchParams.set("status", "in.(failed,retry_scheduled)");
    url.searchParams.set("next_attempt_at", "lte." + now.toISOString());
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "next_attempt_at.asc");
    url.searchParams.set("limit", String(capped));
    const response = await fetch(url, { headers: headers(config), cache: "no-store" });
    if (!response.ok) return [];
    const rows = (await response.json()) as Array<Record<string, unknown>>;
    return rows.map(normalizeLeadNotificationRow);
  }
}

export async function loadLeadForNotification(leadId: string): Promise<AssignmentNotificationLead | null> {
  const config = configured();
  if (!config) return null;
  const url = new URL("/rest/v1/leads", config.supabaseUrl);
  url.searchParams.set("id", "eq." + leadId);
  url.searchParams.set(
    "select",
    "id,created_at,status,assigned_agent_id,assigned_at,assignment_status,first_name,last_name,address_raw,primary_intent,timeline_months,lead_type,source,source_detail,page_url,question_raw",
  );
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: headers(config), cache: "no-store" });
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  return rows[0] ? normalizeAssignmentLeadRow(rows[0]) : null;
}

export async function loadAgentForNotification(agentId: string): Promise<AssignmentNotificationAgent | null> {
  const config = configured();
  if (!config) return null;
  const url = new URL("/rest/v1/agents", config.supabaseUrl);
  url.searchParams.set("id", "eq." + agentId);
  url.searchParams.set("select", "id,name,email,phone,notification_phone,role,is_active");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: headers(config), cache: "no-store" });
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  return rows[0] ? normalizeAssignmentAgentRow(rows[0]) : null;
}
