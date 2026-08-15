import { z } from "zod";

export const aiLeadIntelligenceSchema = z.object({
  summary: z.string().max(700),
  intent: z.enum(["seller", "buyer", "renter", "property_alert", "general", "unknown"]),
  urgencyInterpretation: z.enum(["immediate_human_review", "same_day_review", "standard_review", "insufficient_evidence"]),
  keyFacts: z.array(z.string().max(240)).max(10),
  missingFacts: z.array(z.string().max(240)).max(10),
  motivationIndicators: z.array(z.string().max(240)).max(8),
  potentialObjections: z.array(z.string().max(240)).max(8),
  recommendedNextHumanAction: z.string().max(500),
  suggestedQuestions: z.array(z.string().max(300)).max(8),
  suggestedCallOpener: z.string().max(500),
  suggestedEmailDraft: z.string().max(1_500),
  suggestedSmsDraft: z.string().max(480),
  recommendedCadence: z.string().max(400),
  riskFlags: z.array(z.string().max(240)).max(10),
  consentLimitations: z.array(z.string().max(240)).max(10),
  geographyNote: z.string().max(400),
  sourceQualityNote: z.string().max(400),
  confidence: z.number().min(0).max(1),
  explanation: z.string().max(700),
});

export type AiLeadIntelligence = z.infer<typeof aiLeadIntelligenceSchema>;

export const AI_LEAD_INTELLIGENCE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    intent: { type: "string", enum: ["seller", "buyer", "renter", "property_alert", "general", "unknown"] },
    urgencyInterpretation: { type: "string", enum: ["immediate_human_review", "same_day_review", "standard_review", "insufficient_evidence"] },
    keyFacts: { type: "array", items: { type: "string" }, maxItems: 10 },
    missingFacts: { type: "array", items: { type: "string" }, maxItems: 10 },
    motivationIndicators: { type: "array", items: { type: "string" }, maxItems: 8 },
    potentialObjections: { type: "array", items: { type: "string" }, maxItems: 8 },
    recommendedNextHumanAction: { type: "string" },
    suggestedQuestions: { type: "array", items: { type: "string" }, maxItems: 8 },
    suggestedCallOpener: { type: "string" },
    suggestedEmailDraft: { type: "string" },
    suggestedSmsDraft: { type: "string" },
    recommendedCadence: { type: "string" },
    riskFlags: { type: "array", items: { type: "string" }, maxItems: 10 },
    consentLimitations: { type: "array", items: { type: "string" }, maxItems: 10 },
    geographyNote: { type: "string" },
    sourceQualityNote: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    explanation: { type: "string" },
  },
  required: [
    "summary", "intent", "urgencyInterpretation", "keyFacts", "missingFacts",
    "motivationIndicators", "potentialObjections", "recommendedNextHumanAction",
    "suggestedQuestions", "suggestedCallOpener", "suggestedEmailDraft",
    "suggestedSmsDraft", "recommendedCadence", "riskFlags", "consentLimitations",
    "geographyNote", "sourceQualityNote", "confidence", "explanation",
  ],
} as const;
