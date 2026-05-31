import { z } from "zod";

export const PropertySchema = z.object({
  addressLine1: z.string().min(1).max(300),
  addressLine2: z.string().max(300).nullable().default(null),
  city: z.string().min(1).max(200),
  state: z.string().length(2).default("FL"),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  county: z.string().max(200).nullable().default(null),
  beds: z.number().int().min(0).max(50).nullable().default(null),
  baths: z.number().min(0).max(50).nullable().default(null),
  sqft: z.number().int().min(0).nullable().default(null),
  yearBuilt: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 1)
    .nullable()
    .default(null),
  propertyType: z
    .enum([
      "single_family",
      "condo",
      "townhouse",
      "multi_family",
      "land",
      "commercial",
      "other",
    ])
    .nullable()
    .default(null),
  leadId: z.string().uuid().nullable().default(null),
});

export const ValuationRequestSchema = z.object({
  leadId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  addressRaw: z.string().max(500).optional(),
});

export type PropertyInput = z.infer<typeof PropertySchema>;
export type ValuationRequestInput = z.infer<typeof ValuationRequestSchema>;
