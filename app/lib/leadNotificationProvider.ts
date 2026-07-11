import type {
  NotificationMode,
  NotificationProvider,
  NotificationRequest,
  NotificationResult,
} from "./leadNotificationTypes";

const DEFAULT_SANDBOX_ALLOWED_DOMAINS = ["example.test"];

export function notificationMode(): NotificationMode {
  const mode = (process.env.LEAD_NOTIFICATION_MODE || process.env.NOTIFICATION_PROVIDER_MODE || "disabled").toLowerCase();
  if (mode === "console" || mode === "sandbox" || mode === "production") return mode;
  return "disabled";
}

export function agentNotificationsEnabled() {
  return (process.env.AGENT_NOTIFICATIONS_ENABLED || "false").toLowerCase() === "true";
}

export function agentSmsNotificationsEnabled() {
  return (process.env.AGENT_SMS_NOTIFICATIONS_ENABLED || "false").toLowerCase() === "true";
}

export function customerEmailEnabled() {
  return (process.env.CUSTOMER_EMAIL_ENABLED || "false").toLowerCase() === "true";
}

export function customerSmsEnabled() {
  return (process.env.CUSTOMER_SMS_ENABLED || "false").toLowerCase() === "true";
}

export function productionNotificationDeliveryEnabled() {
  return (process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED || "false").toLowerCase() === "true";
}

export function safeRecipientReference(channel: string, recipient: string) {
  if (!recipient) return "missing";
  if (channel === "email") return "email_configured";
  if (channel === "sms") return "sms_configured";
  return "recipient_configured";
}

function configuredSandboxAllowedDomains() {
  const raw = process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS;
  const values = (raw ? raw.split(",") : DEFAULT_SANDBOX_ALLOWED_DOMAINS)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return values.length ? values : DEFAULT_SANDBOX_ALLOWED_DOMAINS;
}

function emailDomain(email: string) {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1] || !parts[1].includes(".")) return null;
  return parts[1];
}

function domainAllowed(domain: string, allowedDomains: string[]) {
  return allowedDomains.some((allowed) => domain === allowed || domain.endsWith("." + allowed));
}

export function resolveSandboxEmailRecipient() {
  const recipient = (process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL || "").trim();
  if (!recipient) {
    return {
      ok: false as const,
      errorCode: "missing_sandbox_recipient",
      errorSummary: "Sandbox email recipient is not configured.",
    };
  }

  const domain = emailDomain(recipient);
  if (!domain) {
    return {
      ok: false as const,
      errorCode: "invalid_sandbox_recipient",
      errorSummary: "Sandbox email recipient is invalid.",
    };
  }

  const allowedDomains = configuredSandboxAllowedDomains();
  if (!domainAllowed(domain, allowedDomains)) {
    return {
      ok: false as const,
      errorCode: "sandbox_recipient_not_allowlisted",
      errorSummary: "Sandbox email recipient domain is not allowlisted.",
    };
  }

  return { ok: true as const, recipient };
}

export class DisabledNotificationProvider implements NotificationProvider {
  name = "disabled";

  async send(_request: NotificationRequest): Promise<NotificationResult> {
    return {
      ok: false,
      provider: this.name,
      retryable: false,
      errorCode: "notifications_disabled",
      errorSummary: "Notification provider mode is disabled.",
    };
  }
}

export class ConsoleNotificationProvider implements NotificationProvider {
  name = "console";

  constructor(private readonly behavior: "success" | "retryable_failure" | "permanent_failure" = "success") {}

  async send(request: NotificationRequest): Promise<NotificationResult> {
    if (this.behavior === "retryable_failure") {
      return {
        ok: false,
        provider: this.name,
        retryable: true,
        errorCode: "console_retryable_failure",
        errorSummary: "Console provider simulated a retryable failure.",
      };
    }
    if (this.behavior === "permanent_failure") {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "console_permanent_failure",
        errorSummary: "Console provider simulated a permanent failure.",
      };
    }

    // Intentionally does not log recipient or message body.
    console.info("Lead notification console provider", {
      notification_id: request.notificationId,
      channel: request.channel,
      subject_present: Boolean(request.subject),
      text_length: request.text.length,
      html_length: request.html?.length ?? 0,
    });

    return {
      ok: true,
      provider: this.name,
      providerMessageId: `console_${request.notificationId}`,
    };
  }
}

export class ResendEmailNotificationProvider implements NotificationProvider {
  name: "resend" | "resend_sandbox";

  constructor(
    private readonly mode: "sandbox" | "production" = "production",
    private readonly transport: typeof fetch = fetch,
  ) {
    this.name = mode === "sandbox" ? "resend_sandbox" : "resend";
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    if (request.channel !== "email") {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "unsupported_channel",
        errorSummary: "Resend provider supports email notifications only.",
      };
    }

    if (!agentNotificationsEnabled()) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "agent_notifications_disabled",
        errorSummary: "Agent notifications are disabled by configuration.",
      };
    }

    let recipient = request.recipient;
    if (this.mode === "sandbox") {
      if (notificationMode() !== "sandbox") {
        return {
          ok: false,
          provider: this.name,
          retryable: false,
          errorCode: "sandbox_provider_disabled",
          errorSummary: "Sandbox notification provider is not enabled.",
        };
      }
      const sandboxRecipient = resolveSandboxEmailRecipient();
      if (!sandboxRecipient.ok) {
        return {
          ok: false,
          provider: this.name,
          retryable: false,
          errorCode: sandboxRecipient.errorCode,
          errorSummary: sandboxRecipient.errorSummary,
        };
      }
      recipient = sandboxRecipient.recipient;
    } else if (notificationMode() !== "production" || !productionNotificationDeliveryEnabled()) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "production_provider_disabled",
        errorSummary: "Production notification provider is not enabled.",
      };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.AGENT_NOTIFICATION_FROM_EMAIL || process.env.FROM_EMAIL;
    if (!apiKey || !from) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "missing_provider_config",
        errorSummary: "Resend provider configuration is incomplete.",
      };
    }

    let response: Response;
    try {
      response = await this.transport("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": request.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: recipient,
          subject: request.subject || "Ask Magic Mike lead assignment",
          text: request.text,
          html: request.html,
        }),
      });
    } catch {
      return {
        ok: false,
        provider: this.name,
        retryable: true,
        errorCode: "resend_network_error",
        errorSummary: "Resend email request failed before completion.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        provider: this.name,
        retryable: response.status >= 500 || response.status === 429,
        errorCode: `resend_http_${response.status}`,
        errorSummary: "Resend email request failed.",
      };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, provider: this.name, providerMessageId: data.id };
  }
}

export function selectNotificationProvider(): NotificationProvider {
  const mode = notificationMode();
  if (mode === "disabled") return new DisabledNotificationProvider();
  if (mode === "console") {
    const behavior = process.env.CONSOLE_NOTIFICATION_BEHAVIOR;
    if (behavior === "retryable_failure" || behavior === "permanent_failure") {
      return new ConsoleNotificationProvider(behavior);
    }
    return new ConsoleNotificationProvider("success");
  }
  if (mode === "sandbox") return new ResendEmailNotificationProvider("sandbox");
  return new ResendEmailNotificationProvider("production");
}
