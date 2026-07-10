export type LeadNotificationChannel = "email" | "sms";
export type LeadNotificationRecipientType = "agent" | "customer";
export type LeadNotificationType = "agent_assignment";
export type LeadNotificationStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "skipped"
  | "retry_scheduled"
  | "permanently_failed";

export type LeadNotificationRecord = {
  id: string;
  lead_id: string;
  agent_id: string | null;
  assignment_audit_id: string | null;
  assignment_event_at: string | null;
  notification_type: LeadNotificationType | string;
  channel: LeadNotificationChannel;
  recipient_type: LeadNotificationRecipientType;
  recipient_reference: string | null;
  template_version: string;
  idempotency_key: string;
  status: LeadNotificationStatus;
  attempt_count: number;
  max_attempts: number;
  provider: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_summary: string | null;
  next_attempt_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  metadata: Record<string, unknown>;
};

export type LeadNotificationCreateInput = {
  lead_id: string;
  agent_id: string | null;
  assignment_audit_id?: string | null;
  assignment_event_at?: string | null;
  notification_type: LeadNotificationType;
  channel: LeadNotificationChannel;
  recipient_type: LeadNotificationRecipientType;
  recipient_reference?: string | null;
  template_version: string;
  idempotency_key: string;
  status?: LeadNotificationStatus;
  max_attempts?: number;
  provider?: string | null;
  metadata?: Record<string, unknown>;
};

export type NotificationChannel = LeadNotificationChannel;

export type NotificationRequest = {
  notificationId: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  text: string;
  html?: string;
  idempotencyKey: string;
};

export type NotificationResult =
  | {
      ok: true;
      provider: string;
      providerMessageId?: string;
    }
  | {
      ok: false;
      provider: string;
      retryable: boolean;
      errorCode: string;
      errorSummary: string;
    };

export type NotificationProvider = {
  name: string;
  send(request: NotificationRequest): Promise<NotificationResult>;
};

export type NotificationMode = "disabled" | "console" | "sandbox" | "production";

export type LeadNotificationRepository = {
  create(input: LeadNotificationCreateInput): Promise<LeadNotificationRecord>;
  findById(id: string): Promise<LeadNotificationRecord | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<LeadNotificationRecord | null>;
  update(id: string, patch: Partial<LeadNotificationRecord>): Promise<LeadNotificationRecord | null>;
  listRecent(limit?: number): Promise<LeadNotificationRecord[]>;
  listByLead(leadId: string, limit?: number): Promise<LeadNotificationRecord[]>;
  listRetryable(limit?: number, now?: Date): Promise<LeadNotificationRecord[]>;
};

export type AssignmentNotificationLead = {
  id: string;
  created_at?: string | null;
  status: string | null;
  assigned_agent_id?: string | null;
  assigned_at?: string | null;
  assignment_status?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address_raw?: string | null;
  primary_intent?: string | null;
  timeline_months?: number | null;
  lead_type?: string | null;
  source?: string | null;
  source_detail?: string | null;
  page_url?: string | null;
  question_raw?: string | null;
};

export type AssignmentNotificationAgent = {
  id: string;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

export type AssignmentNotificationContext = {
  lead: AssignmentNotificationLead;
  agent: AssignmentNotificationAgent;
  assignmentAuditId?: string | null;
  assignmentEventAt?: string | null;
  assignmentRoute: string;
  actor: string;
  action: "assigned" | "reassigned";
};
