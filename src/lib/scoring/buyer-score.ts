import type { ScoringInput, ScoreFactor } from "@/types/domain.types";
import {
  BUYER_FACTORS,
  SHARED_FACTORS,
} from "./constants";

export interface BuyerScoreResult {
  score: number;
  factors: ScoreFactor[];
}

export function computeBuyerScore(input: ScoringInput): BuyerScoreResult {
  const factors: ScoreFactor[] = [];
  let raw = 0;

  const add = (def: { key: string; points: number; reason: string }, category: "buyer" | "shared") => {
    factors.push({ key: def.key, category, points: def.points, reason: def.reason });
    raw += def.points;
  };

  // Intent
  if (input.primaryIntent === "buy") {
    add(BUYER_FACTORS.INTENT_BUY, "buyer");
  } else if (input.primaryIntent === "both") {
    add(BUYER_FACTORS.INTENT_BOTH, "buyer");
  }

  // CTA chip
  if (input.ctaChipUsed === "tour_home") {
    add(BUYER_FACTORS.CTA_TOUR_HOME, "buyer");
  } else if (input.ctaChipUsed === "what_can_afford") {
    add(BUYER_FACTORS.CTA_AFFORD, "buyer");
  }

  // Timeline
  if (input.timelineMonths === 0) {
    add(BUYER_FACTORS.TIMELINE_ASAP, "buyer");
  } else if (input.timelineMonths === 3) {
    add(BUYER_FACTORS.TIMELINE_3MO, "buyer");
  } else if (input.timelineMonths === 6) {
    add(BUYER_FACTORS.TIMELINE_6MO, "buyer");
  }

  // Shared (only add if not already added by seller — buyer score is independent)
  if (input.hasPhone) add(SHARED_FACTORS.HAS_PHONE, "shared");
  if (input.hasEmail) add(SHARED_FACTORS.HAS_EMAIL, "shared");
  if (input.hasName) add(SHARED_FACTORS.HAS_NAME, "shared");
  if (input.consentSms) add(SHARED_FACTORS.CONSENT_SMS, "shared");
  if (input.consentCall) add(SHARED_FACTORS.CONSENT_CALL, "shared");
  if (input.ctaChipUsed === "talk_to_mike") add(SHARED_FACTORS.CTA_TALK_MIKE, "shared");
  if (input.utmMedium && ["cpc", "ppc", "paid", "paidsearch", "paidsocial"].includes(input.utmMedium.toLowerCase())) {
    add(SHARED_FACTORS.PAID_TRAFFIC, "shared");
  }

  return {
    score: Math.min(100, raw),
    factors,
  };
}
