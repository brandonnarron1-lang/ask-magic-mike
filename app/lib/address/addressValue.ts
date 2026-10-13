/** User-entered/confirmed request data, never independent postal/property proof.
 * Provider content requires its own approved use/retention boundary. */
export type AddressComponents = {
  line1: string; line2: string; locality: string; region: string;
  postalCode: string; country: string;
};
export type AddressValue = {
  version: 1;
  enteredText: string;
  acceptedText: string;
  components: AddressComponents;
  confirmation: "manual" | "user_confirmed_suggestion" | "user_edited";
  validation: "not_performed";
  reportedProvider?: "google_places_new";
  reportedPlaceId?: string;
};
export type AddressSuggestion = { id: string; label: string; secondary: string; token: string };
export type AddressResolvedSuggestion = { id: string; components: AddressComponents; label: string };
export type AddressSuggestionsResult =
  | { state: "results"; suggestions: AddressSuggestion[] }
  | { state: "no_results" | "unavailable" | "rate_limited"; suggestions?: never };

export const EMPTY_ADDRESS_COMPONENTS: AddressComponents = {
  line1: "", line2: "", locality: "", region: "", postalCode: "", country: "",
};
export class MissingAddressStreetError extends Error {
  constructor() { super("missing_address_street"); this.name = "MissingAddressStreetError"; }
}
const LIMITS: Record<keyof AddressComponents, number> = {
  line1: 200, line2: 100, locality: 100, region: 80, postalCode: 24, country: 2,
};
const keys = Object.keys(LIMITS) as Array<keyof AddressComponents>;
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
function bounded(value: unknown, maximum: number, trim = true): string {
  if (typeof value !== "string" || value.length > maximum || Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
  })) {
    throw new Error("invalid_address_value");
  }
  return trim ? value.trim() : value;
}

/** No geocoder, guessed locality, inferred ZIP or address verification. */
export function formatAddress(components: AddressComponents, fallback = ""): string {
  if (!components.line1.trim()) return fallback.trim();
  return [components.line1.trim(), components.line2.trim(), components.locality.trim(),
    [components.region.trim(), components.postalCode.trim()].filter(Boolean).join(" "),
    components.country.trim() && components.country !== "US" ? components.country.trim() : ""]
    .filter(Boolean).join(", ");
}

export function normalizeAddressValue(value: unknown): AddressValue {
  if (!record(value) || value.version !== 1 || !record(value.components)) throw new Error("invalid_address_value");
  const permitted = new Set(["version", "enteredText", "acceptedText", "components", "confirmation", "validation", "reportedProvider", "reportedPlaceId"]);
  if (Object.keys(value).some(key => !permitted.has(key)) || Object.keys(value.components).some(key => !keys.includes(key as keyof AddressComponents))) throw new Error("invalid_address_value");
  const rawComponents = value.components;
  const components = Object.fromEntries(keys.map(key => [key, bounded(rawComponents[key], LIMITS[key])])) as AddressComponents;
  if (components.country && !/^[A-Z]{2}$/.test(components.country)) throw new Error("invalid_address_value");
  const enteredText = bounded(value.enteredText, 500, false);
  const acceptedText = bounded(value.acceptedText, 500);
  if (enteredText.trim().length < 5 || acceptedText.length < 5 || formatAddress(components, acceptedText) !== acceptedText) throw new Error("invalid_address_value");
  if (!["manual", "user_confirmed_suggestion", "user_edited"].includes(String(value.confirmation))) throw new Error("invalid_address_value");
  // A browser flag or a Places selection can never manufacture validation.
  const result: AddressValue = { version: 1, enteredText, acceptedText, components,
    confirmation: value.confirmation as AddressValue["confirmation"], validation: "not_performed" };
  if (value.reportedProvider !== undefined && value.reportedProvider !== "google_places_new") throw new Error("invalid_address_value");
  if (value.reportedPlaceId !== undefined && (typeof value.reportedPlaceId !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(value.reportedPlaceId))) throw new Error("invalid_address_value");
  if (result.confirmation === "user_confirmed_suggestion" && value.reportedProvider === "google_places_new") {
    result.reportedProvider = "google_places_new";
    if (typeof value.reportedPlaceId === "string") result.reportedPlaceId = value.reportedPlaceId;
  }
  return result;
}

export function addressFromForm(form: HTMLFormElement, previous?: AddressValue | null): AddressValue {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? "");
  const entered = text("address");
  let components: AddressComponents = {
    line1: text("address_line1"), line2: text("address_line2"), locality: text("address_city"),
    region: text("address_region"), postalCode: text("address_postal"), country: text("address_country"),
  };
  if (previous && entered !== previous.acceptedText && keys.every(key => previous.components[key] === components[key].trim())) {
    // A native edit cannot be overwritten by unchanged old selection fields.
    components = { ...EMPTY_ADDRESS_COMPONENTS };
  }
  const accepted = formatAddress(components, entered);
  const same = previous && previous.acceptedText === accepted && keys.every(key => previous.components[key] === components[key].trim());
  // Editing structured fields must not erase the original typed representation.
  const original = previous && entered === previous.acceptedText ? previous.enteredText : entered || accepted;
  if (!components.line1.trim() && keys.some(key => key !== "country" && components[key].trim())) throw new MissingAddressStreetError();
  return normalizeAddressValue({ version: 1, enteredText: same ? previous.enteredText : original,
    acceptedText: accepted, components, confirmation: same ? previous.confirmation : previous ? "user_edited" : "manual",
    validation: "not_performed", ...(same ? { reportedProvider: previous.reportedProvider, reportedPlaceId: previous.reportedPlaceId } : {}) });
}

export function contactReviewFingerprint(values: { address: string; name: string; email: string; phone: string; timeline: string; consent: boolean }): string {
  // In-memory comparison only; never a public hash, telemetry or storage record.
  return JSON.stringify([values.address.trim(), values.name.trim(), values.email.trim(), values.phone.trim(), values.timeline, values.consent]);
}
