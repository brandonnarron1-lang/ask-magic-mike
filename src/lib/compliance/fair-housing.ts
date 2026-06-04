/**
 * Fair-housing compliance guardrail.
 *
 * Lightweight phrase scanner used to vet generated marketing copy
 * before it can be approved/published. Catches discriminatory or
 * protected-class signaling language so a human + future AI generator
 * stay on safe ground. Not a substitute for legal review.
 */

const PROTECTED_CLASS_PHRASES = [
  // Racial/ethnic
  /\bwhite (only|families|neighborhood)\b/i,
  /\bblack (only|families|neighborhood)\b/i,
  /\b(no\s+)?(asian|latino|hispanic|black|white|christian|jewish|muslim|catholic) only\b/i,
  // Family status
  /\b(no children|adults only|no kids|empty nesters preferred|perfect for empty nesters)\b/i,
  /\bbachelor pad\b/i,
  // Disability
  /\b(no wheelchairs|able-bodied|not handicapped)\b/i,
  // Religion
  /\b(christian (only|family|home)|jewish (only|family)|near (mosque|synagogue|church) (preferred|required))\b/i,
  // National origin
  /\b(american(s)? only|english speakers? only)\b/i,
  // Source of income / age outside of senior housing exemption
  /\b(no section 8|no vouchers|no welfare)\b/i,
  /\b(no seniors|young professionals only|no elderly|millennials preferred)\b/i,
  // Sex / gender
  /\b(male only|female only|mature woman preferred)\b/i,
];

const IDEAL_PERSON_LANGUAGE = [
  /\bideal (for|tenant|owner|buyer|family|client)\b/i,
  /\bperfect (for|family|couple|tenant)\b/i,
];

export interface FairHousingFinding {
  code: string;
  pattern: string;
  excerpt: string;
}

export interface FairHousingReport {
  passes: boolean;
  findings: FairHousingFinding[];
}

export function scanForFairHousingIssues(text: string): FairHousingReport {
  const findings: FairHousingFinding[] = [];
  for (const rx of PROTECTED_CLASS_PHRASES) {
    const m = text.match(rx);
    if (m) {
      findings.push({
        code: "protected_class_phrase",
        pattern: rx.toString(),
        excerpt: m[0],
      });
    }
  }
  for (const rx of IDEAL_PERSON_LANGUAGE) {
    const m = text.match(rx);
    if (m) {
      findings.push({
        code: "ideal_person_language",
        pattern: rx.toString(),
        excerpt: m[0],
      });
    }
  }
  return { passes: findings.length === 0, findings };
}
