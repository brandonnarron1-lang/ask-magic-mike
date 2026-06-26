import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { matchListings } from "@/lib/engines/listing-match";
import { PUBLIC_FIELD_NAMES } from "@/lib/compliance/listing-sanitizer";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import type { PublicListing } from "@/schemas/listing.schema";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Run listing-match against the active listing pool for a buyer lead.
 *
 * Persists ranked matches to `listing_matches` when Supabase is
 * configured. Returns the ranked list. **Only public listing fields
 * cross the engine boundary.** `agent_remarks`, `lockbox_info`, etc.
 * never reach this code path.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminAuth(req);
  if (!auth.ok)
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );
  const { id } = await params;
  if (!UUID.test(id))
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400, headers: NO_STORE });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { ok: true, note: "mock_mode", matches: [] },
      { headers: NO_STORE }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const { data: lead } = await client
    .from("leads")
    .select("city, county, zip, address_raw, lead_type")
    .eq("id", id)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: "lead_not_found" },
      { status: 404, headers: NO_STORE }
    );
  }

  // PUBLIC fields only — never select private columns from `listings`.
  const { data: listings } = await client
    .from("listings")
    .select(PUBLIC_FIELD_NAMES.join(", "))
    .eq("status", "active")
    .limit(100);

  const matches = matchListings(
    {
      city: lead.city ?? null,
      county: lead.county ?? null,
      zip: lead.zip ?? null,
    },
    (listings ?? []) as PublicListing[]
  );

  // Persist top 10 to listing_matches.
  const top = matches.slice(0, 10);
  for (const m of top) {
    const { error: upsertErr } = await client.from("listing_matches").upsert(
      {
        lead_id: id,
        listing_id: m.listingId,
        match_score: m.score,
        match_reasons: m.reasons,
      },
      { onConflict: "lead_id,listing_id" }
    );
    if (upsertErr) {
      console.error(`[match-listings] upsert failed for listing ${m.listingId}:`, upsertErr.message);
    }
  }

  trackEventNoWait({
    eventName: "listing_matched",
    leadId: id,
    properties: { matchCount: top.length, totalScanned: listings?.length ?? 0 },
  });

  return NextResponse.json(
    { ok: true, matches: top, scanned: listings?.length ?? 0 },
    { headers: NO_STORE }
  );
}
