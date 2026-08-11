const APPROVED_PUBLIC_ORIGINS = new Set([
  "https://www.askmagicmike.com",
  "https://askmagicmike.com",
  "https://www.ourtownproperties.com",
  "https://ourtownproperties.com",
]);

export function isApprovedPublicOrigin(origin: string | null, env: NodeJS.ProcessEnv = process.env) {
  if (!origin) return true;
  if (APPROVED_PUBLIC_ORIGINS.has(origin)) return true;
  if (env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production") {
    return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin);
  }
  return false;
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
