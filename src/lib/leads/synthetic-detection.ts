<<<<<<< HEAD
/**
 * Single source of truth for synthetic / QA test lead detection.
 *
 * Markers are matched case-insensitively against the lead's email address.
 * Three callers previously had independent copies; this module eliminates
 * the drift risk.
 *
 * To add a new test marker: add it here only — all callers pick it up.
 */

export const SYNTHETIC_EMAIL_MARKERS = [
  // Generic QA / test patterns
=======
export const SYNTHETIC_EMAIL_MARKERS = [
>>>>>>> origin/main
  "@example.com",
  "@test.com",
  "+qa",
  "+test",
  "+synthetic",
  "test@",
  "synthetic@",
<<<<<<< HEAD
  // AMM-specific operational markers
=======
>>>>>>> origin/main
  "qa+amm-",
  "amm-wordpress-smoke",
  "amm-wordpress-attribution-smoke",
  "amm_wordpress",
  "do_not_contact",
] as const;

<<<<<<< HEAD
/**
 * Returns true if the email address matches any known synthetic/QA marker.
 * Safe to call with null/undefined (returns false).
 */
=======
>>>>>>> origin/main
export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return SYNTHETIC_EMAIL_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}
