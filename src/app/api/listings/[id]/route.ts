import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db/types";
import { PUBLIC_FIELD_NAMES } from "@/lib/compliance/listing-sanitizer";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import {
  isRecoverableListingProviderError,
  safeEmptyListingDetailResponse,
} from "@/lib/listings/safe-responses";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Public-safe listing detail. Private fields are never selected.
 *
 * Must never 500 because of a data-layer issue. On any recoverable
 * provider failure it returns 200 with `listing: null, degraded: true`.
 * A genuinely missing row keeps its 404.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, error: "bad_id" },
      { status: 400, headers: NO_STORE }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: true, listing: null, note: "listing_detail_mock_mode" },
      { headers: NO_STORE }
    );
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // The `listings` table is added in migration 00012; types not regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;
    const { data, error } = await client
      .from("listings")
      .select(PUBLIC_FIELD_NAMES.join(", "))
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (isRecoverableListingProviderError(error)) {
        return NextResponse.json(safeEmptyListingDetailResponse(), {
          headers: NO_STORE,
        });
      }
      return NextResponse.json(safeEmptyListingDetailResponse(), {
        headers: NO_STORE,
      });
    }
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: NO_STORE }
      );
    }

    trackEventNoWait({
      eventName: "listing_viewed",
      properties: { listingId: id },
    });

    return NextResponse.json({ ok: true, listing: data }, { headers: NO_STORE });
  } catch {
    return NextResponse.json(safeEmptyListingDetailResponse(), {
      headers: NO_STORE,
    });
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s
  );
}
