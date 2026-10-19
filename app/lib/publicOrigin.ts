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
  if(env.VERCEL_ENV === "production"||!/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin))return false;
  if(env.NODE_ENV !== "production")return true;
  // A locally built application is still a legitimate development venue. Bind
  // it to its configured auth origin; never trust a request Host/forwarded host
  // to add an origin, and never apply this on hosted Vercel deployments.
  if(env.VERCEL_ENV!=="development"||env.VERCEL==="1"||!env.BETTER_AUTH_URL)return false;
  try{return new URL(env.BETTER_AUTH_URL).origin===origin;}catch{return false;}
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
