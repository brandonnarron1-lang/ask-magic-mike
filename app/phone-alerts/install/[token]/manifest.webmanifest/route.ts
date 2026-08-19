import { NextResponse } from "next/server";
import { verifyPhoneSetupToken } from "../../../../lib/phoneSetupSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/manifest+json",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!verifyPhoneSetupToken(token)) {
    return NextResponse.json({ error: "phone_setup_link_expired" }, {
      status: 404,
      headers: PRIVATE_HEADERS,
    });
  }

  const claimPath = `/phone-alerts/setup/claim?token=${encodeURIComponent(token)}`;
  return NextResponse.json({
    name: "Ask Magic Mike Phone Alerts",
    short_name: "Magic Mike",
    description: "Secure copy lead alerts for Our Town Properties.",
    id: "/phone-alerts",
    start_url: claimPath,
    scope: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#d4a72c",
    icons: [
      { src: "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-128.png", sizes: "128x128", type: "image/png" },
      { src: "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.png", sizes: "256x256", type: "image/png" },
    ],
  }, { headers: PRIVATE_HEADERS });
}
