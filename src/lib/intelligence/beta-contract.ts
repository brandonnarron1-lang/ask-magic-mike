/** Public beta identity, never an access credential. The server clock is the
 * authority; the client additionally refuses expired connections. */
export function validBetaOrigin(value: string) {
  return /^https:\/\/amm-internal-beta-[a-f0-9]{12}\.vercel\.app$/.test(value);
}
export const BETA_PREFIX = "/api/native/beta/v1";
export type BetaWindow = { createdAt: number; expiresAt: number; source: string; venue: string };
export function betaWindow(value: unknown): BetaWindow {
  const v = value as BetaWindow;
  if (!v || typeof v !== "object" || Object.keys(v).sort().join() !== "createdAt,expiresAt,source,venue"
    || !Number.isSafeInteger(v.createdAt) || !Number.isSafeInteger(v.expiresAt)
    || v.expiresAt <= v.createdAt || v.expiresAt - v.createdAt > 7 * 86400000
    || !/^[a-f0-9]{40}$/.test(v.source) || !/^[a-f0-9-]{36}$/.test(v.venue)) throw Error("beta_configuration_unavailable");
  return v;
}
export function betaRoute(path: string, method: string) {
  return (method === "POST" && ["/api/chat/message", "/api/native/v1/feedback"].includes(path))
    || (method === "GET" && ["/api/intelligence/answers", "/api/intelligence/feedback", "/api/native/v1/feedback-token"].includes(path));
}
