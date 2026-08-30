import { describe, expect, it } from "vitest";
import { metadata } from "../../app/plan/page";

describe("review planner social identity", () => {
  it("uses the planner URL for canonical and Open Graph identity", () => {
    expect(metadata.alternates).toEqual({ canonical: "/plan" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      title: "Real Estate Review Planner | Ask Magic Mike",
      url: "/plan",
      siteName: "Ask Magic Mike",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Real Estate Review Planner | Ask Magic Mike",
      images: ["/brand/black-diamond/og-card-1200x630.jpg"],
    });
  });
});
