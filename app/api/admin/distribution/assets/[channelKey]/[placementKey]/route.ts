import { type NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import {
  buildOwnedDemandQrSvg,
  OWNED_DEMAND_SHORTLINK_ORIGIN,
  ownedDemandShortUrl,
  resolveOwnedDemandAssetRequest,
} from "../../../../../../lib/growth/owned-demand-assets";
import { renderOwnedDemandImage } from "../../../../../../lib/growth/owned-demand-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ channelKey: string; placementKey: string }> },
) {
  const auth = await requireLeadCenterApiPermission(request, "report:view");
  if (!auth.ok) {
    for (const [name, value] of Object.entries(NO_STORE)) {
      auth.response.headers.set(name, value);
    }
    return auth.response;
  }

  const { channelKey, placementKey } = await context.params;
  const format = request.nextUrl.searchParams.get("format");
  const asset = resolveOwnedDemandAssetRequest(channelKey, placementKey, format);
  if (!asset) {
    return NextResponse.json(
      { ok: false, error: "asset_not_found" },
      { status: 404, headers: NO_STORE },
    );
  }

  if (asset.format === "qr_svg") {
    const svg = await buildOwnedDemandQrSvg(ownedDemandShortUrl(asset.creative));
    return new Response(svg, {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asset.filename}"`,
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }

  const creativeUrl = new URL(asset.creative.creativeExportPath, OWNED_DEMAND_SHORTLINK_ORIGIN).toString();
  return renderOwnedDemandImage({
    creative: asset.creative,
    creativeUrl,
    filename: asset.filename,
    format: asset.format,
  });
}
