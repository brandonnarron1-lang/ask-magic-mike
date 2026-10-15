import { addressFromForm, type AddressValue } from "./address/addressValue";
import { isValidLeadEmail, isValidLeadPhone } from "./leadContactValidation";

export const SELLER_OPTIONS = {
  "as-is": "Consider an as-is/direct-purchase option.",
  compare: "Compare listing with an as-is option.",
  guidance: "Get general selling guidance.",
} as const;
export type SellerOption = keyof typeof SELLER_OPTIONS;
export function sellerOption(value: unknown): SellerOption | null {
  return typeof value === "string" && Object.hasOwn(SELLER_OPTIONS, value) ? value as SellerOption : null;
}
export type SellerOptionsReview = {
  option: SellerOption; address: AddressValue; name: string; email: string; phone: string;
  condition: string; timeline: string; context: string; consent: boolean; website: string;
};
export class SellerOptionsInputError extends Error {
  constructor(readonly field: string, message: string) { super(message); }
}
export function readSellerOptionsForm(form: HTMLFormElement, previous: AddressValue | null): SellerOptionsReview {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? "").trim();
  const option = sellerOption(text("seller-option"));
  if (!option) throw new SellerOptionsInputError("seller-option", "Choose the selling guidance you would like.");
  const name = text("seller-name"), email = text("seller-email"), phone = text("seller-phone");
  if (name.length < 2 || name.length > 160) throw new SellerOptionsInputError("seller-name", "Enter your name so Our Town Properties can review this request.");
  if (!email && !phone) throw new SellerOptionsInputError("seller-email", "Add an email or phone number so Mike can follow up.");
  if (email && !isValidLeadEmail(email)) throw new SellerOptionsInputError("seller-email", "Enter a valid email address.");
  if (phone && !isValidLeadPhone(phone)) throw new SellerOptionsInputError("seller-phone", "Enter a valid phone number.");
  return { option, address: addressFromForm(form, previous), name, email, phone, condition: text("condition"),
    timeline: text("seller-timeline"), context: text("seller-context"), consent: data.get("consent") === "yes", website: text("website") };
}
/** Human-readable request context in existing typed fields, not a JSON payload in notes. */
export function sellerOptionsQuestion(review: SellerOptionsReview): string {
  return [`Seller option requested: ${SELLER_OPTIONS[review.option]}`,
    review.condition ? `Reported condition: ${review.condition}` : "", review.context].filter(Boolean).join("\n");
}
export const sellerOptionsFingerprint = (review: SellerOptionsReview) => JSON.stringify(review);
