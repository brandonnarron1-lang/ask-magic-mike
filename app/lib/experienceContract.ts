import contract from "../../config/experience-contract.v1.json";

/** Public, bundled, versioned facts only. No remote config dependency or identity. */
export const experienceContract = contract;
export type ExperienceContract = typeof contract;
export type ExperienceOfferKey = keyof ExperienceContract["offers"];

export function experienceDestination(key: ExperienceOfferKey) {
  return experienceContract.offers[key].destination;
}

/** Website utilities, not a change to the immutable v1 API consumed by old clients.
 * Offer destinations continue to come exclusively from the accepted contract. */
export const publicNavigation = {
  browseHomes: { label: "Browse Homes", destination: "https://www.ourtownproperties.com/property-search/" },
  staff: { label: "Agent & Broker Sign In", destination: "/lead-center-login?returnTo=%2Fadmin%2Ftoday" },
} as const;
