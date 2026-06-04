/**
 * Duplicate detection.
 *
 * Pure function — accepts a candidate lead identity + a list of known
 * lead identities and returns the best match (if any) with a confidence
 * score. Keeps DB access at the caller so this module stays testable.
 */
import type { NormalizedLeadIdentity } from "./normalize";

export interface KnownLeadIdentity {
  leadId: string;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  normalizedAddressFingerprint: string | null;
  createdAt?: string | Date | null;
}

export interface DuplicateMatch {
  leadId: string;
  confidence: number; // 0–100
  reasons: string[];
}

/**
 * `EMAIL_MATCH_WEIGHT` and friends sum to 100 if all three identifiers match
 * exactly. We allow fuzzy address dedup at a lower weight to avoid false
 * positives across families at the same street address.
 */
const EMAIL_MATCH_WEIGHT = 60;
const PHONE_MATCH_WEIGHT = 50;
const ADDRESS_EXACT_MATCH_WEIGHT = 35;
const ADDRESS_FUZZY_MATCH_WEIGHT = 15;

/** A match >= 70 is treated as a hard duplicate; 40..69 as a "likely" dup. */
export const DUPLICATE_HARD_THRESHOLD = 70;
export const DUPLICATE_LIKELY_THRESHOLD = 40;

export function detectDuplicate(
  candidate: NormalizedLeadIdentity,
  known: ReadonlyArray<KnownLeadIdentity>
): DuplicateMatch | null {
  if (known.length === 0) return null;

  let best: DuplicateMatch | null = null;

  for (const k of known) {
    let confidence = 0;
    const reasons: string[] = [];

    if (
      candidate.email.normalized &&
      k.normalizedEmail &&
      candidate.email.normalized === k.normalizedEmail
    ) {
      confidence += EMAIL_MATCH_WEIGHT;
      reasons.push("email_match");
    }

    if (
      candidate.phone.e164 &&
      k.normalizedPhone &&
      candidate.phone.e164 === k.normalizedPhone
    ) {
      confidence += PHONE_MATCH_WEIGHT;
      reasons.push("phone_match");
    }

    if (
      candidate.address.fingerprint &&
      k.normalizedAddressFingerprint
    ) {
      if (candidate.address.fingerprint === k.normalizedAddressFingerprint) {
        confidence += ADDRESS_EXACT_MATCH_WEIGHT;
        reasons.push("address_exact_match");
      } else if (
        isAddressFuzzyMatch(
          candidate.address.fingerprint,
          k.normalizedAddressFingerprint
        )
      ) {
        confidence += ADDRESS_FUZZY_MATCH_WEIGHT;
        reasons.push("address_fuzzy_match");
      }
    }

    if (confidence === 0) continue;

    // Cap at 100.
    confidence = Math.min(confidence, 100);

    if (!best || confidence > best.confidence) {
      best = { leadId: k.leadId, confidence, reasons };
    }
  }

  return best;
}

/** Returns true if both fingerprints share the leading number + street name
 *  but differ in suffix / direction. Cheap heuristic; good enough for
 *  catching "123 Nash St" vs "123 Nash Street NW" variants. */
function isAddressFuzzyMatch(a: string, b: string): boolean {
  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = b.split(" ").filter(Boolean);
  if (aTokens.length < 2 || bTokens.length < 2) return false;
  // Number must match (token starts with a digit).
  const aNum = aTokens.find((t) => /^\d+/.test(t));
  const bNum = bTokens.find((t) => /^\d+/.test(t));
  if (!aNum || !bNum || aNum !== bNum) return false;
  // Find the first non-digit token in each and compare directly.
  const aName = aTokens.find((t) => /^[a-z]/.test(t));
  const bName = bTokens.find((t) => /^[a-z]/.test(t));
  if (!aName || !bName) return false;
  return aName === bName;
}

export interface DuplicateClassification {
  match: DuplicateMatch | null;
  isHard: boolean;
  isLikely: boolean;
}

export function classifyDuplicate(
  candidate: NormalizedLeadIdentity,
  known: ReadonlyArray<KnownLeadIdentity>
): DuplicateClassification {
  const match = detectDuplicate(candidate, known);
  return {
    match,
    isHard: !!match && match.confidence >= DUPLICATE_HARD_THRESHOLD,
    isLikely:
      !!match &&
      match.confidence >= DUPLICATE_LIKELY_THRESHOLD &&
      match.confidence < DUPLICATE_HARD_THRESHOLD,
  };
}
