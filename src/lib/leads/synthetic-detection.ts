export const SYNTHETIC_EMAIL_MARKERS = [
  "@example.com",
  "@test.com",
  "+qa",
  "+test",
  "+synthetic",
  "test@",
  "synthetic@",
  "qa+amm-",
  "amm-wordpress-smoke",
  "amm-wordpress-attribution-smoke",
  "amm_wordpress",
  "do_not_contact",
] as const;

export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return SYNTHETIC_EMAIL_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}
