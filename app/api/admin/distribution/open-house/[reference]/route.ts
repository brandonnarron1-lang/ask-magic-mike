import { type NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { buildOwnedDemandQrSvg } from "../../../../../lib/growth/owned-demand-assets";
import { buildOpenHouseRegistrationPacket } from "../../../../../lib/growth/open-house-registration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Content-Security-Policy": "default-src 'none'; sandbox",
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  const auth = await requireLeadCenterApiPermission(request, "report:view");
  if (!auth.ok) {
    for (const [name, value] of Object.entries(NO_STORE)) {
      auth.response.headers.set(name, value);
    }
    return auth.response;
  }

  const { reference } = await context.params;
  const packet = buildOpenHouseRegistrationPacket(reference);
  if (!packet) {
    return NextResponse.json(
      { ok: false, error: "open_house_reference_not_found" },
      { status: 404, headers: NO_STORE },
    );
  }

  const format = request.nextUrl.searchParams.get("format");
  if (format === "packet_json") {
    return NextResponse.json(
      { ok: true, ...packet },
      {
        status: 200,
        headers: {
          ...NO_STORE,
          "Content-Disposition": `attachment; filename="ask-magic-mike-open-house-${packet.reference}-review.json"`,
        },
      },
    );
  }
  if (format !== "qr_svg") {
    return NextResponse.json(
      { ok: false, error: "open_house_asset_format_not_found" },
      { status: 404, headers: NO_STORE },
    );
  }

  const svg = await buildOwnedDemandQrSvg(packet.shortUrl);
  return new Response(svg, {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="ask-magic-mike-open-house-${packet.reference}-qr.svg"`,
    },
  });
}
