import { NextRequest, NextResponse } from "next/server";
import { safeEmptyListingSearchResponse } from "@/lib/listings/safe-responses";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Compatibility endpoint for the canonical App Router tree.
 *
 * Our Town Properties remains the authoritative live IDX/FlexMLS surface.
 * Until an approved server-side listing provider is connected here, return
 * the established public-safe degraded shape instead of a misleading 404 or
 * exposing any private MLS data.
 */
export async function GET(req: NextRequest) {
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 20;

  return NextResponse.json(safeEmptyListingSearchResponse(limit), {
    headers: NO_STORE,
  });
}
