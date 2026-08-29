import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  loadChangeSet: vi.fn(),
  loadSellerIntentDecision: vi.fn(),
}));

vi.mock("@/lib/admin/rbac-session", () => ({
  requireLeadCenterApiPermission: mocks.requirePermission,
}));

vi.mock("../../app/lib/growth/wordpress-activation-change-set", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../app/lib/growth/wordpress-activation-change-set")
  >();
  return {
    ...actual,
    loadWordPressActivationChangeSet: mocks.loadChangeSet,
  };
});

vi.mock("../../app/lib/growth/wordpress-seller-intent-decision", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../app/lib/growth/wordpress-seller-intent-decision")
  >();
  return {
    ...actual,
    loadWordPressSellerIntentDecisionManifest: mocks.loadSellerIntentDecision,
  };
});

import { GET } from "../../app/api/admin/distribution/wordpress-change-set/[placementKey]/route";

const REQUEST_URL =
  "https://www.askmagicmike.com/api/admin/distribution/wordpress-change-set/wordpress_homepage_ask_mike";

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

describe("GET WordPress activation change-set route", () => {
  it("returns a private attachment after report-view authorization", async () => {
    authorized();
    mocks.loadChangeSet.mockResolvedValue({
      schemaVersion: "amm.wordpress_activation_change_set.v2",
      placementKey: "wordpress_homepage_ask_mike",
      status: "legacy_match_ready",
      publicationAuthorized: false,
      mutationPerformed: false,
    });

    const response = await GET(new NextRequest(REQUEST_URL), {
      params: Promise.resolve({ placementKey: "wordpress_homepage_ask_mike" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("content-disposition")).toContain(
      "amm-wordpress_homepage_ask_mike-wordpress-change-set.json",
    );
    await expect(response.json()).resolves.toMatchObject({
      status: "legacy_match_ready",
      publicationAuthorized: false,
      mutationPerformed: false,
    });
    expect(mocks.loadChangeSet).toHaveBeenCalledOnce();
    expect(mocks.loadChangeSet).toHaveBeenCalledWith("wordpress_homepage_ask_mike");
  });

  it("copies the same privacy headers onto an authorization failure", async () => {
    mocks.requirePermission.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }),
    });

    const response = await GET(new NextRequest(REQUEST_URL), {
      params: Promise.resolve({ placementKey: "wordpress_homepage_ask_mike" }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(mocks.loadChangeSet).not.toHaveBeenCalled();
  });

  it("returns the seller-intent decision packet through the same read-only boundary", async () => {
    authorized();
    mocks.loadSellerIntentDecision.mockResolvedValue({
      schemaVersion: "amm.wordpress_seller_intent_decision.v1",
      manifestKey: "wordpress_seller_intent_decision",
      status: "decision_required",
      publicationBlocked: true,
      publicationAuthorized: false,
      mutationPerformed: false,
    });

    const response = await GET(new NextRequest(
      "https://www.askmagicmike.com/api/admin/distribution/wordpress-change-set/wordpress_seller_intent_decision",
    ), {
      params: Promise.resolve({ placementKey: "wordpress_seller_intent_decision" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "amm-wordpress_seller_intent_decision-wordpress-change-set.json",
    );
    await expect(response.json()).resolves.toMatchObject({
      status: "decision_required",
      publicationBlocked: true,
      publicationAuthorized: false,
      mutationPerformed: false,
    });
    expect(mocks.loadSellerIntentDecision).toHaveBeenCalledOnce();
    expect(mocks.loadChangeSet).not.toHaveBeenCalled();
  });

  it("rejects an unknown placement before any public WordPress fetch", async () => {
    authorized();
    const response = await GET(new NextRequest(REQUEST_URL), {
      params: Promise.resolve({ placementKey: "wordpress_unknown" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "wordpress_activation_placement_not_found",
    });
    expect(mocks.loadChangeSet).not.toHaveBeenCalled();
    expect(mocks.loadSellerIntentDecision).not.toHaveBeenCalled();
  });
});
