import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as getListing } from "../../app/api/listings/[id]/route";
import { GET as searchListings } from "../../app/api/listings/search/route";

describe("canonical public listing compatibility routes", () => {
  it("returns a bounded, public-safe degraded search response", async () => {
    const response = await searchListings(
      new NextRequest("https://www.askmagicmike.com/api/listings/search?limit=999")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      items: [],
      limit: 50,
      degraded: true,
      source: "fallback_empty",
      reason: "listing_data_unavailable",
    });
  });

  it("rejects malformed listing IDs without provider access", async () => {
    const response = await getListing(
      new NextRequest("https://www.askmagicmike.com/api/listings/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "bad_id" });
  });

  it("returns a public-safe degraded detail response for a valid ID", async () => {
    const response = await getListing(
      new NextRequest("https://www.askmagicmike.com/api/listings/11111111-1111-4111-8111-111111111111"),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      listing: null,
      degraded: true,
      source: "fallback_empty",
      reason: "listing_data_unavailable",
    });
  });
});
