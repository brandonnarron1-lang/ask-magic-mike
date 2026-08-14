import { NextRequest, NextResponse } from "next/server";
import { safeEmptyListingDetailResponse } from "@/lib/listings/safe-responses";

const NO_STORE = { "Cache-Control": "no-store" };

/** Public-safe compatibility detail route; the live IDX stays on WordPress. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json(
      { ok: false, error: "bad_id" },
      { status: 400, headers: NO_STORE }
    );
  }

  return NextResponse.json(safeEmptyListingDetailResponse(), {
    headers: NO_STORE,
  });
}
