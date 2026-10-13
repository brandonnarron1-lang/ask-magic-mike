/** Public tracking only. Never carry parent URLs, listing facts, agents or contacts into a fallback URL. */
export function widgetFullFormQuery(search: string): string {
  const source = new URLSearchParams(search);
  const output = new URLSearchParams();
  const fields: Record<string, string> = {
    utm_source: source.get("utm_source") || source.get("source") || "widget",
    utm_medium: source.get("utm_medium") || source.get("medium") || "embed",
    utm_campaign: source.get("utm_campaign") || source.get("campaign") || "full_form_fallback",
    utm_content: source.get("utm_content") || source.get("placement") || "full_form_fallback",
  };
  const allowed: Record<string, readonly string[]> = {
    utm_source: ["ourtownproperties", "widget", "facebook", "instagram", "qr", "external"],
    utm_medium: ["owned_media", "embed", "referral", "organic_social", "print", "website"],
    utm_campaign: ["amm_owned_demand_2026", "amm_seller_buyer_launch_2026", "website_widget", "sitewide-widget", "full_form_fallback"],
    utm_content: ["wordpress_home_value_page", "wordpress_listing_buyer", "wordpress_rental_to_homeownership", "sitewide-floating", "owned-seller-buyer-launch", "full_form_fallback", ...["seller", "buyer"].flatMap(audience => ["facebook", "instagram", "owned_site", "qr"].map(channel => `${audience}_${channel}`))],
  };
  for (const [key, raw] of Object.entries(fields)) {
    // Exact public campaign/placement codes only. A phone/name-like UTM is not
    // made public merely because its characters happen to be URL-safe.
    if (allowed[key].includes(raw)) output.set(key, raw);
  }
  return output.toString();
}
