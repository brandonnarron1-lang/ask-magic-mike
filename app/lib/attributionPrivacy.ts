import { safeAnalyticsPath, safeRegisteredPublicAnalyticsDimension } from "../../src/lib/analytics/privacy";

// Public page classes only, not inventory, people, account or arbitrary paths.
// Keep the loader's smaller cross-domain projection in parity tests below.
export const OWNED_ATTRIBUTION_ORIGINS = ["https://www.askmagicmike.com", "https://askmagicmike.com", "https://www.ourtownproperties.com", "https://ourtownproperties.com"] as const;
export const WORDPRESS_ATTRIBUTION_PATHS = ["/", "/home-value/", "/how-much-is-your-home-worth/", "/ask-mike/", "/ask-magic-mike/", "/property-search/", "/we-buy-homes/", "/we-buy-houses/", "/rentals/"] as const;
const CONTENT = new Set([
  "wordpress_home_value_page", "wordpress_homepage_ask_mike", "wordpress_we_buy_homes", "wordpress_we_buy_houses", "wordpress_listing_buyer", "wordpress_rental_to_homeownership", "wordpress_homepage_cta", "wordpress_ask_mike_page",
  "facebook_local_question_seller_review", "sitewide-floating", "owned-seller-buyer-launch", "full_form_fallback", "seller_plan", "buyer_plan", "annual_review", "relocation_plan",
  ...["seller", "buyer"].flatMap(a => ["facebook", "instagram", "owned_site", "qr"].map(c => `${a}_${c}`)),
]);
const EXTRA: Record<string, readonly string[]> = { source: ["widget", "external", "home_value_page", "seller_page", "buyer_page", "renter_page", "ask_page", "open_house", "homepage"], medium: ["embed"], campaign: ["sitewide-widget", "parent-site-widget", "full_form_fallback", "amm_seller_buyer_launch_2026"] };

/** Exact registered values, never truncation of attacker-controlled text into a valid code. */
export function publicAttributionCode(key: string, value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 120) return undefined;
  const code = value.trim().toLowerCase();
  if (key === "content") return CONTENT.has(code) ? code : undefined;
  if (key === "term") return undefined; // no reviewed free-text keyword vocabulary
  if (key === "placement" || key === "placement_id") return CONTENT.has(code) ? code : safeRegisteredPublicAnalyticsDimension(key, code) ?? undefined;
  if (key === "source" || key === "medium" || key === "campaign") return EXTRA[key]?.includes(code) ? code : safeRegisteredPublicAnalyticsDimension(`utm_${key}`, code) ?? undefined;
  return undefined;
}

/** Query/fragment/userinfo are never retained, even for an approved page. */
export function publicAttributionUrl(value: unknown, pathOnly = false): string | undefined {
  if (typeof value !== "string" || value.length > 4096 || value.includes("\\") || Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return undefined;
  const raw = value.trim();
  if (!raw || raw.startsWith("//")) return undefined;
  let url: URL;
  try { url = new URL(raw, "https://www.askmagicmike.com"); } catch { return undefined; }
  if (!(OWNED_ATTRIBUTION_ORIGINS as readonly string[]).includes(url.origin)) return undefined;
  const wordpress = url.hostname.endsWith("ourtownproperties.com");
  const safePath = wordpress ? (WORDPRESS_ATTRIBUTION_PATHS as readonly string[]).find(path => path.replace(/\/$/, "") === url.pathname.replace(/\/$/, "")) : safeAnalyticsPath(url.pathname);
  // The analytics wildcard is a class, not a usable path or an identifier.
  if (!safePath || safePath.includes("[")) return undefined;
  return pathOnly || raw.startsWith("/") ? safePath : `${url.origin}${safePath}`;
}

export function publicAttributionHost(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return OWNED_ATTRIBUTION_ORIGINS.map(origin => new URL(origin).hostname).find(host => host === value);
}

/** No arbitrary title, click id, property/person identifier or nested object crosses this boundary. */
export function publicAttributionSnapshot(input: unknown): Record<string, string | undefined> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const result: Record<string, string | undefined> = {};
  for (const key of ["source", "medium", "campaign", "content", "term", "placement", "placement_id"]) result[key] = publicAttributionCode(key, raw[key]);
  for (const key of ["referrer", "landing_page", "parent_url"]) result[key] = publicAttributionUrl(raw[key]);
  for (const key of ["initial_path", "current_path"]) result[key] = publicAttributionUrl(raw[key], true);
  result.embed_host = publicAttributionHost(raw.embed_host);
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
}
