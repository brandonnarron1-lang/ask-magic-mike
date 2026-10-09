/** Display-only labels. Never change stored attribution, consent or lead text. */
export function leadSourceLabel(value?: string | null) {
  const labels: Record<string, string> = {
    ourtownproperties: "Our Town Properties website",
    home_value_page: "Home Value page",
    wordpress_home_value_page: "Our Town Home Value page",
    wordpress_rental_to_homeownership: "Our Town Rentals page",
    renter_page: "Rental-to-homeownership page",
    buyer_page: "Buyer page",
    seller_page: "Seller page",
    ask_page: "Ask Mike page",
    home_value: "Home Value",
    widget: "Ask Magic Mike widget",
    open_house: "Open house",
    internal_qa: "Internal QA",
  };
  return (value || "").split(" / ").map(part => labels[part] || part.replaceAll("_", " ")).join(" / ") || "Source not recorded";
}

export function leadRequestLabel(funnel?: string | null) {
  const labels: Record<string, string> = { seller: "Home value request", home_value: "Home value request", buyer: "Buying a home", renter: "Rental-to-homeownership plan", open_house: "Open house inquiry", ask: "Real estate question", cash_seller: "Cash offer review", investor_buyer: "Investment inquiry" };
  return labels[funnel || ""] || "Real estate inquiry";
}

export function leadPageHeading(name?: string | null, isTest = false) {
  return isTest ? "Test lead" : name?.trim().replace(/[\r\n]+/g, " ").slice(0, 80) || "Lead details";
}

export function leadTimelineLabel(value?: string | number | null) {
  const labels: Record<string, string> = {
    "0": "Immediate / within 30 days", "3": "Within 90 days", "6": "Within six months",
    "12": "Within a year", "24": "Over a year / unsure",
  };
  return value === null || value === undefined || value === "" ? "Timeline not recorded" : labels[String(value)] || String(value);
}

/** Recognize only the legacy server-appended JSON envelope. Unrecognized
 * consumer text remains verbatim. Original text remains available for audit. */
export function leadQuestionForDisplay(value?: string | null) {
  if (!value) return "";
  const marker = "\nAttribution: ";
  const index = value.lastIndexOf(marker);
  if (index < 0) return value;
  const suffix = value.slice(index + marker.length);
  const split = suffix.split(/;?\s*Consent: /);
  try {
    const attribution = JSON.parse(split[0]);
    if (!attribution || typeof attribution !== "object" || Array.isArray(attribution) ||
      !["source", "medium", "campaign", "first_touch", "last_touch", "landing_page"].some(key => key in attribution)) return value;
    if (split.length > 2) return value;
    if (split.length === 2) {
      const consent = JSON.parse(split[1]);
      if (!consent || typeof consent !== "object" || Array.isArray(consent)) return value;
    }
    return value.slice(0, index).trim();
  } catch { return value; }
}

export function leadReceivedLabel(value: string | null) {
  if (!value) return "Receipt time not recorded";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(date)
    : "Receipt time not recorded";
}
