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

export function safeRecipientReference(channel: string, recipient: string) {
  if (!recipient) return "missing";
  if (channel === "email") return "email_configured";
  if (channel === "sms") return "sms_configured";
  return "recipient_configured";
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
  name = "resend";

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
    if (!agentNotificationsEnabled() || notificationMode() !== "production") {
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

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": request.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: request.recipient,
        subject: request.subject || "Ask Magic Mike lead assignment",
        text: request.text,
        html: request.html,
      }),
    });

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
  if (mode === "console" || mode === "sandbox") {
    const behavior = process.env.CONSOLE_NOTIFICATION_BEHAVIOR;
    if (behavior === "retryable_failure" || behavior === "permanent_failure") {
      return new ConsoleNotificationProvider(behavior);
    }
    return new ConsoleNotificationProvider("success");
  }
  return new ResendEmailNotificationProvider();
}
