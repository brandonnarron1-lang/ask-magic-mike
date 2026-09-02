import { type NextRequest, NextResponse } from "next/server";
import { buildOpenHouseRegistrationPacket } from "../../../lib/growth/open-house-registration";

export const dynamic = "force-dynamic";

const REDIRECT_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  const { reference } = await context.params;
  const packet = buildOpenHouseRegistrationPacket(reference);
  if (!packet) {
    return NextResponse.json(
      { ok: false, error: "open_house_shortlink_not_found" },
      { status: 404, headers: REDIRECT_HEADERS },
    );
  }

  const response = NextResponse.redirect(packet.trackedUrl, 307);
  for (const [name, value] of Object.entries(REDIRECT_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}
