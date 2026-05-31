import type { ScoringInput, LeadScore } from "@/types/domain.types";
import { computeSellerScore } from "./seller-score";
import { computeBuyerScore } from "./buyer-score";
import { classifyTemperature } from "./temperature";
import { SCORER_VERSION } from "./constants";

export function computeScore(input: ScoringInput): Omit<LeadScore, "id" | "leadId"> {
  const sellerResult = computeSellerScore(input);
  const buyerResult = computeBuyerScore(input);

  const compositeScore = Math.max(
    sellerResult.score,
    buyerResult.score
  );

  const temperature = classifyTemperature(compositeScore, input.timelineMonths);

  // Merge factor logs — deduplicate shared factors (shared counted once per scorer)
  const sharedKeys = new Set<string>();
  const mergedFactors = [
    ...sellerResult.factors.filter((f) => {
      if (f.category === "shared") {
        if (sharedKeys.has(f.key)) return false;
        sharedKeys.add(f.key);
      }
      return true;
    }),
    ...buyerResult.factors.filter((f) => {
      if (f.category === "shared") return false; // already included from seller pass
      return true;
    }),
  ];

  return {
    scoredAt: new Date(),
    sellerCertaintyScore: sellerResult.score,
    buyerCertaintyScore: buyerResult.score,
    compositeScore,
    temperature,
    factorLog: mergedFactors,
    scorerVersion: SCORER_VERSION,
  };
}

export { computeSellerScore } from "./seller-score";
export { computeBuyerScore } from "./buyer-score";
export { classifyTemperature } from "./temperature";
export * from "./constants";
