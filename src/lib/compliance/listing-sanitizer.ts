/**
 * Listing sanitizer — public/private field separation.
 *
 * This is the **only** function allowed to feed marketing generation.
 * If a marketing function ever receives a raw listing row, that's a
 * compliance leak. Tests assert no marketing pipeline accepts the
 * internal fields.
 */
import type {
  AdminListing,
  PublicListing,
  PrivateListingFields,
} from "@/schemas/listing.schema";

/** Field names that must NEVER appear in public output. */
export const PRIVATE_FIELD_NAMES = [
  "agent_remarks",
  "lockbox_info",
  "showing_instructions",
  "compensation",
  "owner_notes",
  "internal_notes",
  "raw_payload",
] as const;
export type PrivateFieldName = (typeof PRIVATE_FIELD_NAMES)[number];

/** Field names allowed in public output (whitelist). */
export const PUBLIC_FIELD_NAMES = [
  "id",
  "mls_number",
  "status",
  "address_line1",
  "address_line2",
  "city",
  "county",
  "state",
  "zip",
  "list_price",
  "beds",
  "baths_full",
  "baths_half",
  "sqft",
  "acres",
  "year_built",
  "property_type",
  "public_remarks",
  "directions",
  "list_office",
  "dom",
  "cdom",
  "taxes",
] as const;
export type PublicFieldName = (typeof PUBLIC_FIELD_NAMES)[number];

/**
 * Strip a raw listing payload (from CSV / FlexMLS / DB join) into the
 * public + private split. Anything not on the public whitelist is dropped
 * from the public side. Anything on the private list is captured in the
 * private bag.
 */
export function splitListing(input: Record<string, unknown>): AdminListing {
  const pub: Record<string, unknown> = {};
  for (const k of PUBLIC_FIELD_NAMES) {
    pub[k] = input[k] ?? null;
  }
  const priv: Record<string, unknown> = { listing_id: input.id ?? null };
  for (const k of PRIVATE_FIELD_NAMES) {
    priv[k] = input[k] ?? null;
  }
  return {
    public: pub as unknown as PublicListing,
    private: priv as unknown as PrivateListingFields,
  };
}

/**
 * Defensive sanitizer for the marketing pipeline. Returns ONLY public
 * fields and throws if any private field is detected on the input.
 *
 * Callers should pass the result to AI/template generation.
 */
export function sanitizeForMarketing(
  candidate: Record<string, unknown>
): PublicListing {
  // 1) Refuse to operate on objects that carry private keys.
  const leak = PRIVATE_FIELD_NAMES.find(
    (k) => candidate[k] !== undefined && candidate[k] !== null
  );
  if (leak) {
    throw new Error(
      `[listing-sanitizer] refusing to generate marketing — private field "${leak}" present`
    );
  }
  // 2) Project onto the public whitelist.
  const out: Record<string, unknown> = {};
  for (const k of PUBLIC_FIELD_NAMES) {
    out[k] = candidate[k] ?? null;
  }
  return out as unknown as PublicListing;
}
