import { z } from "zod";

export const CreateSessionSchema = z.object({
  utmSource: z.string().max(200).nullable().default(null),
  utmMedium: z.string().max(200).nullable().default(null),
  utmCampaign: z.string().max(200).nullable().default(null),
  utmContent: z.string().max(200).nullable().default(null),
  utmTerm: z.string().max(200).nullable().default(null),
  referrerUrl: z.string().url().nullable().default(null),
  referrerType: z
    .enum(["organic", "paid", "social", "direct", "email", "referral"])
    .default("direct"),
  landingPage: z.string().max(500).default("/"),
  userAgent: z.string().max(500).nullable().default(null),
  deviceType: z.enum(["mobile", "tablet", "desktop"]).default("desktop"),
  initialQuestion: z.string().max(1000).nullable().default(null),
  initialAddress: z.string().max(500).nullable().default(null),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
