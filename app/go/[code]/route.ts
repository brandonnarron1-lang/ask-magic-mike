import { type NextRequest, NextResponse } from "next/server";
import { resolveOwnedDemandShortCode } from "../../lib/growth/owned-demand-assets";

export const dynamic = "force-dynamic";

const REDIRECT_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const creative = resolveOwnedDemandShortCode(code);
  if (!creative) {
    return NextResponse.json(
      { ok: false, error: "shortlink_not_found" },
      { status: 404, headers: REDIRECT_HEADERS },
    );
  }

  const response = NextResponse.redirect(creative.trackedUrl, 307);
  for (const [name, value] of Object.entries(REDIRECT_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}
