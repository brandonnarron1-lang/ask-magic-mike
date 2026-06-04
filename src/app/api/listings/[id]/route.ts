import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db/types";
import { PUBLIC_FIELD_NAMES } from "@/lib/compliance/listing-sanitizer";
import { isRecoverableListingStorageError } from "@/lib/listings/storage-errors";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };

/** Public-safe not-found response. */
function notFound() {
  return NextResponse.json(
    { ok: false, error: "not_found" },
    { status: 404, headers: NO_STORE }
  );
}

/** Public-safe listing detail. Private fields are never selected. */
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

  let data: unknown = null;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // The `listings` table is added in migration 00012; types not regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;
    const result = await client
      .from("listings")
      .select(PUBLIC_FIELD_NAMES.join(", "))
      .eq("id", id)
      .maybeSingle();

    if (result.error) {
      // Listings table not migrated yet / schema-cache miss → safe not-found
      // instead of leaking a raw Supabase error with a 500.
      if (isRecoverableListingStorageError(result.error)) {
        return notFound();
      }
      // eslint-disable-next-line no-console
      console.error("[listings:detail] query error", { code: result.error.code });
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500, headers: NO_STORE }
      );
    }
    data = result.data;
  } catch (err) {
    if (isRecoverableListingStorageError(err)) {
      return notFound();
    }
    // eslint-disable-next-line no-console
    console.error(
      "[listings:detail] unexpected error",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500, headers: NO_STORE }
    );
  }

  if (!data) {
    return notFound();
  }

  trackEventNoWait({
    eventName: "listing_viewed",
    properties: { listingId: id },
  });

  return NextResponse.json({ ok: true, listing: data }, { headers: NO_STORE });
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s
  );
}
