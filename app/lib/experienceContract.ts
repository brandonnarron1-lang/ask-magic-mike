import contract from "../../config/experience-contract.v1.json";

/** Public, bundled, versioned facts only. No remote config dependency or identity. */
export const experienceContract = contract;
export type ExperienceContract = typeof contract;
export type ExperienceOfferKey = keyof ExperienceContract["offers"];

export function experienceDestination(key: ExperienceOfferKey) {
  return experienceContract.offers[key].destination;
}
