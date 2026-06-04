import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db/types";
import { PUBLIC_FIELD_NAMES } from "@/lib/compliance/listing-sanitizer";
import { isRecoverableListingStorageError } from "@/lib/listings/storage-errors";

const NO_STORE = { "Cache-Control": "no-store" };

/** Public-safe empty result — used when listings storage is unavailable. */
function emptyResult(limit: number, note: string) {
  return NextResponse.json(
    { ok: true, items: [], limit, note },
    { headers: NO_STORE }
  );
}

/**
 * Public-safe listing search.
 *
 * Returns only the columns on `PUBLIC_FIELD_NAMES`. Filters: q (city/zip/
 * partial address), status, beds_min, baths_min, price_min, price_max,
 * limit (≤ 50).
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
    return emptyResult(limit, "listings_search_mock_mode");
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
      // Listings table not migrated yet / schema-cache miss → degrade safely
      // instead of leaking a raw Supabase error with a 500.
      if (isRecoverableListingStorageError(error)) {
        return emptyResult(limit, "listings_storage_unavailable");
      }
      // eslint-disable-next-line no-console
      console.error("[listings:search] query error", { code: error.code });
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { ok: true, items: data ?? [], limit },
      { headers: NO_STORE }
    );
  } catch (err) {
    if (isRecoverableListingStorageError(err)) {
      return emptyResult(limit, "listings_storage_unavailable");
    }
    // eslint-disable-next-line no-console
    console.error(
      "[listings:search] unexpected error",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500, headers: NO_STORE }
    );
  }
}

function numOrNull(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
