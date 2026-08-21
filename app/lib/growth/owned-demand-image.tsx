/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import {
  buildOwnedDemandQrDataUrl,
  OWNED_DEMAND_IMAGE_SPECS,
  ownedDemandShortUrl,
  type OwnedDemandImageFormat,
} from "./owned-demand-assets";
import type { OwnedDemandCreativeDefinition } from "./owned-demand";

const PRIVATE_ASSET_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function placementEyebrow(creative: OwnedDemandCreativeDefinition) {
  if (creative.placementKey === "general_question") return "LOCAL REAL ESTATE GUIDANCE";
  return creative.placementLabel.toUpperCase();
}

function backgroundPosition(creative: OwnedDemandCreativeDefinition) {
  if (creative.placementKey === "renter_plan") return "center 28%";
  if (creative.placementKey === "buyer_match") return "center";
  return "62% center";
}

export async function renderOwnedDemandImage(input: {
  creative: OwnedDemandCreativeDefinition;
  creativeUrl: string;
  filename: string;
  format: OwnedDemandImageFormat;
}) {
  const { creative, creativeUrl, filename, format } = input;
  const spec = OWNED_DEMAND_IMAGE_SPECS[format];
  const story = format === "story";
  const shortUrl = ownedDemandShortUrl(creative);
  const qrDataUrl = await buildOwnedDemandQrDataUrl(shortUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#050505",
          color: "#f7edda",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <img
          src={creativeUrl}
          alt={creative.creativeAlt}
          width={spec.width}
          height={spec.height}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: backgroundPosition(creative),
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: story
              ? "linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,.18) 30%,rgba(0,0,0,.86) 62%,#050505 100%)"
              : "linear-gradient(180deg,rgba(0,0,0,.24) 0%,rgba(0,0,0,.08) 34%,rgba(0,0,0,.91) 72%,#050505 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: story ? 285 : 62,
            left: 62,
            right: 62,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid rgba(214,174,86,.72)",
            paddingBottom: 22,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#e0b85e", fontSize: story ? 34 : 27, fontWeight: 800, letterSpacing: 4 }}>
              ASK MAGIC MIKE
            </span>
            <span style={{ marginTop: 7, color: "#f7edda", fontSize: story ? 20 : 17, letterSpacing: 2 }}>
              OUR TOWN PROPERTIES, INC.
            </span>
          </div>
          <span
            style={{
              display: "flex",
              border: "1px solid rgba(214,174,86,.78)",
              borderRadius: 999,
              padding: story ? "13px 21px" : "10px 17px",
              background: "rgba(0,0,0,.66)",
              color: "#f3cf79",
              fontSize: story ? 20 : 16,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            {placementEyebrow(creative)}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 62,
            right: story ? 92 : 390,
            top: story ? 690 : 690,
            display: "flex",
            flexDirection: "column",
            ...(story ? {
              borderLeft: "5px solid rgba(224,184,94,.92)",
              borderRadius: 24,
              padding: "28px 32px",
              background: "rgba(0,0,0,.58)",
            } : {}),
          }}
        >
          <span style={{ color: "#e0b85e", fontSize: story ? 23 : 18, fontWeight: 800, letterSpacing: 3 }}>
            MIKE EATMON · WILSON, NORTH CAROLINA
          </span>
          <span
            style={{
              marginTop: 20,
              maxWidth: story ? 900 : 610,
              color: "#fff8e9",
              fontFamily: "Georgia, serif",
              fontSize: story ? 67 : 50,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -1.5,
            }}
          >
            {creative.creativeHeadline}
          </span>
          <span
            style={{
              marginTop: 23,
              maxWidth: story ? 850 : 610,
              color: "#e7dece",
              fontSize: story ? 30 : 23,
              lineHeight: 1.38,
            }}
          >
            {creative.creativeBody}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            right: story ? 62 : 58,
            ...(story ? { left: 62 } : {}),
            top: story ? 1240 : 860,
            width: story ? 956 : 300,
            display: "flex",
            alignItems: "center",
            justifyContent: story ? "flex-start" : "center",
            gap: story ? 34 : 0,
            flexDirection: story ? "row" : "column",
            border: "1px solid rgba(214,174,86,.72)",
            borderRadius: 28,
            padding: story ? "26px 34px" : "25px",
            background: "rgba(3,3,3,.88)",
          }}
        >
          <img
            src={qrDataUrl}
            alt={`QR code for ${creative.placementLabel}`}
            width={story ? 270 : 250}
            height={story ? 270 : 250}
            style={{ width: story ? 270 : 250, height: story ? 270 : 250, borderRadius: 12 }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: story ? "flex-start" : "center",
              textAlign: story ? "left" : "center",
            }}
          >
            <span style={{ marginTop: story ? 0 : 18, color: "#f3cf79", fontSize: story ? 31 : 20, fontWeight: 900, letterSpacing: 2 }}>
              SCAN TO START
            </span>
            <span style={{ marginTop: 8, color: "#f7edda", fontSize: story ? 21 : 14 }}>
              {shortUrl.replace("https://www.", "")}
            </span>
            {story ? (
              <span style={{ marginTop: 14, maxWidth: 500, color: "#a8dce2", fontSize: 18, lineHeight: 1.35 }}>
                Or use the approved link sticker with the exact tracked destination.
              </span>
            ) : null}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 62,
            right: 62,
            ...(story ? { top: 1130 } : { bottom: 42 }),
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#b9afa0",
            fontSize: story ? 17 : 13,
            lineHeight: 1.35,
            ...(story ? {
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 16,
              padding: "14px 18px",
              background: "rgba(0,0,0,.72)",
            } : {}),
          }}
        >
          <span style={{ maxWidth: story ? 760 : 730 }}>
            Broker-reviewed guidance. No automated appraisal, guaranteed value, guaranteed offer, financing, property availability, or appointment promise.
          </span>
          <span style={{ marginLeft: 20, color: "#e0b85e", fontWeight: 800, whiteSpace: "nowrap" }}>
            EQUAL HOUSING OPPORTUNITY
          </span>
        </div>
      </div>
    ),
    {
      width: spec.width,
      height: spec.height,
      headers: {
        ...PRIVATE_ASSET_HEADERS,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    },
  );
}
