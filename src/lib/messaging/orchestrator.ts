import { createHash } from "node:crypto";
import { decideCommunicationPermission, type CommunicationPermissionInput } from "./permission-engine";
import { messagingFeatureFlags } from "./feature-flags";
import { MESSAGE_TEMPLATE_REGISTRY, type MessageTemplate } from "./template-registry";
import { isWithinSmsSendWindow, smsFrequencyAllowed, smsSegmentCount } from "./sms-policy";

export type MessagePlan = {
  ok: boolean;
  status: "preview_ready" | "blocked";
  template: MessageTemplate | null;
  permission: ReturnType<typeof decideCommunicationPermission>;
  idempotencyKey: string;
  renderedContentHash: string | null;
  scheduledAt: string | null;
  smsSegments: number | null;
  warnings: string[];
};

export function buildMessagePlan(input: {
  leadId: string;
  templateId: string;
  renderedBody: string;
  permission: CommunicationPermissionInput;
  scheduledAt?: Date;
  sentInLast24Hours?: number;
  sentInLast7Days?: number;
}) : MessagePlan {
  const template = MESSAGE_TEMPLATE_REGISTRY.find((candidate) => candidate.id === input.templateId) || null;
  const decision = decideCommunicationPermission(input.permission);
  const scheduledAt = input.scheduledAt || new Date();
  const idempotencyKey = `message:${input.leadId}:${template?.id || input.templateId}:${template?.version || "unknown"}`;
  const warnings: string[] = [];
  let allowed = Boolean(template && decision.allowed);

  if (template?.channel === "sms") {
    if (!isWithinSmsSendWindow(scheduledAt)) {
      allowed = false;
      warnings.push("quiet_hours_block");
    }
    if (!smsFrequencyAllowed({
      sentInLast24Hours: input.sentInLast24Hours || 0,
      sentInLast7Days: input.sentInLast7Days || 0,
    })) {
      allowed = false;
      warnings.push("frequency_cap_block");
    }
  }

  const flags = messagingFeatureFlags();
  if (template?.purpose !== "internal_alert" && template?.purpose !== "qa_test" && flags.autoSend === false) {
    warnings.push("consumer_auto_send_disabled");
  }

  return {
    ok: allowed,
    status: allowed ? "preview_ready" : "blocked",
    template,
    permission: decision,
    idempotencyKey,
    renderedContentHash: template
      ? createHash("sha256").update(`${template.version}\n${input.renderedBody}`).digest("hex")
      : null,
    scheduledAt: allowed ? scheduledAt.toISOString() : null,
    smsSegments: template?.channel === "sms" ? smsSegmentCount(input.renderedBody) : null,
    warnings,
  };
}

export class MockSmsProvider {
  readonly name = "sms_mock_phase6";
  private readonly sent = new Map<string, { id: string; bodyHash: string }>();

  async send(input: { idempotencyKey: string; body: string }) {
    const existing = this.sent.get(input.idempotencyKey);
    if (existing) return { ok: true as const, duplicate: true, providerMessageId: existing.id, status: "delivered" as const };
    const record = {
      id: `mock_${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 20)}`,
      bodyHash: createHash("sha256").update(input.body).digest("hex"),
    };
    this.sent.set(input.idempotencyKey, record);
    return { ok: true as const, duplicate: false, providerMessageId: record.id, status: "delivered" as const };
  }
}
