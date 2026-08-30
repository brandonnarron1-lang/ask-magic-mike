import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mikePlatformAssets } from "../../src/lib/mikePlatformAssets";

function jpegDimensions(buffer: Buffer) {
  expect(buffer[0]).toBe(0xff);
  expect(buffer[1]).toBe(0xd8);
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) break;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += length + 2;
  }
  throw new Error("JPEG dimensions were not found");
}

describe("wide social preview card", () => {
  it("keeps one canonical 1200x630 metadata asset", () => {
    expect(mikePlatformAssets.openGraphCard).toMatchObject({
      src: "/brand/black-diamond/og-card-1200x630.jpg",
      width: 1200,
      height: 630,
    });
  });

  it("ships the physical JPEG at the declared dimensions", () => {
    const image = readFileSync("public/brand/black-diamond/og-card-1200x630.jpg");
    expect(jpegDimensions(image)).toEqual({ width: 1200, height: 630 });
    expect(image.byteLength).toBeGreaterThan(100_000);
  });

  it("generates from approved sources without AI-generated identity", () => {
    const generator = readFileSync("scripts/amm/generate-social-og-card.mjs", "utf8");
    expect(generator).toContain("hero-home-desktop.jpg");
    expect(generator).toContain("our-town-logo.png");
    expect(generator).toContain("identityPreserved: true");
    expect(generator).toContain("aiGeneratedIdentityUsed: false");
    expect(generator).not.toMatch(/nellyselly/i);
  });

  it("renders the exact card on the existing non-indexed review surface", () => {
    const preview = readFileSync("app/social-preview/page.tsx", "utf8");
    expect(preview).toContain("mikePlatformAssets.openGraphCard");
    expect(preview).toContain("aspect-[1200/630]");
    expect(preview).toContain("Identity-preserving source crop");
  });
});
