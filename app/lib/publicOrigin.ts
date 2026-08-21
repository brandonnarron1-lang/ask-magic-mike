const APPROVED_ASK_MAGIC_MIKE_ORIGINS = new Set([
  "https://www.askmagicmike.com",
  "https://askmagicmike.com",
]);

const APPROVED_PUBLIC_ORIGINS = new Set([
  ...APPROVED_ASK_MAGIC_MIKE_ORIGINS,
  "https://www.ourtownproperties.com",
  "https://ourtownproperties.com",
]);

function vercelPreviewOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function isExactVercelPreviewOrigin(origin: string, env: NodeJS.ProcessEnv) {
  if (env.VERCEL_ENV !== "preview") return false;
  return [
    vercelPreviewOrigin(env.VERCEL_URL),
    vercelPreviewOrigin(env.VERCEL_BRANCH_URL),
  ].includes(origin);
}

function isLocalDevelopmentOrigin(origin: string, env: NodeJS.ProcessEnv) {
  return env.NODE_ENV !== "production"
    && env.VERCEL_ENV !== "production"
    && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin);
}

export function isApprovedAskMagicMikeOrigin(
  origin: string | null,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!origin) return false;
  return APPROVED_ASK_MAGIC_MIKE_ORIGINS.has(origin)
    || isExactVercelPreviewOrigin(origin, env)
    || isLocalDevelopmentOrigin(origin, env);
}

export function isApprovedPublicOrigin(origin: string | null, env: NodeJS.ProcessEnv = process.env) {
  if (!origin) return true;
  if (APPROVED_PUBLIC_ORIGINS.has(origin)) return true;
  return isExactVercelPreviewOrigin(origin, env) || isLocalDevelopmentOrigin(origin, env);
}

export function allowedWidgetParentOrigin(parentUrl: string | null | undefined) {
  if (!parentUrl) return null;
  try {
    const origin = new URL(parentUrl).origin;
    return APPROVED_PUBLIC_ORIGINS.has(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function approvedPublicOrigins() {
  return Array.from(APPROVED_PUBLIC_ORIGINS);
}
