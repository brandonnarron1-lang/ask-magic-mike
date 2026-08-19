import { describe, expect, it } from "vitest";
import { nonIndexablePageMetadata, publicPageMetadata } from "../../app/lib/publicMetadata";

describe("public search-authority metadata", () => {
  it("builds self-referential canonical, social, and index directives", () => {
    const metadata = publicPageMetadata({
      title: "Seller Options in Wilson, NC",
      description: "A visible seller-options description.",
      path: "/sell",
    });
    expect(metadata.alternates).toEqual({ canonical: "/sell" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      title: "Seller Options in Wilson, NC | Ask Magic Mike",
      description: "A visible seller-options description.",
      url: "/sell",
      siteName: "Ask Magic Mike",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Seller Options in Wilson, NC | Ask Magic Mike",
    });
  });

  it("lets a compatibility route identify its canonical source", () => {
    const metadata = publicPageMetadata({
      title: "Home Value Review in Wilson, NC",
      description: "A visible home-value description.",
      path: "/value",
      canonicalPath: "/home-value",
    });
    expect(metadata.alternates).toEqual({ canonical: "/home-value" });
    expect(metadata.openGraph).toMatchObject({ url: "/home-value" });
  });

  it("keeps operational and post-conversion routes out of search without using robots.txt canonicalization", () => {
    const metadata = nonIndexablePageMetadata("Request Received", "Confirmation route.");
    expect(metadata.robots).toEqual({ index: false, follow: false, nocache: true });
    expect(metadata.alternates).toBeNull();
    expect(metadata.openGraph).toBeNull();
    expect(metadata.twitter).toBeNull();
  });
});
