import { normalizeBuyerInterest, type BuyerInterestV1 } from "./buyerInterest";
import { isSafeListingReference } from "./client/publicIntakeReview";

export type GuestInterest = { id: string; label: string; declared: BuyerInterestV1; provenance: "user_reported_unverified" };
export const MAX_GUEST_INTERESTS = 8;

/** Reuse canonical validation. No URL fetching, enrichment or inferred facts. */
export function guestInterest(input: { kind: "property" | "search"; value: string; budget: string }, id: string): GuestInterest {
  const value = input.value.trim();
  if (!value || value.length > 500 || Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error("Add a plain-text reference or search area, within 500 characters.");
  if (input.budget.length > 160) throw new Error("Keep the budget within 160 characters.");
  const isUrl = /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//");
  if (input.kind === "property" && isUrl && !isSafeListingReference(value)) throw new Error("Use an http or https listing link without sign-in details, or enter an address.");
  const declared = normalizeBuyerInterest(input.kind === "search"
    ? { version: 1, kind: "search", desired_area: value, ...(input.budget.trim() ? { budget_range: input.budget.trim() } : {}) }
    : { version: 1, kind: "specific", properties: [isUrl ? { listing_url: value } : { address_text: value }] });
  return { id, label: value, declared, provenance: "user_reported_unverified" };
}
