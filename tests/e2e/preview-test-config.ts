/** Shared, secret-safe Playwright configuration for protected Vercel Previews. */

function resolveBypassSecret(): string | null {
  return (
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    process.env.VERCEL_PROTECTION_BYPASS_TOKEN ||
    process.env.VERCEL_BYPASS_SECRET ||
    null
  );
}

function bypassHeaders(): Record<string, string> {
  const secret = resolveBypassSecret();
  if (!secret) return {};
  const headers: Record<string, string> = {
    "x-vercel-protection-bypass": secret,
  };
  if ((process.env.SET_VERCEL_BYPASS_COOKIE ?? "false").toLowerCase() === "true") {
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  return headers;
}

const previewUrl = process.env.PREVIEW_URL?.replace(/\/$/, "") ?? "";
const localE2ePort = process.env.AMM_E2E_PORT ?? "3210";

export const previewTestUse = {
  baseURL: previewUrl || `http://127.0.0.1:${localE2ePort}`,
  extraHTTPHeaders: bypassHeaders(),
};
