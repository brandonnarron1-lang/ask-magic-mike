/**
 * Public-safe fallback shapes for the listing search / detail endpoints.
 *
 * The public listing endpoints must never 500 when the listing data
 * layer is unavailable — missing migration, dropped table, provider
 * outage, etc. They degrade to a stable empty result with metadata
 * that clients can ignore safely.
 *
 * These helpers are deliberately pure and dependency-free so they
 * unit-test without spinning up Next, Supabase, or fetch.
 *
 * The response shape mirrors the existing successful payloads:
 *
 *   search:  { ok: true, items: [], limit, degraded, source, reason }
 *   detail:  { ok: true, listing: null,  degraded, source, reason }
 *
 * No raw provider/error message is ever included.
 */

import {
  PRIVATE_FIELD_NAMES,
  PUBLIC_FIELD_NAMES,
} from "@/lib/compliance/listing-sanitizer";

export const FALLBACK_SOURCE = "fallback_empty";
export const FALLBACK_REASON = "listing_data_unavailable";

export interface SafeListingSearchResponse {
  ok: true;
  items: never[];
  limit: number;
  degraded: true;
  source: typeof FALLBACK_SOURCE;
  reason: typeof FALLBACK_REASON;
}

export interface SafeListingDetailResponse {
  ok: true;
  listing: null;
  degraded: true;
  source: typeof FALLBACK_SOURCE;
  reason: typeof FALLBACK_REASON;
}

/**
 * Build the public-safe empty search response.
 *
 * Echoes the caller's `limit` so client pagination state stays
 * consistent. Items is always an empty array. No raw provider error
 * is included.
 */
export function safeEmptyListingSearchResponse(
  limit: number
): SafeListingSearchResponse {
  return {
    ok: true,
    items: [],
    limit,
    degraded: true,
    source: FALLBACK_SOURCE,
    reason: FALLBACK_REASON,
  };
}

/**
 * Build the public-safe empty detail response.
 *
 * Returns `listing: null` so existing client code that checks
 * `data.listing` falls through to its empty state.
 */
export function safeEmptyListingDetailResponse(): SafeListingDetailResponse {
  return {
    ok: true,
    listing: null,
    degraded: true,
    source: FALLBACK_SOURCE,
    reason: FALLBACK_REASON,
  };
}

/**
 * True for any listing-provider error the public endpoints should
 * absorb instead of bubbling up. Today this is everything that isn't
 * a programmer error — missing table, schema cache miss, RLS denial,
 * provider timeout, dropped connection.
 *
 * The classification is conservative: when in doubt, return true.
 * A 200 with `degraded: true` is safer than a 500 with a leaked
 * Postgres message.
 */
export function isRecoverableListingProviderError(err: unknown): boolean {
  if (err == null) return false;
  if (typeof err === "object") {
    const e = err as { message?: unknown; code?: unknown; name?: unknown };
    // Always recoverable — never expose details to public clients.
    return (
      typeof e.message === "string" ||
      typeof e.code === "string" ||
      typeof e.name === "string"
    );
  }
  return true;
}

/**
 * Defensive assertion used by tests: no private MLS field name may
 * appear as a property anywhere in the response object.
 */
export function containsPrivateFieldName(obj: unknown): string | null {
  const stack: unknown[] = [obj];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    for (const key of Object.keys(node as Record<string, unknown>)) {
      if (
        (PRIVATE_FIELD_NAMES as readonly string[]).includes(key)
      ) {
        return key;
      }
      const v = (node as Record<string, unknown>)[key];
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

/**
 * Exported for completeness — public field whitelist as a value array
 * so non-type-level checks can use it without importing the schema
 * package directly.
 */
export const PUBLIC_LISTING_FIELDS: ReadonlyArray<string> = PUBLIC_FIELD_NAMES;
