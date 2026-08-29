import { createHash } from "node:crypto";

import type { WebVitalEventProperties } from "./web-vitals";

const CANONICAL_EXPERIENCE_ORIGINS = new Set([
  "https://askmagicmike.com",
  "https://www.askmagicmike.com",
]);

export function webVitalMetricDigest(metricId: string) {
  return `wv1_${createHash("sha256")
    .update(`ask-magic-mike:web-vital:v1:${metricId}`, "utf8")
    .digest("hex")}`;
}

export function coarseWebVitalUserAgent(
  rawUserAgent: string | null,
  deviceCategory: WebVitalEventProperties["device_category"],
) {
  const userAgent = rawUserAgent ?? "";
  const automation = !/Mozilla\/5\.0/i.test(userAgent) ||
    /(?:headless|playwright|lighthouse|bot|crawler|spider|curl|wget|postman|insomnia)/i.test(userAgent);
  return `${automation ? "automation" : "browser"}/${deviceCategory}`;
}

export function isCanonicalProductionWebVitalRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env,
) {
  if (env.VERCEL_ENV !== "production") return false;
  try {
    const requestOrigin = new URL(request.url).origin;
    return CANONICAL_EXPERIENCE_ORIGINS.has(requestOrigin) &&
      request.headers.get("origin") === requestOrigin;
  } catch {
    return false;
  }
}
