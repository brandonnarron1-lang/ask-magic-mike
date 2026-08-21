import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  buildOwnedDemandCommand,
  resolveOwnedDemandCreative,
} from "../../app/lib/growth/owned-demand";
import {
  buildOwnedDemandQrSvg,
  OWNED_DEMAND_IMAGE_SPECS,
  ownedDemandAssetHref,
  ownedDemandShortCode,
  ownedDemandShortUrl,
  resolveOwnedDemandAssetRequest,
  resolveOwnedDemandShortCode,
} from "../../app/lib/growth/owned-demand-assets";
import { renderOwnedDemandImage } from "../../app/lib/growth/owned-demand-image";
import type { GrowthSummary } from "../../app/lib/growth/intelligence";
import { GET as resolveOwnedDemandRedirect } from "../../app/go/[code]/route";

const root = process.cwd();

function emptySummary(): GrowthSummary {
  return {
    leads: 0,
    qualified: 0,
    appointments: 0,
    closes: 0,
    spendUsd: 0,
    attributedRevenueUsd: 0,
    blendedCostPerLead: null,
    blendedCostPerAppointment: null,
    blendedCostPerClose: null,
    returnOnAdSpend: null,
    attributedLeadRate: 0,
    paidLeadSpendCoverageRate: 0,
    staleNurtureCandidates: 0,
    speedToLeadRisks: 0,
    firstResponseSampleSize: 0,
    firstResponseCoverageRate: 0,
    firstResponseOwnerAttributionRate: 0,
    medianFirstResponseMinutes: null,
    p75FirstResponseMinutes: null,
    p90FirstResponseMinutes: null,
    runningExperiments: 0,
  };
}

function dataUrlFor(relativePublicPath: string) {
  const file = path.join(root, "public", relativePublicPath);
  const extension = path.extname(file).toLowerCase();
  const mime = extension === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

describe("owned-demand asset studio", () => {
  it("derives all 28 launch assets from the canonical Phase 9 placements", () => {
    const command = buildOwnedDemandCommand({ summary: emptySummary(), ownedDemandSignals: [] });
    expect(command.channels).toHaveLength(7);
    const shortCodes = new Set<string>();

    for (const channel of command.channels) {
      const placementKeys = ["general_question", ...channel.offers.map((offer) => offer.key)];
      expect(placementKeys).toHaveLength(4);
      for (const placementKey of placementKeys) {
        const creative = resolveOwnedDemandCreative(channel.key, placementKey);
        expect(creative).not.toBeNull();
        const url = new URL(creative!.trackedUrl);
        expect(url.origin).toBe("https://www.askmagicmike.com");
        expect(url.searchParams.get("utm_source")).toBe(channel.source);
        expect(url.searchParams.get("utm_medium")).toBe(channel.medium);
        expect(url.searchParams.get("utm_campaign")).toBe("amm_owned_demand_2026");
        expect(url.searchParams.get("utm_content")).toBe(creative!.content);
        expect(fs.existsSync(path.join(root, "public", creative!.creativePath))).toBe(true);
        expect(fs.existsSync(path.join(root, "public", creative!.creativeExportPath))).toBe(true);
        const shortCode = ownedDemandShortCode(channel.key, placementKey);
        expect(shortCode).toMatch(/^[a-z0-9-]{4,32}$/);
        expect(shortCodes.has(shortCode!)).toBe(false);
        shortCodes.add(shortCode!);
        expect(resolveOwnedDemandShortCode(shortCode!)?.trackedUrl).toBe(creative!.trackedUrl);
        expect(ownedDemandShortUrl(creative!)).toBe(`https://www.askmagicmike.com/go/${shortCode}`);

        for (const format of ["feed", "story", "qr_svg"] as const) {
          const request = resolveOwnedDemandAssetRequest(channel.key, placementKey, format);
          expect(request?.filename).toMatch(/^ask-magic-mike-[a-z0-9-]+\.(png|svg)$/);
          expect(ownedDemandAssetHref(channel.key, placementKey, format)).toContain(`format=${format}`);
        }
      }
    }
    expect(shortCodes.size).toBe(28);
  });

  it("fails closed for unknown channels, placements, and formats", () => {
    expect(resolveOwnedDemandAssetRequest("unknown", "seller_review", "feed")).toBeNull();
    expect(resolveOwnedDemandAssetRequest("facebook", "unknown", "feed")).toBeNull();
    expect(resolveOwnedDemandAssetRequest("facebook", "seller_review", "pdf")).toBeNull();
    expect(resolveOwnedDemandAssetRequest("../facebook", "seller_review", "feed")).toBeNull();
    expect(resolveOwnedDemandShortCode("facebook-seller")).toBeNull();
    expect(resolveOwnedDemandShortCode("fb-seller/../../ask")).toBeNull();
  });

  it("emits a high-error-correction, self-contained QR SVG without executable content", async () => {
    const creative = resolveOwnedDemandCreative("qr_print", "seller_review");
    expect(creative).not.toBeNull();
    const svg = await buildOwnedDemandQrSvg(ownedDemandShortUrl(creative!));
    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox=");
    expect(svg).not.toMatch(/<script|javascript:|onload=/i);
    expect(svg.length).toBeGreaterThan(2_000);
    const artifactDirectory = process.env.AMM_ASSET_ARTIFACT_DIR;
    if (artifactDirectory) {
      const asset = resolveOwnedDemandAssetRequest("qr_print", "seller_review", "qr_svg")!;
      fs.mkdirSync(artifactDirectory, { recursive: true });
      fs.writeFileSync(path.join(artifactDirectory, asset.filename), svg, "utf8");
    }
  });

  it("renders valid 4:5 and 9:16 PNGs for every offer type from approved retained imagery", async () => {
    const artifactDirectory = process.env.AMM_ASSET_ARTIFACT_DIR;

    for (const placementKey of ["general_question", "seller_review", "buyer_match", "renter_plan"]) {
      const creative = resolveOwnedDemandCreative("facebook", placementKey);
      expect(creative).not.toBeNull();
      const creativeUrl = dataUrlFor(creative!.creativeExportPath);

      for (const format of ["feed", "story"] as const) {
        const asset = resolveOwnedDemandAssetRequest("facebook", placementKey, format)!;
        const response = await renderOwnedDemandImage({
          creative: creative!,
          creativeUrl,
          filename: asset.filename,
          format,
        }).catch((error: unknown) => {
          throw new Error(`Failed to render ${placementKey}/${format}`, { cause: error });
        });
        const bytes = Buffer.from(await response.arrayBuffer().catch((error: unknown) => {
          throw new Error(`Failed to encode ${placementKey}/${format}`, { cause: error });
        }));
        expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        expect(bytes.length).toBeGreaterThan(50_000);
        expect(response.headers.get("cache-control")).toContain("no-store");
        expect(response.headers.get("content-disposition")).toContain(asset.filename);

        if (artifactDirectory && placementKey === "seller_review") {
          fs.mkdirSync(artifactDirectory, { recursive: true });
          fs.writeFileSync(path.join(artifactDirectory, asset.filename), bytes);
        }
      }
    }
  }, 60_000);

  it("keeps feed and story output aligned to current platform-safe dimensions", () => {
    expect(OWNED_DEMAND_IMAGE_SPECS.feed).toMatchObject({ width: 1080, height: 1350 });
    expect(OWNED_DEMAND_IMAGE_SPECS.story).toMatchObject({ width: 1080, height: 1920 });
  });
});

describe("owned-demand asset route boundary", () => {
  const route = fs.readFileSync(
    path.join(root, "app/api/admin/distribution/assets/[channelKey]/[placementKey]/route.ts"),
    "utf8",
  );
  const shortlinkRoute = fs.readFileSync(path.join(root, "app/go/[code]/route.ts"), "utf8");
  const page = fs.readFileSync(path.join(root, "app/admin/distribution/page.tsx"), "utf8");

  it("requires a Lead Center report session and never accepts an arbitrary destination", () => {
    expect(route).toContain('requireLeadCenterApiPermission(request, "report:view")');
    expect(route).toContain("resolveOwnedDemandAssetRequest(channelKey, placementKey, format)");
    expect(route).toContain("new URL(asset.creative.creativeExportPath, OWNED_DEMAND_SHORTLINK_ORIGIN)");
    expect(route).not.toMatch(/searchParams\.get\(["'](?:url|destination|image)/);
    expect(route).not.toMatch(/fetch\(|DATABASE_URL|INSERT|UPDATE|DELETE/i);
  });

  it("returns private no-store assets and exposes only local download controls", () => {
    expect(route).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(route).toContain("auth.response.headers.set(name, value)");
    expect(route).toContain('"X-Robots-Tag": "noindex, nofollow, noarchive"');
    expect(route).toContain('"Content-Security-Policy": "default-src \'none\'; sandbox"');
    expect(page).toContain("DemandAssetLinks");
    expect(page).toContain("Download 4:5 PNG");
    expect(page).toContain("Download 9:16 PNG");
    expect(page).toContain("Download QR SVG");
  });

  it("uses a public allowlisted 307 shortlink to preserve the full canonical UTM destination", () => {
    expect(shortlinkRoute).toContain("resolveOwnedDemandShortCode(code)");
    expect(shortlinkRoute).toContain("NextResponse.redirect(creative.trackedUrl, 307)");
    expect(shortlinkRoute).toContain('"Cache-Control": "no-store, max-age=0"');
    expect(shortlinkRoute).toContain('"X-Robots-Tag": "noindex, nofollow, noarchive"');
    expect(shortlinkRoute).not.toMatch(/searchParams|DATABASE_URL|INSERT|UPDATE|DELETE/i);
  });

  it("redirects every approved short code to its exact canonical placement and rejects unknown codes", async () => {
    const command = buildOwnedDemandCommand({ summary: emptySummary(), ownedDemandSignals: [] });
    let checked = 0;
    for (const channel of command.channels) {
      for (const placementKey of ["general_question", ...channel.offers.map((offer) => offer.key)]) {
        const creative = resolveOwnedDemandCreative(channel.key, placementKey)!;
        const code = ownedDemandShortCode(channel.key, placementKey)!;
        const response = await resolveOwnedDemandRedirect(
          new NextRequest(`https://www.askmagicmike.com/go/${code}`),
          { params: Promise.resolve({ code }) },
        );
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(creative.trackedUrl);
        expect(response.headers.get("cache-control")).toContain("no-store");
        expect(response.headers.get("x-robots-tag")).toContain("noindex");
        checked += 1;
      }
    }
    expect(checked).toBe(28);

    const missing = await resolveOwnedDemandRedirect(
      new NextRequest("https://www.askmagicmike.com/go/not-approved"),
      { params: Promise.resolve({ code: "not-approved" }) },
    );
    expect(missing.status).toBe(404);
  });
});
