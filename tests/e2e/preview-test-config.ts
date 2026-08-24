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

export const previewTestUse = {
  baseURL: previewUrl || "http://localhost:3000",
  extraHTTPHeaders: bypassHeaders(),
};
