import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/admin/rbac-session", () => ({
  requireLeadCenterApiPermission: mocks.requirePermission,
}));

import {
  buildOpenHouseRegistrationPacket,
  isCanonicalOpenHouseRegistrationReference,
  normalizeOpenHouseRegistrationReference,
  openHouseRegistrationAssetHref,
} from "../../app/lib/growth/open-house-registration";
import { GET as resolveOpenHouseShortlink } from "../../app/go/open-house/[reference]/route";
import { GET as downloadOpenHouseAsset } from "../../app/api/admin/distribution/open-house/[reference]/route";

const root = process.cwd();
const REFERENCE = "quinn-drive-september-open-house";

function authorized() {
  mocks.requirePermission.mockResolvedValue({
    ok: true,
    principal: {
      userId: "operator-test",
      role: "read_only_analyst",
      agentId: null,
      email: "operator@example.test",
      name: "Synthetic Operator",
    },
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("open-house QR registration packet", () => {
  it("normalizes only bounded public-safe operator references", () => {
    expect(normalizeOpenHouseRegistrationReference(" Quinn Drive September Open House ")).toBe(REFERENCE);
    expect(normalizeOpenHouseRegistrationReference("MLS 1234567")).toBe("mls-1234567");
    expect(normalizeOpenHouseRegistrationReference("QUINN_DRIVE_EVENT")).toBe("quinn-drive-event");
    expect(normalizeOpenHouseRegistrationReference("person@example.com")).toBeNull();
    expect(normalizeOpenHouseRegistrationReference("https://example.com/event")).toBeNull();
    expect(normalizeOpenHouseRegistrationReference("../admin?token=value")).toBeNull();
    expect(normalizeOpenHouseRegistrationReference("x".repeat(97))).toBeNull();
    expect(isCanonicalOpenHouseRegistrationReference(REFERENCE)).toBe(true);
    expect(isCanonicalOpenHouseRegistrationReference("Quinn Drive")).toBe(false);
    expect(isCanonicalOpenHouseRegistrationReference("unknown")).toBe(false);
  });

  it("builds one deterministic canonical capture packet with no execution authority", () => {
    const packet = buildOpenHouseRegistrationPacket(REFERENCE);
    expect(packet).toMatchObject({
      schemaVersion: "amm.open_house_registration_packet.v1",
      status: "operator_review_required",
      reference: REFERENCE,
      displayLabel: "Quinn Drive September Open House",
      destinationUrl: `https://www.askmagicmike.com/open-house/${REFERENCE}`,
      shortUrl: `https://www.askmagicmike.com/go/open-house/${REFERENCE}`,
      placementId: `open-house:${REFERENCE}`,
      propertyId: REFERENCE,
      attribution: {
        source: "qr",
        medium: "owned_media",
        campaign: "amm_owned_demand_2026",
        content: "open_house_registration",
      },
      requiresPropertyFactReview: true,
      requiresTwoDeviceScan: true,
      publicationAuthorized: false,
      mutationPerformed: false,
      leadSubmitted: false,
      notificationSent: false,
    });
    const tracked = new URL(packet!.trackedUrl);
    expect(tracked.origin).toBe("https://www.askmagicmike.com");
    expect(tracked.pathname).toBe(`/open-house/${REFERENCE}`);
    expect(Object.fromEntries(tracked.searchParams)).toEqual({
      utm_source: "qr",
      utm_medium: "owned_media",
      utm_campaign: "amm_owned_demand_2026",
      utm_content: "open_house_registration",
      placement_id: `open-house:${REFERENCE}`,
      property_id: REFERENCE,
    });
    expect(packet!.reviewChecklist).toHaveLength(4);
    expect(JSON.stringify(packet)).not.toMatch(/password|api[_ -]?key|secret|token/i);
  });

  it("uses a bounded public shortlink and rejects unknown references", async () => {
    const response = await resolveOpenHouseShortlink(
      new NextRequest(`https://www.askmagicmike.com/go/open-house/${REFERENCE}`),
      { params: Promise.resolve({ reference: REFERENCE }) },
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      buildOpenHouseRegistrationPacket(REFERENCE)!.trackedUrl,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");

    const missing = await resolveOpenHouseShortlink(
      new NextRequest("https://www.askmagicmike.com/go/open-house/unknown"),
      { params: Promise.resolve({ reference: "unknown" }) },
    );
    expect(missing.status).toBe(404);
  });

  it("returns protected no-store JSON and QR assets without accepting a destination", async () => {
    authorized();
    const packetResponse = await downloadOpenHouseAsset(
      new NextRequest(
        `https://www.askmagicmike.com/api/admin/distribution/open-house/${REFERENCE}?format=packet_json&destination=https://evil.example`,
      ),
      { params: Promise.resolve({ reference: REFERENCE }) },
    );
    expect(packetResponse.status).toBe(200);
    expect(packetResponse.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(packetResponse.headers.get("content-disposition")).toContain(`${REFERENCE}-review.json`);
    await expect(packetResponse.json()).resolves.toMatchObject({
      ok: true,
      reference: REFERENCE,
      destinationUrl: `https://www.askmagicmike.com/open-house/${REFERENCE}`,
      publicationAuthorized: false,
      mutationPerformed: false,
    });

    const qrResponse = await downloadOpenHouseAsset(
      new NextRequest(
        `https://www.askmagicmike.com/api/admin/distribution/open-house/${REFERENCE}?format=qr_svg`,
      ),
      { params: Promise.resolve({ reference: REFERENCE }) },
    );
    expect(qrResponse.status).toBe(200);
    expect(qrResponse.headers.get("content-type")).toContain("image/svg+xml");
    expect(qrResponse.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(await qrResponse.text()).toMatch(/^<svg[^>]*>/);
    expect(mocks.requirePermission).toHaveBeenCalledWith(expect.any(NextRequest), "report:view");
  });

  it("copies privacy headers onto authorization failure and fails closed by format", async () => {
    mocks.requirePermission.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }),
    });
    const denied = await downloadOpenHouseAsset(
      new NextRequest(
        `https://www.askmagicmike.com/api/admin/distribution/open-house/${REFERENCE}?format=qr_svg`,
      ),
      { params: Promise.resolve({ reference: REFERENCE }) },
    );
    expect(denied.status).toBe(401);
    expect(denied.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(denied.headers.get("x-robots-tag")).toContain("noindex");

    authorized();
    const invalidFormat = await downloadOpenHouseAsset(
      new NextRequest(
        `https://www.askmagicmike.com/api/admin/distribution/open-house/${REFERENCE}?format=png`,
      ),
      { params: Promise.resolve({ reference: REFERENCE }) },
    );
    expect(invalidFormat.status).toBe(404);
  });

  it("exposes the builder in the existing command and validates the public route", () => {
    const page = fs.readFileSync(path.join(root, "app/admin/distribution/page.tsx"), "utf8");
    const builder = fs.readFileSync(
      path.join(root, "app/admin/distribution/OpenHouseQrPacketBuilder.tsx"),
      "utf8",
    );
    const publicRoute = fs.readFileSync(
      path.join(root, "app/open-house/[propertyOrId]/page.tsx"),
      "utf8",
    );
    const protectedRoute = fs.readFileSync(
      path.join(root, "app/api/admin/distribution/open-house/[reference]/route.ts"),
      "utf8",
    );
    expect(page).toContain("OpenHouseQrPacketBuilder");
    expect(page).toContain("Open-house QR registration");
    expect(builder).toContain('data-open-house-qr-packet="true"');
    expect(builder).toContain('id="open-house-qr-builder"');
    expect(builder).toContain("Download QR SVG");
    expect(page).toContain("channel.instancePlacements");
    expect(page).toContain("Instance-specific capture");
    expect(publicRoute).toContain("normalizeOpenHouseRegistrationReference(propertyOrId)");
    expect(publicRoute).toContain("buildOpenHouseRegistrationPacket(normalizedReference)");
    expect(publicRoute).toContain("notFound()");
    expect(protectedRoute).not.toMatch(/searchParams\.get\(["'](?:url|destination|image)/);
    expect(protectedRoute).not.toMatch(/DATABASE_URL|INSERT|UPDATE|DELETE|fetch\(/i);
    expect(openHouseRegistrationAssetHref(REFERENCE, "qr_svg")).toContain(
      `/${REFERENCE}?format=qr_svg`,
    );
  });
});
