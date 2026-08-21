export const CORE_WEB_VITAL_NAMES = ["LCP", "INP", "CLS"] as const;
export type CoreWebVitalName = (typeof CORE_WEB_VITAL_NAMES)[number];

const RATINGS = ["good", "needs-improvement", "poor"] as const;
const NAVIGATION_TYPES = [
  "navigate",
  "reload",
  "prerender",
  "back-forward",
  "back-forward-cache",
  "restore",
] as const;
const DEVICE_CATEGORIES = ["mobile", "desktop"] as const;
const CANONICAL_EXPERIENCE_ORIGINS = new Set([
  "https://askmagicmike.com",
  "https://www.askmagicmike.com",
]);
const PUBLIC_EXPERIENCE_ROUTES = new Set([
  "/",
  "/accessibility",
  "/ask",
  "/buy",
  "/contact",
  "/embed/ask",
  "/home-value",
  "/integrations/ourtownproperties",
  "/plan",
  "/privacy",
  "/rent",
  "/sell",
  "/social-preview",
  "/terms",
  "/thank-you",
  "/value",
  "/we-buy-houses",
  "/widget",
  "/widget-preview",
  "/widget/v1",
]);

export type WebVitalEventProperties = {
  metric_name: CoreWebVitalName;
  metric_id: string;
  metric_value: number;
  rating: (typeof RATINGS)[number];
  navigation_type: (typeof NAVIGATION_TYPES)[number];
  route: string;
  device_category: (typeof DEVICE_CATEGORIES)[number];
  traffic_class: "public_production";
};

export type WebVitalAnalyticsProperties = Omit<WebVitalEventProperties, "metric_name"> & {
  metric_code: CoreWebVitalName;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizePublicExperienceRoute(pathname: string) {
  const candidate = pathname.trim().replace(/\/+$/, "") || "/";
  if (PUBLIC_EXPERIENCE_ROUTES.has(candidate)) return candidate;
  if (/^\/open-house\/[^/?#]{1,160}$/.test(candidate)) {
    return "/open-house/[property-or-id]";
  }
  return null;
}

export function isKnownInternalQaSearch(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const source = (params.get("utm_source") ?? "").trim().toLowerCase();
  const medium = (params.get("utm_medium") ?? "").trim().toLowerCase();
  const campaign = (params.get("utm_campaign") ?? "").trim().toLowerCase();
  const content = (params.get("utm_content") ?? "").trim().toLowerCase();
  const gclid = (params.get("gclid") ?? "").trim().toLowerCase();
  return source.startsWith("internal_qa") || source === "qa" || source === "test" ||
    medium === "qa" || medium === "test" || campaign.includes("internal_qa") ||
    content === "controlled_test" || gclid === "internal_qa" ||
    params.get("is_test") === "true";
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

function coreWebVitalRating(metricName: CoreWebVitalName, value: number) {
  if (metricName === "LCP") return value <= 2_500 ? "good" : value <= 4_000 ? "needs-improvement" : "poor";
  if (metricName === "INP") return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
  return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
}

export function normalizeWebVitalEventProperties(
  input: Record<string, unknown>,
): WebVitalEventProperties | null {
  const metricName = text(input.metric_name).toUpperCase();
  if (!CORE_WEB_VITAL_NAMES.includes(metricName as CoreWebVitalName)) return null;
  const metricId = text(input.metric_id);
  if (!/^[a-zA-Z0-9._:-]{1,160}$/.test(metricId)) return null;
  const metricValue = finiteNumber(input.metric_value);
  if (metricValue == null || metricValue < 0) return null;
  if ((metricName === "LCP" || metricName === "INP") && metricValue > 600_000) return null;
  if (metricName === "CLS" && metricValue > 100) return null;
  const rating = text(input.rating);
  if (!RATINGS.includes(rating as WebVitalEventProperties["rating"])) return null;
  const canonicalRating = coreWebVitalRating(metricName as CoreWebVitalName, metricValue);
  const navigationType = text(input.navigation_type);
  if (!NAVIGATION_TYPES.includes(navigationType as WebVitalEventProperties["navigation_type"])) return null;
  const route = normalizePublicExperienceRoute(text(input.route));
  if (!route || route !== text(input.route)) return null;
  const deviceCategory = text(input.device_category);
  if (!DEVICE_CATEGORIES.includes(deviceCategory as WebVitalEventProperties["device_category"])) return null;
  if (input.traffic_class !== "public_production") return null;
  return {
    metric_name: metricName as CoreWebVitalName,
    metric_id: metricId,
    metric_value: metricName === "CLS"
      ? Math.round(metricValue * 10_000) / 10_000
      : Math.round(metricValue * 100) / 100,
    rating: canonicalRating,
    navigation_type: navigationType as WebVitalEventProperties["navigation_type"],
    route,
    device_category: deviceCategory as WebVitalEventProperties["device_category"],
    traffic_class: "public_production",
  };
}

export function toWebVitalAnalyticsProperties(
  properties: WebVitalEventProperties,
): WebVitalAnalyticsProperties {
  const { metric_name: metricCode, ...safeProperties } = properties;
  return { metric_code: metricCode, ...safeProperties };
}
