import { z } from "zod";

export const E164PhoneRegex = /^\+[1-9]\d{1,14}$/;

export const SubmitIntakeSchema = z.object({
  sessionId: z.string().uuid(),
  firstName: z.string().min(1).max(100).nullable().default(null),
  lastName: z.string().min(1).max(100).nullable().default(null),
  email: z.string().email().nullable().default(null),
  phone: z
    .string()
    .regex(E164PhoneRegex, "Must be E.164 format (e.g. +12525551234)")
    .nullable()
    .default(null),
  addressRaw: z.string().max(500).nullable().default(null),
  addressLine1: z.string().max(300).nullable().default(null),
  addressLine2: z.string().max(300).nullable().default(null),
  city: z.string().max(200).nullable().default(null),
  state: z.string().length(2).default("FL"),
  zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/)
    .nullable()
    .default(null),
  primaryIntent: z
    .enum(["sell", "buy", "both", "unknown"])
    .default("unknown"),
  questionRaw: z.string().max(2000).nullable().default(null),
  timelineMonths: z
    .union([
      z.literal(0),
      z.literal(3),
      z.literal(6),
      z.literal(12),
      z.literal(24),
    ])
    .nullable()
    .default(null),
  consentSms: z.boolean().default(false),
  consentCall: z.boolean().default(false),
  consentEmail: z.boolean().default(false),
  consentIp: z.string().ip().nullable().default(null),
  ctaChipUsed: z
    .enum([
      "home_worth",
      "should_sell_now",
      "tour_home",
      "what_can_afford",
      "talk_to_mike",
    ])
    .nullable()
    .default(null),
});

export type SubmitIntakeInput = z.infer<typeof SubmitIntakeSchema>;

export const IntakeStepSchema = z.object({
  sessionId: z.string().uuid(),
  step: z.number().int().min(1).max(5),
  data: z.record(z.unknown()),
});

export type IntakeStepInput = z.infer<typeof IntakeStepSchema>;
