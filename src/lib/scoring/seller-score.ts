import type { ScoringInput, ScoreFactor } from "@/types/domain.types";
import {
  SELLER_FACTORS,
  SHARED_FACTORS,
} from "./constants";

export interface SellerScoreResult {
  score: number;
  factors: ScoreFactor[];
}

export function computeSellerScore(input: ScoringInput): SellerScoreResult {
  const factors: ScoreFactor[] = [];
  let raw = 0;

  const add = (def: { key: string; points: number; reason: string }, category: "seller" | "shared") => {
    factors.push({ key: def.key, category, points: def.points, reason: def.reason });
    raw += def.points;
  };

  // Intent
  if (input.primaryIntent === "sell") {
    add(SELLER_FACTORS.INTENT_SELL, "seller");
  } else if (input.primaryIntent === "both") {
    add(SELLER_FACTORS.INTENT_BOTH, "seller");
  }

  // CTA chip
  if (input.ctaChipUsed === "home_worth") {
    add(SELLER_FACTORS.CTA_HOME_WORTH, "seller");
  } else if (input.ctaChipUsed === "should_sell_now") {
    add(SELLER_FACTORS.CTA_SELL_NOW, "seller");
  }

  // Timeline
  if (input.timelineMonths === 0) {
    add(SELLER_FACTORS.TIMELINE_ASAP, "seller");
  } else if (input.timelineMonths === 3) {
    add(SELLER_FACTORS.TIMELINE_3MO, "seller");
  } else if (input.timelineMonths === 6) {
    add(SELLER_FACTORS.TIMELINE_6MO, "seller");
  }

  // Address
  if (input.hasAddress) {
    add(SELLER_FACTORS.HAS_ADDRESS, "seller");
  }

  // Shared
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
