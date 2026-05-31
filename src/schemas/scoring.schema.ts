import { z } from "zod";

export const ScoreFactorSchema = z.object({
  key: z.string(),
  category: z.enum(["seller", "buyer", "shared"]),
  points: z.number().int(),
  reason: z.string(),
});

export const LeadScoreSchema = z.object({
  sellerCertaintyScore: z.number().int().min(0).max(100),
  buyerCertaintyScore: z.number().int().min(0).max(100),
  compositeScore: z.number().int().min(0).max(100),
  temperature: z.enum(["urgent", "hot", "warm", "nurture", "low"]),
  factorLog: z.array(ScoreFactorSchema),
  scorerVersion: z.string(),
});

export const ComputeScoreRequestSchema = z.object({
  leadId: z.string().uuid(),
});

export type ScoreFactorInput = z.infer<typeof ScoreFactorSchema>;
export type LeadScoreInput = z.infer<typeof LeadScoreSchema>;
