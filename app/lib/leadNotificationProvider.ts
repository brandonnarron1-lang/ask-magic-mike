import { createHash } from "node:crypto";
import nodemailer, { type SendMailOptions } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type {
  NotificationMode,
  NotificationProvider,
  NotificationRequest,
  NotificationResult,
} from "./leadNotificationTypes";
import webpush from "web-push";
import { NeonPushSubscriptionRepository } from "./persistence/neonPushSubscriptionRepository";
import {
  configuredEmailProvider,
  resolveSmtpConfiguration,
} from "./emailProviderConfiguration";

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

export function agentPushNotificationsEnabled() {
  return (process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED || "false").toLowerCase() === "true";
}

export function customerEmailEnabled() {
  return (process.env.CUSTOMER_EMAIL_ENABLED || "false").toLowerCase() === "true";
}

export function customerSmsEnabled() {
  return (process.env.CUSTOMER_SMS_ENABLED || "false").toLowerCase() === "true";
}

export function emailNotificationsEnabled() {
  return (process.env.EMAIL_ENABLED || "false").toLowerCase() === "true" || agentNotificationsEnabled();
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

function safeProviderErrorSummary(value: unknown) {
  if (typeof value !== "string") return "Resend email request failed.";
  const sanitized = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 240);
  return sanitized || "Resend email request failed.";
}

export function normalizeUsSmsRecipient(value: string | undefined | null) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function retryableTwilioStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function configuredSiteOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.askmagicmike.com").origin;
  } catch {
    return "https://www.askmagicmike.com";
  }
}

function safeMediaUrls(values: string[] | undefined) {
  const origin = configuredSiteOrigin();
  return (values || []).filter((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.origin === origin;
    } catch {
      return false;
    }
  }).slice(0, 1);
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

function resolveSandboxBccRecipients(values: string[]) {
  const allowedDomains = configuredSandboxAllowedDomains();
  if (!allowedDomains.ok) return allowedDomains;
  for (const value of values) {
    const domain = emailDomain(value);
    if (!domain || hasHeaderInjection(value)) {
      return {
        ok: false as const,
        errorCode: "invalid_sandbox_bcc",
        errorSummary: "Sandbox audit-copy recipient is invalid.",
      };
    }
    if (!domainAllowed(domain, allowedDomains.domains)) {
      return {
        ok: false as const,
        errorCode: "sandbox_bcc_not_allowlisted",
        errorSummary: "Sandbox audit-copy recipient domain is not allowlisted.",
      };
    }
  }
  return { ok: true as const, recipients: values };
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

function safeSmtpMessageId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[A-Za-z0-9._@<>+-]{1,240}$/.test(trimmed) ? trimmed : undefined;
}

function deterministicSmtpMessageId(idempotencyKey: string, sender: string) {
  const digest = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 40);
  const domain = sender.split("@")[1] || "askmagicmike.com";
  return `<amm-${digest}@${domain}>`;
}

function smtpFailure(error: unknown): NotificationResult {
  const detail = typeof error === "object" && error
    ? error as { code?: unknown; responseCode?: unknown }
    : {};
  const code = typeof detail.code === "string" ? detail.code.toUpperCase() : "";
  const responseCode = Number(detail.responseCode);
  const retryableCodes = new Set(["ETIMEDOUT", "ECONNECTION", "EDNS", "ESOCKET", "ETLS"]);
  const retryable =
    (Number.isFinite(responseCode) && responseCode >= 400 && responseCode < 500) ||
    retryableCodes.has(code);
  const errorCode = Number.isFinite(responseCode) && responseCode > 0
    ? `smtp_response_${responseCode}`
    : code === "EAUTH"
      ? "smtp_auth_failed"
      : retryable
        ? "smtp_transport_retryable"
        : "smtp_transport_failed";
  return {
    ok: false,
    provider: "smtp",
    retryable,
    errorCode,
    errorSummary: retryable
      ? "Authenticated SMTP delivery failed before a final result and may be retried."
      : "Authenticated SMTP delivery was rejected or could not be completed.",
  };
}

type SmtpTransport = {
  sendMail(options: SendMailOptions): Promise<SMTPTransport.SentMessageInfo>;
  close(): void;
};

export type SmtpTransportFactory = (options: SMTPTransport.Options) => SmtpTransport;

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

    if (!emailNotificationsEnabled()) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "email_notifications_disabled",
        errorSummary: "Email notifications are disabled by configuration.",
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
    const from = process.env.AGENT_NOTIFICATION_FROM_EMAIL || process.env.RESEND_FROM || process.env.FROM_EMAIL;
    const requestedBcc = request.bcc || [];
    if (requestedBcc.some((recipient) => !emailDomain(recipient) || hasHeaderInjection(recipient))) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "email_bcc_invalid",
        errorSummary: "Email audit-copy recipient is invalid.",
      };
    }
    if (this.mode === "sandbox") {
      const sandboxBcc = resolveSandboxBccRecipients(requestedBcc);
      if (!sandboxBcc.ok) {
        return {
          ok: false,
          provider: this.name,
          retryable: false,
          errorCode: sandboxBcc.errorCode,
          errorSummary: sandboxBcc.errorSummary,
        };
      }
    }
    const bcc = requestedBcc;
    if (!apiKey || !from || hasHeaderInjection(from) || (request.replyTo && (!emailDomain(request.replyTo) || hasHeaderInjection(request.replyTo)))) {
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
          ...(bcc.length ? { bcc } : {}),
          ...(request.replyTo ? { reply_to: request.replyTo } : {}),
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
      const providerError = (await response.json().catch(() => ({}))) as {
        message?: unknown;
      };
      return {
        ok: false,
        provider: this.name,
        retryable: retryableResendStatus(response.status),
        errorCode: `resend_http_${response.status}`,
        errorSummary: safeProviderErrorSummary(providerError.message),
      };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, provider: this.name, providerMessageId: safeProviderMessageId(data.id) };
  }
}

export class SmtpEmailNotificationProvider implements NotificationProvider {
  name: "smtp" | "smtp_sandbox" | "disabled";
  private readonly mode: "sandbox" | "production" | "invalid";

  constructor(
    mode: "sandbox" | "production",
    private readonly transportFactory: SmtpTransportFactory = (options) =>
      nodemailer.createTransport(options),
  ) {
    this.mode = mode === "sandbox" || mode === "production" ? mode : "invalid";
    this.name = this.mode === "sandbox" ? "smtp_sandbox" : this.mode === "production" ? "smtp" : "disabled";
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
        errorSummary: "SMTP provider supports email notifications only.",
      };
    }
    if (!emailNotificationsEnabled()) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "email_notifications_disabled",
        errorSummary: "Email notifications are disabled by configuration.",
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

    const configuration = resolveSmtpConfiguration();
    if (!configuration.ok) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: configuration.errorCode,
        errorSummary: configuration.errorSummary,
      };
    }
    if (!emailDomain(recipient) || hasHeaderInjection(recipient)) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "smtp_recipient_invalid",
        errorSummary: "SMTP recipient is missing or invalid.",
      };
    }
    const requestedBcc = request.bcc || [];
    if (requestedBcc.some((value) => !emailDomain(value) || hasHeaderInjection(value))) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "smtp_bcc_invalid",
        errorSummary: "SMTP audit-copy recipient is invalid.",
      };
    }
    if (this.mode === "sandbox") {
      const sandboxBcc = resolveSandboxBccRecipients(requestedBcc);
      if (!sandboxBcc.ok) {
        return {
          ok: false,
          provider: this.name,
          retryable: false,
          errorCode: sandboxBcc.errorCode,
          errorSummary: sandboxBcc.errorSummary,
        };
      }
    }
    const replyTo = request.replyTo || configuration.configuration.replyTo;
    if (replyTo && (!emailDomain(replyTo) || hasHeaderInjection(replyTo))) {
      return {
        ok: false,
        provider: this.name,
        retryable: false,
        errorCode: "smtp_reply_to_invalid",
        errorSummary: "SMTP reply address is invalid.",
      };
    }

    const smtp = configuration.configuration;
    let transport: SmtpTransport;
    try {
      transport = this.transportFactory({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        requireTLS: true,
        auth: { user: smtp.user, pass: smtp.password },
        connectionTimeout: smtp.connectionTimeoutMs,
        greetingTimeout: smtp.greetingTimeoutMs,
        socketTimeout: smtp.socketTimeoutMs,
        disableFileAccess: true,
        disableUrlAccess: true,
        tls: { rejectUnauthorized: true, servername: smtp.host },
      });
    } catch (error) {
      return smtpFailure(error);
    }

    try {
      const result = await transport.sendMail({
        from: { name: smtp.fromName, address: smtp.fromEmail },
        to: recipient,
        ...(requestedBcc.length ? { bcc: requestedBcc } : {}),
        ...(replyTo ? { replyTo } : {}),
        subject: safeSubject(request.subject),
        text: request.text,
        html: request.html,
        messageId: deterministicSmtpMessageId(request.idempotencyKey, smtp.fromEmail),
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      const rejected = Array.isArray(result.rejected) ? result.rejected : [];
      const accepted = Array.isArray(result.accepted) ? result.accepted : [];
      if (rejected.length > 0) {
        return {
          ok: false,
          provider: this.name,
          retryable: false,
          errorCode: accepted.length > 0 ? "smtp_partial_recipient_rejection" : "smtp_recipient_rejected",
          errorSummary: accepted.length > 0
            ? "SMTP accepted part of the delivery but rejected another protected recipient; review is required before retrying."
            : "SMTP rejected the protected recipient list.",
        };
      }
      if (accepted.length < 1 + requestedBcc.length) {
        return {
          ok: false,
          provider: this.name,
          retryable: false,
          errorCode: "smtp_acceptance_unconfirmed",
          errorSummary: "SMTP did not confirm every protected recipient; review is required before retrying.",
        };
      }
      return {
        ok: true,
        provider: this.name,
        providerMessageId: safeSmtpMessageId(result.messageId),
      };
    } catch (error) {
      return smtpFailure(error);
    } finally {
      try {
        transport.close();
      } catch {
        // Delivery outcome is already known. Do not turn a local cleanup error
        // into an ambiguous retry that could duplicate the accepted message.
      }
    }
  }
}

export class TwilioSmsNotificationProvider implements NotificationProvider {
  name = "twilio";

  constructor(private readonly transport: typeof fetch = fetch) {}

  async send(request: NotificationRequest): Promise<NotificationResult> {
    if (request.channel !== "sms") {
      return { ok: false, provider: this.name, retryable: false, errorCode: "unsupported_channel", errorSummary: "Twilio provider supports SMS notifications only." };
    }
    if (
      notificationMode() !== "production" ||
      !productionNotificationDeliveryEnabled() ||
      !agentSmsNotificationsEnabled() ||
      (process.env.ENABLE_SMS || "false").toLowerCase() !== "true" ||
      (process.env.SMS_PROVIDER || "").toLowerCase() !== "twilio"
    ) {
      return { ok: false, provider: this.name, retryable: false, errorCode: "sms_notifications_disabled", errorSummary: "Production SMS notifications are disabled by configuration." };
    }

    const accountSid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";
    const from = normalizeUsSmsRecipient(process.env.TWILIO_FROM_PHONE || process.env.TWILIO_PHONE_NUMBER);
    const to = normalizeUsSmsRecipient(request.recipient);
    if (!/^AC[a-f0-9]{32}$/i.test(accountSid) || !authToken || !from || !to) {
      return { ok: false, provider: this.name, retryable: false, errorCode: "missing_provider_config", errorSummary: "Twilio provider configuration is incomplete." };
    }

    const body = new URLSearchParams({ From: from, To: to, Body: request.text.slice(0, 1200) });
    const callback = `${configuredSiteOrigin()}/api/webhooks/sms/status`;
    body.set("StatusCallback", callback);
    for (const mediaUrl of safeMediaUrls(request.mediaUrls)) body.append("MediaUrl", mediaUrl);

    let response: Response;
    try {
      response = await this.transport(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return { ok: false, provider: this.name, retryable: true, errorCode: "twilio_network_error", errorSummary: "Twilio SMS request failed before completion." };
    }

    if (!response.ok) {
      const providerError = await response.json().catch(() => ({})) as { message?: unknown };
      return {
        ok: false,
        provider: this.name,
        retryable: retryableTwilioStatus(response.status),
        errorCode: `twilio_http_${response.status}`,
        errorSummary: safeProviderErrorSummary(providerError.message).replace("Resend email", "Twilio SMS"),
      };
    }
    const data = await response.json().catch(() => ({})) as { sid?: unknown };
    return { ok: true, provider: this.name, providerMessageId: safeProviderMessageId(data.sid) };
  }
}

export class WebPushNotificationProvider implements NotificationProvider {
  name = "web_push";

  async send(request: NotificationRequest): Promise<NotificationResult> {
    if (request.channel !== "push") {
      return { ok: false, provider: this.name, retryable: false, errorCode: "unsupported_channel", errorSummary: "Web Push provider supports push notifications only." };
    }
    if (
      notificationMode() !== "production" ||
      !productionNotificationDeliveryEnabled() ||
      !agentPushNotificationsEnabled()
    ) {
      return { ok: false, provider: this.name, retryable: false, errorCode: "push_notifications_disabled", errorSummary: "Production Web Push notifications are disabled by configuration." };
    }

    const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
    const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
    const subject = (process.env.VAPID_SUBJECT || "mailto:mike@ourtownproperties.com").trim();
    if (!publicKey || !privateKey || !/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$|^https:\/\//.test(subject)) {
      return { ok: false, provider: this.name, retryable: false, errorCode: "missing_provider_config", errorSummary: "Web Push VAPID configuration is incomplete." };
    }

    let repository: NeonPushSubscriptionRepository;
    try {
      repository = new NeonPushSubscriptionRepository();
    } catch {
      return { ok: false, provider: this.name, retryable: false, errorCode: "missing_database_config", errorSummary: "Web Push subscription storage is unavailable." };
    }
    const subscription = await repository.findActiveById(request.recipient).catch(() => null);
    if (!subscription) {
      return { ok: false, provider: this.name, retryable: false, errorCode: "push_subscription_missing", errorSummary: "The approved phone notification subscription is inactive or missing." };
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    const payload = JSON.stringify({
      title: safeSubject(request.subject || "Ask Magic Mike lead alert"),
      body: request.text.slice(0, 180),
      icon: "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.png",
      badge: "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-128.png",
      url: "/admin/leads",
      tag: request.idempotencyKey.slice(0, 120),
    });

    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
        { TTL: 300, urgency: "high", timeout: 10_000 },
      );
      await repository.markSent(subscription.id).catch(() => undefined);
      return { ok: true, provider: this.name, providerMessageId: `webpush_${request.notificationId}` };
    } catch (error) {
      const status = typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: unknown }).statusCode)
        : 0;
      const expired = status === 404 || status === 410;
      const summary = expired ? "The phone notification subscription expired and was disabled." : `Web Push delivery failed${status ? ` with status ${status}` : ""}.`;
      await repository.markFailure(subscription.id, summary, expired).catch(() => undefined);
      return {
        ok: false,
        provider: this.name,
        retryable: !expired && (status === 0 || status === 408 || status === 429 || status >= 500),
        errorCode: expired ? "push_subscription_expired" : status ? `web_push_http_${status}` : "web_push_network_error",
        errorSummary: summary,
      };
    }
  }
}

class ProductionNotificationProvider implements NotificationProvider {
  name = "production_router";
  constructor(
    private readonly email = selectEmailNotificationProvider("production"),
    private readonly sms = new TwilioSmsNotificationProvider(),
    private readonly push = new WebPushNotificationProvider(),
  ) {}
  send(request: NotificationRequest) {
    if (request.channel === "sms") return this.sms.send(request);
    if (request.channel === "push") return this.push.send(request);
    return this.email.send(request);
  }
}

class InvalidEmailNotificationProvider implements NotificationProvider {
  name = "invalid_email_provider";

  async send(_request: NotificationRequest): Promise<NotificationResult> {
    return {
      ok: false,
      provider: this.name,
      retryable: false,
      errorCode: "email_provider_invalid",
      errorSummary: "The configured email provider is unsupported or missing.",
    };
  }
}

export function selectEmailNotificationProvider(
  mode: "sandbox" | "production",
  options: {
    resendTransport?: typeof fetch;
    smtpTransportFactory?: SmtpTransportFactory;
  } = {},
): NotificationProvider {
  const provider = configuredEmailProvider();
  if (provider === "resend") {
    return new ResendEmailNotificationProvider(mode, options.resendTransport);
  }
  if (provider === "smtp") {
    return new SmtpEmailNotificationProvider(mode, options.smtpTransportFactory);
  }
  return new InvalidEmailNotificationProvider();
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
  if (mode === "sandbox") return selectEmailNotificationProvider("sandbox");
  return new ProductionNotificationProvider();
}
