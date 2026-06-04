/**
 * ListingMatch
 *
 * Deterministic matcher between a buyer lead's criteria and a list of
 * public-safe listings. Returns ranked matches with reason codes so the
 * admin UI can show *why* a listing is suggested.
 *
 * Strict rules:
 *   - Operates on PUBLIC listing fields only (no agent_remarks, lockbox,
 *     compensation, etc.). The caller is expected to have sanitized first.
 *   - No protected-class signaling. We never read "schools", "demographics",
 *     "neighborhood feel", etc. — only price/beds/baths/geography.
 */
import type { PublicListing } from "@/schemas/listing.schema";

export interface BuyerCriteria {
  city?: string | null;
  zip?: string | null;
  county?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  bedsMin?: number | null;
  bathsMin?: number | null;
  propertyType?: string | null;
  /** Free-text must-haves we use only as soft tags (no protected classes). */
  mustHaves?: string[];
}

export interface ListingMatchResult {
  listingId: string;
  score: number; // 0–100
  reasons: Array<{ code: string; points: number; label: string }>;
}

const MAX_PRICE_OVERSHOOT = 0.05; // 5% over budget is still considered

export function matchListings(
  criteria: BuyerCriteria,
  listings: ReadonlyArray<PublicListing>
): ListingMatchResult[] {
  return listings
    .map((l) => scoreListing(criteria, l))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreListing(
  criteria: BuyerCriteria,
  l: PublicListing
): ListingMatchResult {
  const reasons: ListingMatchResult["reasons"] = [];
  let score = 0;

  // Geography (max 30)
  if (criteria.zip && l.zip && criteria.zip === l.zip) {
    score += 30;
    reasons.push({ code: "zip_match", points: 30, label: `ZIP ${l.zip} match` });
  } else if (
    criteria.city &&
    l.city &&
    criteria.city.toLowerCase() === l.city.toLowerCase()
  ) {
    score += 20;
    reasons.push({ code: "city_match", points: 20, label: `City ${l.city} match` });
  } else if (
    criteria.county &&
    l.county &&
    criteria.county.toLowerCase() === l.county.toLowerCase()
  ) {
    score += 10;
    reasons.push({ code: "county_match", points: 10, label: `County ${l.county} match` });
  }

  // Price band (max 30)
  if (l.list_price !== null && l.list_price !== undefined) {
    if (criteria.budgetMin !== null && criteria.budgetMin !== undefined && l.list_price < criteria.budgetMin) {
      // Below budget is okay but loses points.
      score += 10;
      reasons.push({ code: "below_budget", points: 10, label: "Below budget floor" });
    } else if (
      criteria.budgetMax !== null &&
      criteria.budgetMax !== undefined &&
      l.list_price <= criteria.budgetMax
    ) {
      score += 30;
      reasons.push({ code: "in_budget", points: 30, label: "Inside budget" });
    } else if (
      criteria.budgetMax !== null &&
      criteria.budgetMax !== undefined &&
      l.list_price <= criteria.budgetMax * (1 + MAX_PRICE_OVERSHOOT)
    ) {
      score += 15;
      reasons.push({ code: "near_budget", points: 15, label: "Within 5% of budget ceiling" });
    }
    // No points for way over budget.
  }

  // Beds (max 15)
  if (criteria.bedsMin !== null && criteria.bedsMin !== undefined && l.beds !== null && l.beds !== undefined) {
    if (l.beds >= criteria.bedsMin) {
      score += 15;
      reasons.push({ code: "beds_match", points: 15, label: `${l.beds} beds ≥ ${criteria.bedsMin}` });
    } else {
      // Slightly fewer beds: small partial credit.
      const diff = criteria.bedsMin - l.beds;
      if (diff === 1) {
        score += 5;
        reasons.push({ code: "beds_near", points: 5, label: "1 bed short" });
      }
    }
  }

  // Baths (max 10)
  if (
    criteria.bathsMin !== null &&
    criteria.bathsMin !== undefined &&
    l.baths_full !== null &&
    l.baths_full !== undefined
  ) {
    if (l.baths_full >= criteria.bathsMin) {
      score += 10;
      reasons.push({
        code: "baths_match",
        points: 10,
        label: `${l.baths_full} full baths ≥ ${criteria.bathsMin}`,
      });
    }
  }

  // Property type (max 10)
  if (
    criteria.propertyType &&
    l.property_type &&
    criteria.propertyType.toLowerCase() === l.property_type.toLowerCase()
  ) {
    score += 10;
    reasons.push({
      code: "property_type_match",
      points: 10,
      label: `Type ${l.property_type}`,
    });
  }

  // Must-haves (soft, max 5) — only matches against public_remarks; never
  // against private fields and never against protected-class keywords.
  if (criteria.mustHaves && criteria.mustHaves.length > 0 && l.public_remarks) {
    const text = l.public_remarks.toLowerCase();
    let hits = 0;
    for (const m of criteria.mustHaves) {
      if (text.includes(m.toLowerCase())) hits += 1;
    }
    if (hits > 0) {
      const pts = Math.min(5, hits);
      score += pts;
      reasons.push({
        code: "must_have_hit",
        points: pts,
        label: `${hits} must-have term${hits > 1 ? "s" : ""} mentioned`,
      });
    }
  }

  score = Math.min(100, score);
  return { listingId: l.id, score, reasons };
}
