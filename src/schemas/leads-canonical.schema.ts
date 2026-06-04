/**
 * Canonical `POST /api/leads` validator.
 *
 * Accepts payloads from every public source (Ask Magic Mike landing,
 * We Buy Houses, widget, listing pages, manual admin, ad-form webhook).
 * Keeps the surface small — most fields are optional so the various
 * sources can supply what they have. The route normalizes + enriches.
 */
import { z } from "zod";
import { LEAD_TYPES, LEAD_SOURCES, TIMELINE_BUCKETS, PROPERTY_CONDITIONS, OCCUPANCY_STATUSES } from "@/lib/leads/lead-types";

const optionalString = z.string().trim().max(2000).nullable().optional();

export const ConsentInputSchema = z.object({
  sms:   z.boolean().optional().default(false),
  email: z.boolean().optional().default(false),
  call:  z.boolean().optional().default(false),
  /** Verbatim consent language shown to the user. */
  language: z.string().max(5000).optional(),
  /** Source can set a client-supplied timestamp; server normalizes. */
  timestamp: z.string().optional(),
});

export const CreateLeadCanonicalSchema = z.object({
  // Identity
  name:       optionalString,
  first_name: optionalString,
  last_name:  optionalString,
  email:      z.string().email().nullable().optional(),
  phone:      optionalString,

  // Classification
  lead_type:  z.enum(LEAD_TYPES).default("unknown"),
  source:     z.enum(LEAD_SOURCES).default("other"),
  source_detail: optionalString,
  page_url:    optionalString,
  widget_session_id: optionalString,
  listing_id:  z.string().uuid().nullable().optional(),

  // Property / interest context
  property_address: optionalString,
  city:    optionalString,
  county:  optionalString,
  state:   z.string().length(2).optional(),
  zip:     z
    .string()
    .regex(/^\d{5}(-\d{4})?$/)
    .nullable()
    .optional(),

  intent:  optionalString,
  timeline: z.enum(TIMELINE_BUCKETS).optional(),
  urgency:  z.enum(["low", "medium", "high", "critical"]).optional(),

  // Buyer-specific
  budget_min: z.number().int().nonnegative().nullable().optional(),
  budget_max: z.number().int().nonnegative().nullable().optional(),
  preapproval_status: z.enum(["preapproved", "in_progress", "not_started", "unknown"]).optional(),
  home_to_sell: z.boolean().nullable().optional(),

  // Seller-specific
  seller_motivation:  optionalString,
  property_condition: z.enum(PROPERTY_CONDITIONS).optional(),
  occupancy_status:   z.enum(OCCUPANCY_STATUSES).optional(),
  asking_price:       z.number().int().nonnegative().nullable().optional(),
  mortgage_payoff:    z.number().int().nonnegative().nullable().optional(),

  // Contact preferences
  preferred_contact_method: z.enum(["sms", "call", "email", "any"]).optional(),
  best_contact_time:        optionalString,

  // Attribution
  utm_source:   optionalString,
  utm_medium:   optionalString,
  utm_campaign: optionalString,
  utm_term:     optionalString,
  utm_content:  optionalString,
  referrer:     optionalString,
  landing_page: optionalString,
  gclid:        optionalString,
  fbclid:       optionalString,

  // Consent
  consent: ConsentInputSchema.optional(),

  // Bot/spam signals (optional client-supplied)
  honeypot:           optionalString,
  form_started_at_ms: z.number().int().nonnegative().nullable().optional(),

  // Misc passthrough
  notes:    optionalString,
  metadata: z.record(z.unknown()).optional(),
});

export type CreateLeadCanonicalInput = z.infer<typeof CreateLeadCanonicalSchema>;
