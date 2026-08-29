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
  "Cross-Origin-Resource-Policy": "same-origin",
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
  const square = format === "square";
  const squareRenter = square && creative.placementKey === "renter_plan";
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
            objectFit: squareRenter ? "contain" : "cover",
            objectPosition: squareRenter ? "right bottom" : backgroundPosition(creative),
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: square
              ? "linear-gradient(90deg,rgba(0,0,0,.96) 0%,rgba(0,0,0,.84) 45%,rgba(0,0,0,.42) 70%,rgba(0,0,0,.10) 100%)"
              : story
                ? "linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,.18) 30%,rgba(0,0,0,.86) 62%,#050505 100%)"
                : "linear-gradient(180deg,rgba(0,0,0,.24) 0%,rgba(0,0,0,.08) 34%,rgba(0,0,0,.91) 72%,#050505 100%)",
          }}
        />
        {square ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "linear-gradient(180deg,rgba(0,0,0,.28) 0%,rgba(0,0,0,.02) 42%,rgba(0,0,0,.82) 100%)",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            top: square ? 28 : story ? 285 : 62,
            left: square ? 34 : 62,
            right: square ? 34 : 62,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: square ? "1px solid rgba(214,174,86,.72)" : "2px solid rgba(214,174,86,.72)",
            paddingBottom: square ? 13 : 22,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#e0b85e", fontSize: square ? 21 : story ? 34 : 27, fontWeight: 800, letterSpacing: square ? 3 : 4 }}>
              ASK MAGIC MIKE
            </span>
            <span style={{ marginTop: square ? 4 : 7, color: "#f7edda", fontSize: square ? 11 : story ? 20 : 17, letterSpacing: square ? 1.5 : 2 }}>
              OUR TOWN PROPERTIES, INC.
            </span>
          </div>
          <span
            style={{
              display: "flex",
              border: "1px solid rgba(214,174,86,.78)",
              borderRadius: 999,
              padding: square ? "8px 12px" : story ? "13px 21px" : "10px 17px",
              background: "rgba(0,0,0,.66)",
              color: "#f3cf79",
              fontSize: square ? 9 : story ? 20 : 16,
              fontWeight: 800,
              letterSpacing: square ? 1.3 : 2,
            }}
          >
            {placementEyebrow(creative)}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: square ? 34 : 62,
            right: square ? 238 : story ? 92 : 390,
            top: square ? 245 : story ? 690 : 690,
            display: "flex",
            flexDirection: "column",
            ...(square
              ? {
                  borderLeft: "3px solid rgba(224,184,94,.92)",
                  borderRadius: 16,
                  padding: "16px 18px 17px",
                  background: "rgba(0,0,0,.62)",
                }
              : story
                ? {
                    borderLeft: "5px solid rgba(224,184,94,.92)",
                    borderRadius: 24,
                    padding: "28px 32px",
                    background: "rgba(0,0,0,.58)",
                  }
                : {}),
          }}
        >
          <span style={{ color: "#e0b85e", fontSize: square ? 11 : story ? 23 : 18, fontWeight: 800, letterSpacing: square ? 1.8 : 3 }}>
            MIKE EATMON · WILSON, NORTH CAROLINA
          </span>
          <span
            style={{
              marginTop: square ? 12 : 20,
              maxWidth: square ? 430 : story ? 900 : 610,
              color: "#fff8e9",
              fontFamily: "Georgia, serif",
              fontSize: square ? 38 : story ? 67 : 50,
              fontWeight: 700,
              lineHeight: square ? 1.02 : 1.04,
              letterSpacing: square ? -1 : -1.5,
            }}
          >
            {creative.creativeHeadline}
          </span>
          <span
            style={{
              marginTop: square ? 15 : 23,
              maxWidth: square ? 420 : story ? 850 : 610,
              color: "#e7dece",
              fontSize: square ? 16 : story ? 30 : 23,
              lineHeight: square ? 1.32 : 1.38,
            }}
          >
            {creative.creativeBody}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            right: square ? 30 : story ? 62 : 58,
            ...(story ? { left: 62 } : {}),
            top: square ? 410 : story ? 1240 : 860,
            width: square ? 174 : story ? 956 : 300,
            display: "flex",
            alignItems: "center",
            justifyContent: story ? "flex-start" : "center",
            gap: story ? 34 : 0,
            flexDirection: story ? "row" : "column",
            border: "1px solid rgba(214,174,86,.72)",
            borderRadius: square ? 18 : 28,
            padding: square ? "14px" : story ? "26px 34px" : "25px",
            background: "rgba(3,3,3,.88)",
          }}
        >
          <img
            src={qrDataUrl}
            alt={`QR code for ${creative.placementLabel}`}
            width={square ? 126 : story ? 270 : 250}
            height={square ? 126 : story ? 270 : 250}
            style={{ width: square ? 126 : story ? 270 : 250, height: square ? 126 : story ? 270 : 250, borderRadius: square ? 7 : 12 }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: story ? "flex-start" : "center",
              textAlign: story ? "left" : "center",
            }}
          >
            <span style={{ marginTop: story ? 0 : square ? 10 : 18, color: "#f3cf79", fontSize: square ? 11 : story ? 31 : 20, fontWeight: 900, letterSpacing: square ? 1.2 : 2 }}>
              SCAN TO START
            </span>
            <span style={{ marginTop: square ? 4 : 8, color: "#f7edda", fontSize: square ? 8 : story ? 21 : 14 }}>
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
            left: square ? 34 : 62,
            right: square ? 34 : 62,
            ...(story ? { top: 1130 } : { bottom: square ? 16 : 42 }),
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#b9afa0",
            fontSize: square ? 9 : story ? 17 : 13,
            lineHeight: square ? 1.28 : 1.35,
            ...(story ? {
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 16,
              padding: "14px 18px",
              background: "rgba(0,0,0,.72)",
            } : {}),
          }}
        >
          <span style={{ maxWidth: square ? 430 : story ? 760 : 730 }}>
            Broker-reviewed guidance. No automated appraisal, guaranteed value, guaranteed offer, financing, property availability, or appointment promise.
          </span>
          <span style={{ marginLeft: square ? 14 : 20, color: "#e0b85e", fontWeight: 800, whiteSpace: "nowrap" }}>
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
