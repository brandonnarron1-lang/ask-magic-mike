/**
 * Recognizes Supabase / Postgres failures that mean the listings *storage*
 * is not usable yet — a missing table, a schema-cache miss, an undefined
 * column, or a misconfigured client — as opposed to a genuine server fault.
 *
 * Public listing routes use this to degrade to an empty, public-safe result
 * (HTTP 200 for search, 404 for detail) instead of returning a 500 when the
 * preview/production database has not yet received the listing tables
 * (migration 00012). It must NEVER swallow a real bug, so the match list is
 * intentionally narrow.
 */

/** PostgREST / Postgres error codes that indicate storage is unavailable. */
const RECOVERABLE_CODES = new Set([
  "PGRST205", // table not found in the PostgREST schema cache
  "PGRST204", // column not found in the PostgREST schema cache
  "42P01", // undefined_table
  "42703", // undefined_column
]);

/** Message fragments that indicate storage is unavailable / misconfigured. */
const RECOVERABLE_MESSAGE_PATTERNS = [
  /could not find the table/i, // PostgREST: "Could not find the table '…'"
  /schema cache/i,
  /relation .* does not exist/i, // raw Postgres: undefined table/relation
  /column .* does not exist/i, // raw Postgres: undefined column
  /must be set/i, // createAdminClient() env guard
  /supabase.*(not configured|required)/i,
];

function extractCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

function extractMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

/**
 * True when `error` is a recoverable listings-storage condition (missing
 * table/column, schema-cache miss, or unconfigured client). Accepts either a
 * Supabase PostgrestError-shaped object or a thrown Error.
 */
export function isRecoverableListingStorageError(error: unknown): boolean {
  if (!error) return false;
  if (RECOVERABLE_CODES.has(extractCode(error))) return true;
  const message = extractMessage(error);
  return RECOVERABLE_MESSAGE_PATTERNS.some((re) => re.test(message));
}
