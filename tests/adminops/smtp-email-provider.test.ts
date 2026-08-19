import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SmtpEmailNotificationProvider,
  type SmtpTransportFactory,
  selectEmailNotificationProvider,
} from "../../app/lib/leadNotificationProvider";
import {
  configuredEmailProvider,
  resolveSmtpConfiguration,
} from "../../app/lib/emailProviderConfiguration";

const ORIGINAL_ENV = { ...process.env };

function configureSmtp(mode: "sandbox" | "production" = "production") {
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.EMAIL_ENABLED = "true";
  process.env.LEAD_NOTIFICATION_MODE = mode;
  process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "true";
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_SECURE = "false";
  process.env.SMTP_USER = "smtp-user";
  process.env.SMTP_PASSWORD = "smtp-password";
  process.env.SMTP_FROM_NAME = "Our Town Properties";
  process.env.SMTP_FROM_EMAIL = "alerts@example.test";
  process.env.SMTP_REPLY_TO = "team@example.test";
  process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "qa@example.test";
  process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";
}

function request() {
  return {
    notificationId: "notification-smtp-1",
    channel: "email" as const,
    recipient: "mike@example.test",
    bcc: ["audit@example.test"],
    replyTo: "lead@example.test",
    subject: "[TEST] Seller lead\r\nBcc: attacker@example.test",
    text: "INTERNAL QA — DO NOT CONTACT",
    html: "<p>INTERNAL QA — DO NOT CONTACT</p>",
    idempotencyKey: "lead:test:lead-alert:v1",
  };
}

function fakeTransport(info: Record<string, unknown> = {
  accepted: ["mike@example.test", "audit@example.test"],
  rejected: [],
  messageId: "<provider-message@example.test>",
}) {
  const sendMail = vi.fn(async (_options: Record<string, unknown>) => info);
  const close = vi.fn();
  const factoryMock = vi.fn((_options: Record<string, unknown>) => ({ sendMail, close }));
  const factory = factoryMock as unknown as SmtpTransportFactory;
  return { factory, factoryMock, sendMail, close };
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  configureSmtp();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("authenticated SMTP email provider", () => {
  it("selects an explicit provider and preserves the legacy Resend fallback", () => {
    expect(configuredEmailProvider()).toBe("smtp");
    expect(selectEmailNotificationProvider("production")).toBeInstanceOf(SmtpEmailNotificationProvider);

    delete process.env.EMAIL_PROVIDER;
    process.env.RESEND_API_KEY = "legacy-resend-key";
    expect(configuredEmailProvider()).toBe("resend");

    process.env.EMAIL_PROVIDER = "mock";
    expect(configuredEmailProvider()).toBe("invalid");
  });

  it("accepts only authenticated TLS on approved ports with bounded timeouts", () => {
    expect(resolveSmtpConfiguration().ok).toBe(true);

    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    expect(resolveSmtpConfiguration().ok).toBe(true);

    for (const [name, value, code] of [
      ["SMTP_HOST", "localhost", "smtp_host_invalid"],
      ["SMTP_PORT", "25", "smtp_port_invalid"],
      ["SMTP_SECURE", "maybe", "smtp_secure_invalid"],
      ["SMTP_CONNECTION_TIMEOUT_MS", "999", "smtp_timeout_invalid"],
    ] as const) {
      configureSmtp();
      process.env[name] = value;
      const result = resolveSmtpConfiguration();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errorCode).toBe(code);
    }

    configureSmtp();
    process.env.SMTP_SECURE = "true";
    const mismatch = resolveSmtpConfiguration();
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.errorCode).toBe("smtp_tls_port_mismatch");

    configureSmtp();
    delete process.env.SMTP_PASSWORD;
    const missingAuth = resolveSmtpConfiguration();
    expect(missingAuth.ok).toBe(false);
    if (!missingAuth.ok) expect(missingAuth.errorCode).toBe("smtp_auth_invalid");
  });

  it("keeps production gated before opening a socket", async () => {
    process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "false";
    const transport = fakeTransport();
    const result = await new SmtpEmailNotificationProvider("production", transport.factory).send(request());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("production_provider_disabled");
    expect(transport.factoryMock).not.toHaveBeenCalled();
  });

  it("fails closed for an unsupported explicit provider selector", async () => {
    process.env.EMAIL_PROVIDER = "mock";
    const result = await selectEmailNotificationProvider("production").send(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("email_provider_invalid");
  });

  it("uses the allowlisted sandbox override instead of the requested recipient", async () => {
    configureSmtp("sandbox");
    const transport = fakeTransport({
      accepted: ["qa@example.test", "audit@example.test"],
      rejected: [],
      messageId: "<sandbox-message@example.test>",
    });
    const result = await new SmtpEmailNotificationProvider("sandbox", transport.factory).send(request());

    expect(result.ok).toBe(true);
    expect(transport.sendMail).toHaveBeenCalledOnce();
    const message = transport.sendMail.mock.calls[0][0];
    expect(message.to).toBe("qa@example.test");
    expect(JSON.stringify(message)).not.toContain("mike@example.test");
  });

  it("blocks a sandbox BCC outside the explicit allowlist", async () => {
    configureSmtp("sandbox");
    const transport = fakeTransport();
    const result = await new SmtpEmailNotificationProvider("sandbox", transport.factory).send({
      ...request(),
      bcc: ["audit@outside.invalid"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("sandbox_bcc_not_allowlisted");
    expect(transport.factoryMock).not.toHaveBeenCalled();
  });

  it("sends live text and HTML through a locked-down one-shot transport", async () => {
    const transport = fakeTransport();
    const provider = new SmtpEmailNotificationProvider("production", transport.factory);
    const first = await provider.send(request());
    const secondTransport = fakeTransport();
    const second = await new SmtpEmailNotificationProvider("production", secondTransport.factory).send(request());

    expect(first).toEqual({
      ok: true,
      provider: "smtp",
      providerMessageId: "<provider-message@example.test>",
    });
    expect(second.ok).toBe(true);
    const options = transport.factoryMock.mock.calls[0][0];
    expect(options).toMatchObject({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      disableFileAccess: true,
      disableUrlAccess: true,
      tls: { rejectUnauthorized: true, servername: "smtp.example.test" },
    });
    expect(options.auth).toEqual({ user: "smtp-user", pass: "smtp-password" });

    configureSmtp();
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    const implicitTlsTransport = fakeTransport();
    await new SmtpEmailNotificationProvider("production", implicitTlsTransport.factory).send(request());
    expect(implicitTlsTransport.factoryMock.mock.calls[0][0]).toMatchObject({
      port: 465,
      secure: true,
      requireTLS: false,
    });

    const message = transport.sendMail.mock.calls[0][0];
    expect(message).toMatchObject({
      from: { name: "Our Town Properties", address: "alerts@example.test" },
      to: "mike@example.test",
      bcc: ["audit@example.test"],
      replyTo: "lead@example.test",
      subject: "[TEST] Seller lead Bcc: attacker@example.test",
      text: "INTERNAL QA — DO NOT CONTACT",
      html: "<p>INTERNAL QA — DO NOT CONTACT</p>",
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    expect(message.messageId).toMatch(/^<amm-[a-f0-9]{40}@example\.test>$/);
    expect(secondTransport.sendMail.mock.calls[0][0].messageId).toBe(message.messageId);
    expect(transport.close).toHaveBeenCalledOnce();
    expect(secondTransport.close).toHaveBeenCalledOnce();
  });

  it("retains the deterministic Message-ID when an accepting relay omits its response ID", async () => {
    const transport = fakeTransport({
      accepted: ["mike@example.test", "audit@example.test"],
      rejected: [],
      messageId: undefined,
    });
    const result = await new SmtpEmailNotificationProvider("production", transport.factory).send(request());
    const requestedMessageId = transport.sendMail.mock.calls[0][0].messageId;

    expect(result).toEqual({
      ok: true,
      provider: "smtp",
      providerMessageId: requestedMessageId,
    });
    expect(requestedMessageId).toMatch(/^<amm-[a-f0-9]{40}@example\.test>$/);
  });

  it("classifies transient failures as retryable without exposing provider details", async () => {
    for (const error of [
      { code: "ETIMEDOUT", message: "smtp-password lead@example.test" },
      { responseCode: 421, message: "audit@example.test" },
      { responseCode: 451, message: "temporary" },
    ]) {
      const sendMail = vi.fn(async () => { throw error; });
      const close = vi.fn();
      const factory = vi.fn(() => ({ sendMail, close })) as unknown as SmtpTransportFactory;
      const result = await new SmtpEmailNotificationProvider("production", factory).send(request());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.retryable).toBe(true);
        expect(result.errorSummary).not.toContain("smtp-password");
        expect(result.errorSummary).not.toContain("lead@example.test");
      }
      expect(close).toHaveBeenCalledOnce();
    }
  });

  it("does not retry permanent authentication, recipient, or partial BCC rejection", async () => {
    for (const error of [
      { code: "EAUTH", responseCode: 535 },
      { responseCode: 550 },
    ]) {
      const sendMail = vi.fn(async () => { throw error; });
      const close = vi.fn();
      const factory = vi.fn(() => ({ sendMail, close })) as unknown as SmtpTransportFactory;
      const result = await new SmtpEmailNotificationProvider("production", factory).send(request());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.retryable).toBe(false);
    }

    const partial = fakeTransport({
      accepted: ["mike@example.test"],
      rejected: ["audit@example.test"],
      messageId: "<partial@example.test>",
    });
    const partialResult = await new SmtpEmailNotificationProvider("production", partial.factory).send(request());
    expect(partialResult.ok).toBe(false);
    if (!partialResult.ok) {
      expect(partialResult.retryable).toBe(false);
      expect(partialResult.errorCode).toBe("smtp_partial_recipient_rejection");
    }

    const unconfirmed = fakeTransport({
      accepted: ["mike@example.test"],
      rejected: [],
      messageId: "<unconfirmed@example.test>",
    });
    const unconfirmedResult = await new SmtpEmailNotificationProvider("production", unconfirmed.factory).send(request());
    expect(unconfirmedResult.ok).toBe(false);
    if (!unconfirmedResult.ok) {
      expect(unconfirmedResult.retryable).toBe(false);
      expect(unconfirmedResult.errorCode).toBe("smtp_acceptance_unconfirmed");
    }
  });

  it("rejects malformed protected recipients before opening a socket", async () => {
    const transport = fakeTransport();
    const provider = new SmtpEmailNotificationProvider("production", transport.factory);
    const result = await provider.send({
      ...request(),
      bcc: ["audit@example.test\r\nCc: attacker@example.test"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("smtp_bcc_invalid");
    expect(transport.factory).not.toHaveBeenCalled();
  });
});
