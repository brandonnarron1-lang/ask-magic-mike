export type EmailProviderKind = "resend" | "smtp" | "invalid";

export type SmtpConfiguration = {
  host: string;
  port: 465 | 587;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
};

export type SmtpConfigurationResult =
  | { ok: true; configuration: SmtpConfiguration }
  | { ok: false; errorCode: string; errorSummary: string };

function normalized(value: string | undefined) {
  return (value || "").trim();
}

function hasControlCharacters(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function validHostname(value: string) {
  if (
    !value ||
    value.length > 253 ||
    value.startsWith(".") ||
    value.endsWith(".") ||
    value.includes("..") ||
    !value.includes(".") ||
    hasControlCharacters(value)
  ) {
    return false;
  }
  return value
    .toLowerCase()
    .split(".")
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function validEmail(value: string) {
  return (
    value.length <= 254 &&
    !hasControlCharacters(value) &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
  );
}

function boundedTimeout(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1_000 || parsed > 60_000) return null;
  return parsed;
}

export function configuredEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProviderKind {
  const explicit = normalized(env.EMAIL_PROVIDER).toLowerCase();
  if (explicit === "resend" || explicit === "smtp") return explicit;
  // Preserve the already-deployed Resend configuration when the historical
  // provider selector is absent. Any explicit unsupported value fails closed.
  if (!explicit && normalized(env.RESEND_API_KEY)) return "resend";
  return "invalid";
}

export function resolveSmtpConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): SmtpConfigurationResult {
  const host = normalized(env.SMTP_HOST).toLowerCase();
  const portText = normalized(env.SMTP_PORT);
  const secureText = normalized(env.SMTP_SECURE).toLowerCase();
  const user = normalized(env.SMTP_USER);
  const password = env.SMTP_PASSWORD || "";
  const fromEmail = normalized(env.SMTP_FROM_EMAIL).toLowerCase();
  const fromName = normalized(env.SMTP_FROM_NAME || "Our Town Properties")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 100);
  const replyTo = normalized(env.SMTP_REPLY_TO).toLowerCase();

  if (!validHostname(host)) {
    return { ok: false, errorCode: "smtp_host_invalid", errorSummary: "SMTP host is missing or invalid." };
  }
  if (portText !== "465" && portText !== "587") {
    return { ok: false, errorCode: "smtp_port_invalid", errorSummary: "SMTP port must be 465 or 587." };
  }
  if (secureText !== "true" && secureText !== "false") {
    return { ok: false, errorCode: "smtp_secure_invalid", errorSummary: "SMTP TLS mode is missing or invalid." };
  }

  const port = Number(portText) as 465 | 587;
  const secure = secureText === "true";
  if ((port === 465 && !secure) || (port === 587 && secure)) {
    return {
      ok: false,
      errorCode: "smtp_tls_port_mismatch",
      errorSummary: "SMTP TLS mode does not match the approved port.",
    };
  }
  if (!user || !password || hasControlCharacters(user) || /[\r\n]/.test(password)) {
    return {
      ok: false,
      errorCode: "smtp_auth_invalid",
      errorSummary: "Authenticated SMTP credentials are missing or invalid.",
    };
  }
  if (!validEmail(fromEmail) || (replyTo && !validEmail(replyTo))) {
    return {
      ok: false,
      errorCode: "smtp_sender_invalid",
      errorSummary: "SMTP sender or reply address is missing or invalid.",
    };
  }

  const connectionTimeoutMs = boundedTimeout(env.SMTP_CONNECTION_TIMEOUT_MS, 10_000);
  const greetingTimeoutMs = boundedTimeout(env.SMTP_GREETING_TIMEOUT_MS, 10_000);
  const socketTimeoutMs = boundedTimeout(env.SMTP_SOCKET_TIMEOUT_MS, 20_000);
  if (connectionTimeoutMs === null || greetingTimeoutMs === null || socketTimeoutMs === null) {
    return {
      ok: false,
      errorCode: "smtp_timeout_invalid",
      errorSummary: "SMTP timeouts must be between 1 and 60 seconds.",
    };
  }

  return {
    ok: true,
    configuration: {
      host,
      port,
      secure,
      user,
      password,
      fromName: fromName || "Our Town Properties",
      fromEmail,
      ...(replyTo ? { replyTo } : {}),
      connectionTimeoutMs,
      greetingTimeoutMs,
      socketTimeoutMs,
    },
  };
}

export function smtpConfigurationReady(env: NodeJS.ProcessEnv = process.env) {
  return resolveSmtpConfiguration(env).ok;
}

/**
 * Read-only readiness check for workers that must not consume durable outbox
 * rows while the selected email provider is incomplete. No credential value
 * leaves this function.
 */
export function emailProviderConfigurationReady(
  env: NodeJS.ProcessEnv = process.env,
) {
  const provider = configuredEmailProvider(env);
  if (provider === "smtp") return smtpConfigurationReady(env);
  if (provider !== "resend") return false;

  const apiKey = normalized(env.RESEND_API_KEY);
  const fromEmail = normalized(
    env.AGENT_NOTIFICATION_FROM_EMAIL || env.RESEND_FROM || env.FROM_EMAIL,
  ).toLowerCase();
  return Boolean(apiKey && validEmail(fromEmail));
}
