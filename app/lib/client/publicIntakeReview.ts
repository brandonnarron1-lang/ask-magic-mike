import { normalizeBuyerInterest, type BuyerInterestV1 } from "../buyerInterest";
import { isValidLeadEmail, isValidLeadPhone } from "../leadContactValidation";

export type BuyerFormSnapshot = {
  name: string; email: string; phone: string; consent: boolean;
  timeline: string; question: string; website: string;
  area: string; financing: string; preapproval: boolean;
  buyerInterest?: BuyerInterestV1;
};
export class IntakeReviewError extends Error {
  constructor(public readonly field: string, message: string) { super(message); }
}

function text(data: FormData, field: string, max: number) {
  const value = data.get(field);
  if (value !== null && typeof value !== "string") throw new IntakeReviewError(field, "Review this field before continuing.");
  const trimmed = (value || "").trim();
  if (trimmed.length > max) throw new IntakeReviewError(field, `Keep this entry within ${max} characters.`);
  return trimmed;
}

/** A reference only: never fetched, followed, or described as a verified listing. */
export function isSafeListingReference(value: string) {
  if (!/^https?:\/\//i.test(value) || value.length > 2048 || /[\s\\]/.test(value) ||
    Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

/** Read the native form at review AND confirmation, including eventless autofill. */
export function readBuyerForm(data: FormData, preset: "buyer" | "renter" | "open_house", kind: "specific" | "search"): BuyerFormSnapshot {
  const email = text(data, "buyer-email", 254);
  const phone = text(data, "buyer-phone", 40);
  if (!email && !phone) throw new IntakeReviewError("buyer-email", "Add an email or phone number so Mike can follow up.");
  if (email && !isValidLeadEmail(email)) throw new IntakeReviewError("buyer-email", "Enter a valid email address.");
  if (phone && !isValidLeadPhone(phone)) throw new IntakeReviewError("buyer-phone", "Enter a phone number with area code.");
  const name = text(data, "buyer-name", 160);
  if (preset === "buyer" && name.length < 2) throw new IntakeReviewError("buyer-name", "Enter your name so Mike knows who requested the review.");
  let buyerInterest: BuyerInterestV1 | undefined;
  if (preset === "buyer" && kind === "specific") {
    const address_text = text(data, "buyer-address", 500);
    const listing_url = text(data, "buyer-listing-url", 2048);
    const unit = text(data, "buyer-unit", 100);
    const reference = text(data, "buyer-reference", 160);
    if (!address_text && !listing_url) throw new IntakeReviewError("buyer-address", "Add the property's address or a listing URL.");
    if (listing_url && !isSafeListingReference(listing_url)) throw new IntakeReviewError("buyer-listing-url", "Use a complete http or https listing URL without sign-in details.");
    buyerInterest = { version: 1, kind: "specific", properties: [{
      ...(address_text ? { address_text } : {}), ...(listing_url ? { listing_url } : {}),
      ...(unit ? { unit } : {}), ...(reference ? { reference } : {}),
    }] };
  } else if (preset === "buyer") {
    const desired_area = text(data, "buyer-desired-area", 500);
    const budget_range = text(data, "buyer-budget", 160);
    if (!desired_area) throw new IntakeReviewError("buyer-desired-area", "Add the area where you would like to buy.");
    buyerInterest = { version: 1, kind: "search", desired_area, ...(budget_range ? { budget_range } : {}) };
  }
  if (buyerInterest) {
    try { buyerInterest = normalizeBuyerInterest(buyerInterest); }
    catch { throw new IntakeReviewError(kind === "specific" ? "buyer-address" : "buyer-desired-area", "Review your buying interest. Use plain text without control characters."); }
  }
  return {
    name, email, phone, consent: data.get("consent") === "yes",
    timeline: text(data, "buyer-timeline", 160), question: text(data, "buyer-question", 2000),
    website: text(data, "website", 500), area: text(data, "buyer-area", 500),
    financing: text(data, "buyer-financing", 160), preapproval: data.has("buyer-preapproval"),
    ...(buyerInterest ? { buyerInterest } : {}),
  };
}

/** In-memory comparison only; never analytics, storage, or a receipt. */
export function buyerReviewFingerprint(snapshot: BuyerFormSnapshot) { return JSON.stringify(snapshot); }

export function buyerHasQaMarkers(snapshot: BuyerFormSnapshot) {
  // Match existing canonical name/question markers. A listing reference or
  // desired area must not invent a different server-side QA classification.
  const marker = `${snapshot.name} ${snapshot.question}`.toUpperCase();
  return marker.includes("INTERNAL QA") && marker.includes("DO NOT CONTACT");
}
