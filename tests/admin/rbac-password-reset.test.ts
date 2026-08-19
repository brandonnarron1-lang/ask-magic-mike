import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLeadCenterPasswordResetEmail,
  sendLeadCenterPasswordResetEmail,
} from "../../src/lib/admin/rbac-password-reset-email";
import type { SmtpTransportFactory } from "../../app/lib/leadNotificationProvider";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

function enableResetDelivery() {
  process.env.RBAC_PASSWORD_RESET_EMAIL_ENABLED = "true";
  process.env.LEAD_NOTIFICATION_MODE = "production";
  process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "true";
  process.env.EMAIL_ENABLED = "true";
  process.env.RESEND_API_KEY = "test-key-not-a-secret";
  process.env.RESEND_FROM = "security@example.test";
  process.env.BETTER_AUTH_URL = "https://www.askmagicmike.com";
}

describe("Lead Center password-reset email", () => {
  it("renders a one-time security message without placing identity in the subject", () => {
    const resetUrl = "https://www.askmagicmike.com/api/lead-center-auth/reset-password/token123?callbackURL=https%3A%2F%2Fwww.askmagicmike.com%2Flead-center-set-password";
    const rendered = buildLeadCenterPasswordResetEmail({
      email: "operator@example.test",
      name: "Operator <script>",
      url: resetUrl,
    });
    expect(rendered.subject).toBe("Set your Ask Magic Mike Lead Center password");
    expect(rendered.subject).not.toContain("Operator");
    expect(rendered.html).toContain("Operator &lt;script&gt;");
    expect(rendered.html).not.toContain("Operator <script>");
    expect(rendered.text).toContain("expires in 60 minutes");
  });

  it("fails closed while the dedicated delivery gate is disabled", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(sendLeadCenterPasswordResetEmail({
      email: "operator@example.test",
      url: "https://www.askmagicmike.com/api/lead-center-auth/reset-password/token123",
    }, { resendTransport: transport })).rejects.toThrow("disabled");
    expect(transport).not.toHaveBeenCalled();
  });

  it("rejects off-origin reset links before contacting the provider", async () => {
    enableResetDelivery();
    const transport = vi.fn<typeof fetch>();
    await expect(sendLeadCenterPasswordResetEmail({
      email: "operator@example.test",
      url: "https://example.net/api/lead-center-auth/reset-password/token123",
    }, { resendTransport: transport })).rejects.toThrow("rejected");
    expect(transport).not.toHaveBeenCalled();
  });

  it("uses authenticated Resend delivery with no BCC and an opaque idempotency key", async () => {
    enableResetDelivery();
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "msg_reset_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const resetUrl = "https://www.askmagicmike.com/api/lead-center-auth/reset-password/secret-reset-token?callbackURL=https%3A%2F%2Fwww.askmagicmike.com%2Flead-center-set-password";
    await sendLeadCenterPasswordResetEmail({
      email: "operator@example.test",
      name: "Operator",
      url: resetUrl,
    }, { resendTransport: transport });

    expect(transport).toHaveBeenCalledOnce();
    const [, options] = transport.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    const body = JSON.parse(String(options?.body));
    expect(headers["Idempotency-Key"]).toMatch(/^rbac-password-reset-v1-[a-f0-9]{32}$/);
    expect(headers["Idempotency-Key"]).not.toContain("secret-reset-token");
    expect(body.to).toBe("operator@example.test");
    expect(body.bcc).toBeUndefined();
    expect(body.html).toContain(resetUrl.replaceAll("&", "&amp;"));
  });

  it("uses the selected SMTP provider without adding an audit BCC", async () => {
    enableResetDelivery();
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASSWORD = "smtp-password";
    process.env.SMTP_FROM_NAME = "Ask Magic Mike Security";
    process.env.SMTP_FROM_EMAIL = "security@example.test";

    const sendMail = vi.fn(async (_options: Record<string, unknown>) => ({
      accepted: ["operator@example.test"],
      rejected: [],
      messageId: undefined,
    }));
    const close = vi.fn();
    const transportFactory = vi.fn(() => ({ sendMail, close })) as unknown as SmtpTransportFactory;
    const resetUrl = "https://www.askmagicmike.com/api/lead-center-auth/reset-password/secret-reset-token?callbackURL=https%3A%2F%2Fwww.askmagicmike.com%2Flead-center-set-password";

    await sendLeadCenterPasswordResetEmail({
      email: "operator@example.test",
      name: "Operator",
      url: resetUrl,
    }, { smtpTransportFactory: transportFactory });

    expect(transportFactory).toHaveBeenCalledWith(expect.objectContaining({
      port: 465,
      secure: true,
      requireTLS: false,
    }));
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0][0].to).toBe("operator@example.test");
    expect(sendMail.mock.calls[0][0].bcc).toBeUndefined();
    expect(sendMail.mock.calls[0][0].messageId).toMatch(/^<amm-[a-f0-9]{40}@example\.test>$/);
    expect(close).toHaveBeenCalledOnce();
  });
});
