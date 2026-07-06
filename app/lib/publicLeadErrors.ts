export const PUBLIC_LEAD_SAVE_ERROR =
  "We couldn't save that just yet. Please call Our Town Properties at 252-243-7700, or try again in a moment.";

const INTERNAL_ERROR_PATTERNS = [
  /Supabase insert failed/i,
  /PGRST\d+/i,
  /schema cache/i,
  /Could not find the ['"].+['"] column/i,
  /^\s*\{[\s\S]*"code"\s*:\s*"PGRST\d+"[\s\S]*\}\s*$/i,
];

export function publicLeadErrorMessage(input: unknown, fallback = PUBLIC_LEAD_SAVE_ERROR) {
  const message = typeof input === "string" ? input.trim() : "";
  if (!message) return fallback;
  if (INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) return fallback;
  return message;
}
