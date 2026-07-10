import {
  agentNotificationsEnabled,
  agentSmsNotificationsEnabled,
  customerEmailEnabled,
  customerSmsEnabled,
  notificationMode,
  safeRecipientReference,
  selectNotificationProvider,
} from "./leadNotificationProvider";
import {
  loadAgentForNotification,
  loadLeadForNotification,
  SupabaseLeadNotificationRepository,
} from "./leadNotificationRepository";
import {
  renderAgentAssignmentEmail,
  renderAgentAssignmentSms,
  templateVersionFor,
} from "./leadNotificationTemplates";
import type {
  AssignmentNotificationContext,
  LeadNotificationChannel,
  LeadNotificationRecord,
  LeadNotificationRepository,
  LeadNotificationStatus,
  NotificationProvider,
} from "./leadNotificationTypes";

export type LeadNotificationServiceResult =
  | { ok: true; notification: LeadNotificationRecord; warning?: string }
  | { ok: false; error: string; statusCode: number };

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000];

function nowIso() {
  return new Date().toISOString();
}

function safeErrorSummary(value: string) {
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]").replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]").slice(0, 220);
}

export function assignmentNotificationIdempotencyKey(input: {
  leadId: string;
  agentId: string;
  assignmentEvent: string;
  channel: LeadNotificationChannel;
  templateVersion: string;
}) {
  return [
    "lead_assignment",
    input.leadId,
    input.agentId,
    input.assignmentEvent,
    input.channel,
    input.templateVersion,
  ].join(":");
}

function nextAttemptAt(attemptCount: number) {
  const index = Math.max(0, Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1));
  return new Date(Date.now() + RETRY_DELAYS_MS[index]).toISOString();
}

function canSendAgentChannel(channel: LeadNotificationChannel, recipient: string | null | undefined) {
  if (!agentNotificationsEnabled()) return { ok: false, reason: "agent_notifications_disabled" };
  if (channel === "sms" && !agentSmsNotificationsEnabled()) {
    return { ok: false, reason: "agent_sms_notifications_disabled" };
  }
  if (!recipient) return { ok: false, reason: `missing_agent_${channel}` };
  return { ok: true, reason: null };
}

function renderRequest(record: LeadNotificationRecord, context: AssignmentNotificationContext) {
  const assignedAt = context.lead.assigned_at || context.assignmentEventAt || nowIso();
  if (record.channel === "sms") {
    const rendered = renderAgentAssignmentSms({ lead: context.lead, agent: context.agent, assignedAt });
    return {
      notificationId: record.id,
      channel: record.channel,
      recipient: context.agent.phone || "",
      text: rendered.text,
      idempotencyKey: record.idempotency_key,
      qaWarningIncluded: rendered.qaWarningIncluded,
    };
  }
  const rendered = renderAgentAssignmentEmail({ lead: context.lead, agent: context.agent, assignedAt });
  return {
    notificationId: record.id,
    channel: record.channel,
    recipient: context.agent.email || "",
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    idempotencyKey: record.idempotency_key,
    qaWarningIncluded: rendered.qaWarningIncluded,
  };
}

export class LeadNotificationService {
  constructor(
    private readonly repo: LeadNotificationRepository = new SupabaseLeadNotificationRepository(),
    private readonly provider: NotificationProvider = selectNotificationProvider(),
  ) {}

  async createAssignmentNotification(
    context: AssignmentNotificationContext,
    channel: LeadNotificationChannel = "email",
  ): Promise<LeadNotificationServiceResult> {
    if (context.action === "reassigned" && context.lead.assigned_agent_id !== context.agent.id) {
      return { ok: false, statusCode: 409, error: "assignment_agent_mismatch" };
    }
    if (context.agent.is_active === false) {
      return { ok: false, statusCode: 409, error: "assigned_agent_inactive" };
    }
    const customerMessagingDisabled = !customerEmailEnabled() && !customerSmsEnabled();

    const templateVersion = templateVersionFor(channel);
    const assignmentEvent = context.assignmentAuditId || context.assignmentEventAt || context.lead.assigned_at || "assignment";
    const idempotencyKey = assignmentNotificationIdempotencyKey({
      leadId: context.lead.id,
      agentId: context.agent.id,
      assignmentEvent,
      channel,
      templateVersion,
    });
    const existing = await this.repo.findByIdempotencyKey(idempotencyKey);
    if (existing) return { ok: true, notification: existing };

    const recipient = channel === "sms" ? context.agent.phone : context.agent.email;
    const sendable = canSendAgentChannel(channel, recipient);
    const notification = await this.repo.create({
      lead_id: context.lead.id,
      agent_id: context.agent.id,
      assignment_audit_id: context.assignmentAuditId || null,
      assignment_event_at: context.assignmentEventAt || context.lead.assigned_at || null,
      notification_type: "agent_assignment",
      channel,
      recipient_type: "agent",
      recipient_reference: safeRecipientReference(channel, recipient || ""),
      template_version: templateVersion,
      idempotency_key: idempotencyKey,
      status: "pending",
      max_attempts: MAX_ATTEMPTS,
      provider: notificationMode(),
      metadata: {
        assignment_route: context.assignmentRoute,
        actor: context.actor,
        source: context.lead.source || null,
        source_detail: context.lead.source_detail || null,
        page_url: context.lead.page_url || null,
        customer_messaging_enabled: !customerMessagingDisabled,
      },
    });

    if (!sendable.ok) {
      const skipped = await this.repo.update(notification.id, {
        status: "skipped",
        provider: this.provider.name,
        error_code: sendable.reason,
        error_summary: sendable.reason === "agent_notifications_disabled"
          ? "Agent notifications are disabled by configuration."
          : sendable.reason === "agent_sms_notifications_disabled"
            ? "Agent SMS notifications are disabled by configuration."
          : "Assigned agent recipient is missing.",
        failed_at: nowIso(),
      });
      return { ok: true, notification: skipped || notification, warning: sendable.reason || undefined };
    }

    if (notificationMode() === "disabled") {
      const skipped = await this.repo.update(notification.id, {
        status: "skipped",
        provider: this.provider.name,
        error_code: "notifications_disabled",
        error_summary: "Notification provider mode is disabled.",
        failed_at: nowIso(),
      });
      return { ok: true, notification: skipped || notification, warning: "notifications_disabled" };
    }

    const processed = await this.processNotification(notification.id, context);
    return processed.ok ? processed : { ok: true, notification, warning: processed.error };
  }

  async processNotification(
    notificationId: string,
    context?: AssignmentNotificationContext,
  ): Promise<LeadNotificationServiceResult> {
    const current = await this.repo.findById(notificationId);
    if (!current) return { ok: false, statusCode: 404, error: "notification_not_found" };
    if (current.status === "sent") return { ok: true, notification: current };
    if (current.attempt_count >= current.max_attempts) {
      const permanent = await this.repo.update(current.id, {
        status: "permanently_failed",
        error_code: "max_attempts_reached",
        error_summary: "Maximum notification attempts reached.",
        failed_at: nowIso(),
      });
      return { ok: true, notification: permanent || current, warning: "max_attempts_reached" };
    }

    const nextAttempt = current.attempt_count + 1;
    const claimed = await this.repo.update(current.id, {
      status: "processing",
      attempt_count: nextAttempt,
      provider: this.provider.name,
      error_code: null,
      error_summary: null,
    });
    const working = claimed || current;
    const resolvedContext = context || (await this.loadContextFor(working));
    if (!resolvedContext) {
      const failed = await this.repo.update(current.id, {
        status: "permanently_failed",
        error_code: "notification_context_missing",
        error_summary: "Lead or assigned agent context is missing.",
        failed_at: nowIso(),
      });
      return { ok: true, notification: failed || working, warning: "notification_context_missing" };
    }
    if (resolvedContext.lead.assigned_agent_id && resolvedContext.lead.assigned_agent_id !== resolvedContext.agent.id) {
      const skipped = await this.repo.update(current.id, {
        status: "skipped",
        error_code: "assignment_changed",
        error_summary: "Lead assignment changed before notification processing.",
        failed_at: nowIso(),
      });
      return { ok: true, notification: skipped || working, warning: "assignment_changed" };
    }

    const request = renderRequest(working, resolvedContext);
    const result = await this.provider.send(request);
    if (result.ok) {
      const sent = await this.repo.update(current.id, {
        status: "sent",
        provider: result.provider,
        provider_message_id: result.providerMessageId || null,
        sent_at: nowIso(),
        failed_at: null,
        error_code: null,
        error_summary: null,
        next_attempt_at: null,
      });
      return { ok: true, notification: sent || working };
    }

    const retryable = result.retryable && nextAttempt < current.max_attempts;
    const failedStatus: LeadNotificationStatus = retryable ? "retry_scheduled" : "permanently_failed";
    const failed = await this.repo.update(current.id, {
      status: failedStatus,
      provider: result.provider,
      error_code: result.errorCode,
      error_summary: safeErrorSummary(result.errorSummary),
      failed_at: nowIso(),
      next_attempt_at: retryable ? nextAttemptAt(nextAttempt) : null,
    });
    return { ok: true, notification: failed || working, warning: result.errorCode };
  }

  async retryNotification(
    notificationId: string,
    context?: AssignmentNotificationContext,
  ): Promise<LeadNotificationServiceResult> {
    const current = await this.repo.findById(notificationId);
    if (!current) return { ok: false, statusCode: 404, error: "notification_not_found" };
    if (!["failed", "retry_scheduled"].includes(current.status)) {
      return { ok: false, statusCode: 409, error: "notification_not_retryable" };
    }
    if (current.attempt_count >= current.max_attempts) {
      return { ok: false, statusCode: 409, error: "max_attempts_reached" };
    }
    return this.processNotification(notificationId, context);
  }

  async getNotificationStatusForLead(leadId: string, limit = 25) {
    return this.repo.listByLead(leadId, limit);
  }

  async getRecentNotificationActivity(limit = 50) {
    return this.repo.listRecent(limit);
  }

  private async loadContextFor(record: LeadNotificationRecord): Promise<AssignmentNotificationContext | null> {
    if (!record.agent_id) return null;
    const [lead, agent] = await Promise.all([
      loadLeadForNotification(record.lead_id),
      loadAgentForNotification(record.agent_id),
    ]);
    if (!lead || !agent) return null;
    return {
      lead,
      agent,
      assignmentAuditId: record.assignment_audit_id,
      assignmentEventAt: record.assignment_event_at,
      assignmentRoute: String(record.metadata.assignment_route || "/admin/allocation"),
      actor: String(record.metadata.actor || "system/admin_basic_auth"),
      action: "assigned",
    };
  }
}

export async function createAssignmentNotification(
  context: AssignmentNotificationContext,
  channel: LeadNotificationChannel = "email",
) {
  return new LeadNotificationService().createAssignmentNotification(context, channel);
}

export async function processNotification(notificationId: string) {
  return new LeadNotificationService().processNotification(notificationId);
}

export async function retryNotification(notificationId: string) {
  return new LeadNotificationService().retryNotification(notificationId);
}

export async function getNotificationStatusForLead(leadId: string, limit = 25) {
  return new LeadNotificationService().getNotificationStatusForLead(leadId, limit);
}

export async function getRecentNotificationActivity(limit = 50) {
  return new LeadNotificationService().getRecentNotificationActivity(limit);
}
