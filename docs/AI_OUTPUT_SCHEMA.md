# AI Output Schema

Canonical executable schema: `src/lib/ai/lead-intelligence-schema.ts`.

Required fields: `summary`, `intent`, `urgencyInterpretation`, `keyFacts`, `missingFacts`, `motivationIndicators`, `potentialObjections`, `recommendedNextHumanAction`, `suggestedQuestions`, `suggestedCallOpener`, `suggestedEmailDraft`, `suggestedSmsDraft`, `recommendedCadence`, `riskFlags`, `consentLimitations`, `geographyNote`, `sourceQualityNote`, `confidence`, and `explanation`.

The Responses API receives an `additionalProperties: false` strict JSON Schema. The server validates output again with Zod, including enumerations, item counts, text-length limits, and confidence range 0–1. Invalid output is discarded in favor of deterministic fallback.
