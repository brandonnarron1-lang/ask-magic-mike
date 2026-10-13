import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { metadata as buyer } from "../../app/buy/page";
import { metadata as seller } from "../../app/home-value/page";

describe("source-bound seller/buyer sharing assets", () => {
  for (const [key, route, metadata] of [["buyer", "/buy", buyer], ["seller", "/home-value", seller]] as const) {
    it(`${key}: stable canonical and absolute owned public social image`, () => {
      expect(metadata.alternates).toEqual({ canonical: route });
      expect(metadata.openGraph).toMatchObject({ url: route, images: [{ url: `https://www.askmagicmike.com/launch-20261013/${key}-og.jpg`, width: 1200, height: 630 }] });
      expect(metadata.twitter).toMatchObject({ card: "summary_large_image", images: [`https://www.askmagicmike.com/launch-20261013/${key}-og.jpg`] });
    });
  }
  it("records approved identity-preserving deterministic composition and sizes", () => {
    const manifest = JSON.parse(readFileSync("public/launch-20261013/asset-manifest.json", "utf8"));
    expect(manifest).toMatchObject({ identityPreserved: true, aiGeneratedIdentityUsed: false, networkUsed: false });
    expect(manifest.files.map((f: { dimensions: string }) => f.dimensions)).toEqual(["1080x1350", "1080x1920", "1200x630", "1080x1350", "1080x1920", "1200x630"]);
    expect(manifest.qr).toHaveLength(2);
    for (const proof of manifest.qr) {
      expect(proof.result).toBe("PASS");
      expect(new URL(proof.decoded).origin).toBe("https://www.askmagicmike.com");
      expect(new URL(proof.decoded).pathname).toBe(proof.file.startsWith("seller") ? "/home-value" : "/buy");
    }
  });
});
