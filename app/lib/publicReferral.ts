export type PublicReferralSurface = "homepage";

export type PublicReferralPacket = {
  title: string;
  text: string;
  url: string;
};

const CANONICAL_REFERRAL_DESTINATION = "https://www.askmagicmike.com/ask";
const REFERRAL_CAMPAIGN = "amm_owned_demand_2026";

const SURFACE_CONTENT: Record<PublicReferralSurface, string> = {
  homepage: "homepage_referral_share",
};

/**
 * Builds a generic, identity-safe referral packet from a closed surface
 * registry. It never includes the visitor's URL, form answers, plan, session,
 * contact details, or other browser state.
 */
export function buildPublicReferralPacket(
  surface: PublicReferralSurface,
): PublicReferralPacket {
  const content = SURFACE_CONTENT[surface];
  if (!content) throw new Error("Unsupported public referral surface.");

  const url = new URL(CANONICAL_REFERRAL_DESTINATION);
  url.search = new URLSearchParams({
    utm_source: "consumer_share",
    utm_medium: "referral",
    utm_campaign: REFERRAL_CAMPAIGN,
    utm_content: content,
  }).toString();

  return {
    title: "Ask Magic Mike | Our Town Properties",
    text: "Have a Wilson-area real estate question? Ask Mike for local guidance from Our Town Properties.",
    url: url.toString(),
  };
}
