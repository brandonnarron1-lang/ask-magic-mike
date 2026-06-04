import { z } from "zod";

/**
 * Public-safe listing fields. The set of columns we are willing to send
 * outside the admin cockpit and feed into marketing generation.
 *
 * `PrivateListing` carries the MLS-confidential remarks + lockbox / agent
 * notes. NEVER expose these via a public API or pass them to a marketing
 * generator. The sanitizer guarantees the split.
 */
export const PublicListingSchema = z.object({
  id: z.string().uuid(),
  mls_number: z.string().nullable(),
  status: z.enum([
    "coming_soon",
    "active",
    "pending",
    "contingent",
    "closed",
    "withdrawn",
    "expired",
  ]),
  address_line1: z.string().nullable(),
  address_line2: z.string().nullable(),
  city:   z.string().nullable(),
  county: z.string().nullable(),
  state:  z.string().length(2).default("NC"),
  zip:    z.string().nullable(),
  list_price: z.number().nullable(),
  beds:       z.number().int().nullable(),
  baths_full: z.number().int().nullable(),
  baths_half: z.number().int().nullable(),
  sqft:       z.number().int().nullable(),
  acres:      z.number().nullable(),
  year_built: z.number().int().nullable(),
  property_type: z.string().nullable(),
  public_remarks: z.string().nullable(),
  directions:     z.string().nullable(),
  list_office:    z.string().nullable(),
  dom:  z.number().int().nullable(),
  cdom: z.number().int().nullable(),
  taxes: z.number().nullable(),
});
export type PublicListing = z.infer<typeof PublicListingSchema>;

export const PrivateListingFieldsSchema = z.object({
  listing_id: z.string().uuid(),
  agent_remarks:        z.string().nullable(),
  lockbox_info:         z.string().nullable(),
  showing_instructions: z.string().nullable(),
  compensation:         z.string().nullable(),
  owner_notes:          z.string().nullable(),
  internal_notes:       z.string().nullable(),
  raw_payload:          z.record(z.unknown()).nullable().optional(),
});
export type PrivateListingFields = z.infer<typeof PrivateListingFieldsSchema>;

/** Full listing as we see it inside admin (everything together). */
export interface AdminListing {
  public: PublicListing;
  private: PrivateListingFields;
}
