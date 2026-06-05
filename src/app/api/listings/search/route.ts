import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db/types";
import { PUBLIC_FIELD_NAMES } from "@/lib/compliance/listing-sanitizer";
import {
  isRecoverableListingProviderError,
  safeEmptyListingSearchResponse,
} from "@/lib/listings/safe-responses";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Public-safe listing search.
 *
 * Returns only the columns on `PUBLIC_FIELD_NAMES`. Filters: q (city/zip/
 * partial address), status, beds_min, baths_min, price_min, price_max,
 * limit (≤ 50).
 *
 * This endpoint must never 500 because of a data-layer issue (missing
 * migration / missing table / provider outage / etc.). On any
 * recoverable provider failure it returns 200 with a public-safe
 * empty result tagged `degraded: true`.
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const q         = u.searchParams.get("q")?.trim() ?? null;
  const status    = u.searchParams.get("status") ?? "active";
  const bedsMin   = numOrNull(u.searchParams.get("beds_min"));
  const bathsMin  = numOrNull(u.searchParams.get("baths_min"));
  const priceMin  = numOrNull(u.searchParams.get("price_min"));
  const priceMax  = numOrNull(u.searchParams.get("price_max"));
  const limit     = Math.min(numOrNull(u.searchParams.get("limit")) ?? 20, 50);

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: true, items: [], limit, note: "listings_search_mock_mode" },
      { headers: NO_STORE }
    );
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // The `listings` table is added in migration 00012; generated DB types
    // haven't been regenerated yet, so cast through the untyped surface.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    // SELECT only public columns — never `agent_remarks`/`lockbox_info`/etc.
    let query = client
      .from("listings")
      .select(PUBLIC_FIELD_NAMES.join(", "))
      .limit(limit);

    if (status)   query = query.eq("status", status);
    if (bedsMin)  query = query.gte("beds", bedsMin);
    if (bathsMin) query = query.gte("baths_full", bathsMin);
    if (priceMin) query = query.gte("list_price", priceMin);
    if (priceMax) query = query.lte("list_price", priceMax);
    if (q) {
      query = query.or(
        [
          `city.ilike.%${q}%`,
          `zip.ilike.%${q}%`,
          `address_line1.ilike.%${q}%`,
        ].join(",")
      );
    }

    const { data, error } = await query;
    if (error) {
      // Schema-cache / missing-table / provider failures degrade safely.
      // Raw error.message is never returned to the client.
      if (isRecoverableListingProviderError(error)) {
        return NextResponse.json(
          safeEmptyListingSearchResponse(limit),
          { headers: NO_STORE }
        );
      }
      // Unrecoverable error path (e.g. config-shape bug). Still don't leak
      // the message — return a stable empty result.
      return NextResponse.json(
        safeEmptyListingSearchResponse(limit),
        { headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { ok: true, items: data ?? [], limit },
      { headers: NO_STORE }
    );
  } catch {
    // Any thrown error (dynamic import failure, client construction failure,
    // unexpected runtime error) collapses to the safe-empty response. The
    // public surface never returns 5xx for a listing data-layer issue.
    return NextResponse.json(
      safeEmptyListingSearchResponse(limit),
      { headers: NO_STORE }
    );
  }
}

function numOrNull(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
