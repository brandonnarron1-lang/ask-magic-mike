import type {
  NotificationMode,
  NotificationProvider,
  NotificationRequest,
  NotificationResult,
} from "./leadNotificationTypes";

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

function validDomain(value: string) {
  if (
    !value ||
    value.length > 253 ||
    value.startsWith(".") ||
    value.endsWith(".") ||
    value.includes("..") ||
    value.includes("*") ||
    !value.includes(".")
  ) {
    return false;
  }
  return value.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function configuredSandboxAllowedDomains():
  | { ok: true; domains: string[] }
  | { ok: false; errorCode: string; errorSummary: string } {
  const raw = process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS;
  if (raw === undefined) {
    return {
      ok: false,
      errorCode: "missing_sandbox_allowlist",
      errorSummary: "Sandbox email recipient allowlist is not configured.",
    };
  }
  const values = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!values.length) {
    return {
      ok: false,
      errorCode: "empty_sandbox_allowlist",
      errorSummary: "Sandbox email recipient allowlist is empty.",
    };
  }
  if (!values.every(validDomain)) {
    return {
      ok: false,
      errorCode: "invalid_sandbox_allowlist",
      errorSummary: "Sandbox email recipient allowlist is invalid.",
    };
  }
  return { ok: true, domains: values };
}

function emailDomain(email: string) {
  const value = email.trim().toLowerCase();
  if (
    !value ||
    /[\s,;<>()[\]\\"]/.test(value) ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    return null;
  }
  const parts = value.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1] || !validDomain(parts[1])) return null;
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
  if (!allowedDomains.ok) {
    return {
      ok: false as const,
      errorCode: allowedDomains.errorCode,
      errorSummary: allowedDomains.errorSummary,
    };
  }
  if (!domainAllowed(domain, allowedDomains.domains)) {
    return {
      ok: false as const,
      errorCode: "sandbox_recipient_not_allowlisted",
      errorSummary: "Sandbox email recipient domain is not allowlisted.",
    };
  }

  return { ok: true as const, recipient };
}

function hasHeaderInjection(value: string) {
  return /[\r\n]/.test(value);
}

function safeSubject(value: string | undefined) {
  return (value || "Ask Magic Mike lead assignment").replace(/[\r\n]+/g, " ").slice(0, 180);
}

function retryableResendStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function safeProviderMessageId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{1,120}$/.test(trimmed) ? trimmed : undefined;
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
  name: "resend" | "resend_sandbox" | "disabled";
  private readonly mode: "sandbox" | "production" | "invalid";

  constructor(
    mode: "sandbox" | "production",
    private readonly transport: typeof fetch = fetch,
  ) {
    this.mode = mode === "sandbox" || mode === "production" ? mode : "invalid";
    this.name = this.mode === "sandbox" ? "resend_sandbox" : this.mode === "production" ? "resend" : "disabled";
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    if (this.mode === "invalid") {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "provider_mode_invalid",
        errorSummary: "Notification provider mode is invalid.",
      };
    }
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
    if (!apiKey || !from || hasHeaderInjection(from)) {
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
          subject: safeSubject(request.subject),
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
        retryable: retryableResendStatus(response.status),
        errorCode: `resend_http_${response.status}`,
        errorSummary: "Resend email request failed.",
      };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, provider: this.name, providerMessageId: safeProviderMessageId(data.id) };
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
