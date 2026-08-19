import { createHash } from "node:crypto";
import {
  selectEmailNotificationProvider,
  type SmtpTransportFactory,
} from "../../../app/lib/leadNotificationProvider";

type PasswordResetEmailInput = {
  email: string;
  name?: string | null;
  url: string;
};

type PasswordResetEmailTransportOptions = {
  resendTransport?: typeof fetch;
  smtpTransportFactory?: SmtpTransportFactory;
};

function enabled(value: string | undefined) {
  return value?.toLowerCase() === "true";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && !/[\r\n]/.test(value);
}

function approvedResetUrl(value: string) {
  try {
    const resetUrl = new URL(value);
    const configuredOrigin = new URL(
      process.env.BETTER_AUTH_URL || "https://www.askmagicmike.com",
    ).origin;
    return (
      resetUrl.protocol === "https:" &&
      resetUrl.origin === configuredOrigin &&
      /^\/api\/lead-center-auth\/reset-password\/[A-Za-z0-9_-]{8,128}$/.test(resetUrl.pathname)
    );
  } catch {
    return false;
  }
}

export function buildLeadCenterPasswordResetEmail(input: PasswordResetEmailInput) {
  const displayName = Array.from(input.name || "Lead Center user")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? " " : character;
    })
    .join("")
    .trim()
    .slice(0, 80) || "Lead Center user";
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(input.url);
  const subject = "Set your Ask Magic Mike Lead Center password";
  const text = [
    `Hello ${displayName},`,
    "",
    "Use the secure link below to set or reset your Ask Magic Mike Lead Center password:",
    input.url,
    "",
    "This link expires in 60 minutes and can be used once. If you did not request it, no action is needed.",
    "",
    "Ask Magic Mike | Our Town Properties, Inc.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#09090b;color:#f4f4f5;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:36px 20px">
      <div style="border:1px solid #6b5525;border-radius:16px;background:#18181b;padding:28px">
        <p style="margin:0 0 8px;color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase">Ask Magic Mike</p>
        <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2">Set your Lead Center password</h1>
        <p style="margin:0 0 16px;line-height:1.6">Hello ${safeName},</p>
        <p style="margin:0 0 24px;line-height:1.6">Use this secure, one-time link to set or reset your password.</p>
        <p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;border-radius:8px;background:#fbbf24;color:#09090b;padding:13px 18px;font-weight:700;text-decoration:none">Set password</a></p>
        <p style="margin:0;color:#d4d4d8;font-size:13px;line-height:1.6">The link expires in 60 minutes. If you did not request it, no action is needed.</p>
      </div>
      <p style="margin:18px 4px 0;color:#a1a1aa;font-size:12px">Ask Magic Mike | Our Town Properties, Inc.</p>
    </div>
  </body>
</html>`;
  return { subject, text, html };
}

export async function sendLeadCenterPasswordResetEmail(
  input: PasswordResetEmailInput,
  transportOptions: PasswordResetEmailTransportOptions = {},
) {
  if (!enabled(process.env.RBAC_PASSWORD_RESET_EMAIL_ENABLED)) {
    throw new Error("Lead Center password reset email is disabled.");
  }
  if (!validEmail(input.email) || !approvedResetUrl(input.url)) {
    throw new Error("Lead Center password reset email input was rejected.");
  }

  const digest = createHash("sha256").update(input.url).digest("hex").slice(0, 32);
  const rendered = buildLeadCenterPasswordResetEmail(input);
  const result = await selectEmailNotificationProvider("production", {
    resendTransport: transportOptions.resendTransport,
    smtpTransportFactory: transportOptions.smtpTransportFactory,
  }).send({
    notificationId: `rbac-password-reset-${digest}`,
    channel: "email",
    recipient: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    idempotencyKey: `rbac-password-reset-v1-${digest}`,
  });

  if (!result.ok) {
    throw new Error("Lead Center password reset email could not be delivered.");
  }
}
