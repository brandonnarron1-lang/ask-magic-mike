/** Submitted interests, not verified listings or the buyer's residential address. */
export type BuyerInterestV1 =
  | {
      version: 1;
      kind: "specific";
      properties: Array<{
        address_text?: string;
        unit?: string;
        listing_url?: string;
        reference?: string;
      }>;
    }
  | {
      version: 1;
      kind: "search";
      desired_area: string;
      budget_range?: string;
    };

function invalid(): never {
  throw new Error("invalid_buyer_interest");
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function exactKeys(value: Record<string, unknown>, permitted: string[]) {
  if (Object.keys(value).some(key => !permitted.includes(key))) invalid();
}

function optionalText(value: unknown, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum || Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) invalid();
  return value.trim() || undefined;
}

function listingUrl(value: unknown): string | undefined {
  const text = optionalText(value, 2_048);
  if (!text) return undefined;
  // Store only an untrusted reference. Never fetch, scrape or verify this URL.
  if (!/^https?:\/\//i.test(text) || /[\s\\]/.test(text)) invalid();
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) invalid();
  } catch {
    invalid();
  }
  return text;
}

export function normalizeBuyerInterest(value: unknown): BuyerInterestV1 {
  if (!record(value) || value.version !== 1) invalid();
  if (value.kind === "specific") {
    exactKeys(value, ["version", "kind", "properties"]);
    if (!Array.isArray(value.properties) || value.properties.length < 1 || value.properties.length > 3) invalid();
    const properties = Array.from(value.properties, property => {
      if (!record(property)) invalid();
      exactKeys(property, ["address_text", "unit", "listing_url", "reference"]);
      const address_text = optionalText(property.address_text, 500);
      const unit = optionalText(property.unit, 100);
      const listing_url = listingUrl(property.listing_url);
      const reference = optionalText(property.reference, 160);
      if (!address_text && !listing_url) invalid();
      return {
        ...(address_text !== undefined ? { address_text } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(listing_url !== undefined ? { listing_url } : {}),
        ...(reference !== undefined ? { reference } : {}),
      };
    });
    return { version: 1, kind: "specific", properties };
  }
  if (value.kind === "search") {
    exactKeys(value, ["version", "kind", "desired_area", "budget_range"]);
    const desired_area = optionalText(value.desired_area, 500);
    const budget_range = optionalText(value.budget_range, 160);
    if (!desired_area) invalid();
    return { version: 1, kind: "search", desired_area, ...(budget_range !== undefined ? { budget_range } : {}) };
  }
  return invalid();
}
